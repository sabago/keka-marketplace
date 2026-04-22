/**
 * Admin Credential Review API
 *
 * GET /api/admin/credentials/[id]/review - Get credential with full details
 * POST /api/admin/credentials/[id]/review - Approve/reject/edit credential
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { getSignedDownloadUrl } from '@/lib/s3';
import { calculateCredentialStatus, updateCredentialCompliance } from '@/lib/credentialHelpers';
import {
  sendCredentialApprovedNotification,
  sendCredentialRejectedNotification,
} from '@/lib/credentialEmails';
import { z } from 'zod';

/**
 * GET - Get full credential details for review
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const { id: credentialId } = await params;

    // Get credential with all related data
    const credential = await prisma.staffCredential.findUnique({
      where: { id: credentialId },
      include: {
        staffMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            agencyId: true,
            agency: {
              select: {
                id: true,
                agencyName: true,
                credentialWarningDays: true,
              },
            },
          },
        },
        documentType: true,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Verify admin has access to this credential (platform/super admins have full access)
    const isAgencyScopedAdmin = user.role === 'AGENCY_ADMIN' || user.role === 'SUPERADMIN';
    if (isAgencyScopedAdmin && credential.staffMember.agencyId !== agency.id) {
      return NextResponse.json(
        { error: 'You do not have permission to review this credential' },
        { status: 403 }
      );
    }

    // Generate presigned download URL (5 minutes)
    const downloadUrl = await getSignedDownloadUrl(
      credential.s3Key,
      300,
      credential.fileName
    );

    // Get parsing job info if exists
    const parsingJob = await prisma.credentialParsingJob.findFirst({
      where: { documentId: credentialId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      credential: {
        ...credential,
        downloadUrl,
      },
      parsingJob,
    });
  } catch (error) {
    console.error('Error fetching credential for review:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch credential' },
      { status: 500 }
    );
  }
}

/**
 * POST - Review credential (approve, reject, or edit)
 *
 * Body:
 * {
 *   action: "approve" | "reject" | "edit",
 *   notes?: string,
 *   corrections?: {
 *     issuer?: string,
 *     licenseNumber?: string,
 *     issueDate?: string,
 *     expirationDate?: string,
 *     verificationUrl?: string
 *   }
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const { id: credentialId } = await params;

    // Parse and validate request body
    const ReviewSchema = z.object({
      action: z.enum(['approve', 'reject', 'edit', 'needs_correction']),
      notes: z.string().max(5000).optional(),
      corrections: z.object({
        issuer: z.string().max(200).optional(),
        licenseNumber: z.string().max(100).optional(),
        issueDate: z.coerce.date().optional(),
        expirationDate: z.coerce.date().optional(),
        verificationUrl: z.string().url().optional(),
      }).optional(),
    });

    const body = await req.json();
    const validation = ReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { action, notes, corrections } = validation.data;

    // Get credential and verify access
    const credential = await prisma.staffCredential.findUnique({
      where: { id: credentialId },
      include: {
        staffMember: {
          select: {
            agencyId: true,
            agency: {
              select: {
                credentialWarningDays: true,
              },
            },
          },
        },
        documentType: true,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Verify admin has access (platform/super admins have full access)
    const isAgencyScopedAdmin = user.role === 'AGENCY_ADMIN' || user.role === 'SUPERADMIN';
    if (isAgencyScopedAdmin && credential.staffMember.agencyId !== agency.id) {
      return NextResponse.json(
        { error: 'You do not have permission to review this credential' },
        { status: 403 }
      );
    }

    // Perform action based on type
    let updatedCredential;

    if (action === 'approve') {
      // Approve credential
      await prisma.$transaction(async (tx) => {
        updatedCredential = await tx.staffCredential.update({
          where: { id: credentialId },
          data: {
            reviewStatus: 'APPROVED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
            reviewNotes: notes || null,
          },
        });

        // Update compliance
        await updateCredentialCompliance(credentialId);

        // Log admin action
        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'APPROVE_CREDENTIAL',
            targetAgencyId: credential.staffMember.agencyId,
            notes: `Approved credential: ${credential.fileName}${notes ? ` - ${notes}` : ''}`,
          },
        });
      });

      // Send approval notification email (async, don't block response)
      const employeeWithDetails = await prisma.staffMember.findUnique({
        where: { id: credential.staffMemberId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (employeeWithDetails?.email) {
        sendCredentialApprovedNotification(
          { ...employeeWithDetails, email: employeeWithDetails.email },
          {
            id: credentialId,
            documentTypeName: credential.documentType?.name || 'Credential',
            expirationDate: updatedCredential!.expirationDate,
            reviewNotes: notes || null,
          }
        ).catch((error) => {
          console.error('Failed to send approval notification email:', error);
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Credential approved',
        credential: updatedCredential,
      });
    } else if (action === 'reject') {
      // Reject credential
      await prisma.$transaction(async (tx) => {
        updatedCredential = await tx.staffCredential.update({
          where: { id: credentialId },
          data: {
            reviewStatus: 'REJECTED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
            reviewNotes: notes || 'Credential rejected by administrator',
            isCompliant: false,
          },
        });

        // Log admin action
        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'REJECT_CREDENTIAL',
            targetAgencyId: credential.staffMember.agencyId,
            notes: `Rejected credential: ${credential.fileName}${notes ? ` - ${notes}` : ''}`,
          },
        });
      });

      // Send rejection notification email (async, don't block response)
      const employeeWithDetails = await prisma.staffMember.findUnique({
        where: { id: credential.staffMemberId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (employeeWithDetails?.email) {
        sendCredentialRejectedNotification(
          { ...employeeWithDetails, email: employeeWithDetails.email },
          {
            id: credentialId,
            documentTypeName: credential.documentType?.name || 'Credential',
            reviewNotes: notes || null,
          }
        ).catch((error) => {
          console.error('Failed to send rejection notification email:', error);
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Credential rejected',
        credential: updatedCredential,
      });
    } else if (action === 'edit') {
      // Edit and approve credential with corrections
      if (!corrections || Object.keys(corrections).length === 0) {
        return NextResponse.json(
          { error: 'Corrections are required when action is "edit"' },
          { status: 400 }
        );
      }

      // Calculate new status if expiration date changed
      const newExpirationDate = corrections.expirationDate || credential.expirationDate;
      const newStatus = calculateCredentialStatus(
        newExpirationDate,
        credential.staffMember.agency.credentialWarningDays
      );

      await prisma.$transaction(async (tx) => {
        updatedCredential = await tx.staffCredential.update({
          where: { id: credentialId },
          data: {
            // Apply corrections
            issuer: corrections.issuer ?? credential.issuer,
            licenseNumber: corrections.licenseNumber ?? credential.licenseNumber,
            issueDate: corrections.issueDate ?? credential.issueDate,
            expirationDate: corrections.expirationDate ?? credential.expirationDate,
            verificationUrl: corrections.verificationUrl ?? credential.verificationUrl,

            // Update status
            status: newStatus,

            // Mark as reviewed and approved
            reviewStatus: 'APPROVED',
            reviewedBy: user.id,
            reviewedAt: new Date(),
            reviewNotes: `Corrected by admin${notes ? `: ${notes}` : ''}`,
          },
        });

        // Update compliance
        await updateCredentialCompliance(credentialId);

        // Log admin action with details
        const correctionsList = Object.entries(corrections)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');

        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'EDIT_CREDENTIAL',
            targetAgencyId: credential.staffMember.agencyId,
            notes: `Edited and approved credential: ${credential.fileName}. Corrections: ${correctionsList}${notes ? `. Notes: ${notes}` : ''}`,
          },
        });
      });

      // Send approval notification email (async, don't block response)
      const employeeWithDetails = await prisma.staffMember.findUnique({
        where: { id: credential.staffMemberId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (employeeWithDetails?.email) {
        sendCredentialApprovedNotification(
          { ...employeeWithDetails, email: employeeWithDetails.email },
          {
            id: credentialId,
            documentTypeName: credential.documentType?.name || 'Credential',
            expirationDate: updatedCredential!.expirationDate,
            reviewNotes: `Corrected by admin${notes ? `: ${notes}` : ''}`,
          }
        ).catch((error) => {
          console.error('Failed to send approval notification email:', error);
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Credential corrected and approved',
        credential: updatedCredential,
      });
    } else if (action === 'needs_correction') {
      // Request correction — not yet failed, just needs re-upload/fix
      if (!notes?.trim()) {
        return NextResponse.json(
          { error: 'A correction note is required when requesting correction' },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        updatedCredential = await tx.staffCredential.update({
          where: { id: credentialId },
          data: {
            reviewStatus: 'NEEDS_CORRECTION',
            reviewedBy: user.id,
            reviewedAt: new Date(),
            reviewNotes: notes,
            // Do NOT set isCompliant: false — credential is not failed, just needs correction
          },
        });

        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'REQUEST_CORRECTION',
            targetAgencyId: credential.staffMember.agencyId,
            notes: `Requested correction for credential: ${credential.fileName}. Reason: ${notes}`,
          },
        });
      });

      // Send correction email to employee (async, don't block response)
      const employeeWithDetails = await prisma.staffMember.findUnique({
        where: { id: credential.staffMemberId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (employeeWithDetails?.email) {
        sendCredentialRejectedNotification(
          { ...employeeWithDetails, email: employeeWithDetails.email },
          {
            id: credentialId,
            documentTypeName: credential.documentType?.name || 'Credential',
            reviewNotes: notes,
          }
        ).catch((error) => {
          console.error('Failed to send correction notification email:', error);
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Correction requested',
        credential: updatedCredential,
      });
    }

    // Should never reach here
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error reviewing credential:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to review credential' },
      { status: 500 }
    );
  }
}
