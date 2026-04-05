import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { sendAgencyRejectionEmail } from '@/lib/email';
import { ApprovalStatus } from '@prisma/client';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/agencies/[id]/reject
 *
 * Reject an agency application
 * Body: { reason: string, notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require platform admin authentication
    const admin = await requireSuperadmin();

    const body = await request.json();
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { reason, notes } = validation.data;

    // Get the agency with primary contact
    const agency = await prisma.agency.findUnique({
      where: { id: params.id },
      include: {
        users: {
          where: { isPrimaryContact: true },
        },
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    if (agency.approvalStatus === ApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Cannot reject an approved agency. Use suspend instead.' },
        { status: 400 }
      );
    }

    const primaryContact = agency.users[0];
    if (!primaryContact) {
      return NextResponse.json(
        { error: 'No primary contact found for agency' },
        { status: 400 }
      );
    }

    // Update agency and log action in transaction
    await prisma.$transaction(async (tx) => {
      // Update agency approval status
      await tx.agency.update({
        where: { id: params.id },
        data: {
          approvalStatus: ApprovalStatus.REJECTED,
          rejectionReason: reason,
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: admin.id,
          actionType: 'REJECT_AGENCY',
          targetAgencyId: params.id,
          notes: notes || reason,
        },
      });
    });

    // Send rejection email
    const emailSent = await sendAgencyRejectionEmail(
      {
        email: primaryContact.email,
        name: primaryContact.name || 'User',
      },
      agency.agencyName,
      reason
    );

    if (!emailSent) {
      console.error('Failed to send rejection email to:', primaryContact.email);
      // Don't fail the request - rejection is already saved
    }

    return NextResponse.json({
      success: true,
      message: 'Agency rejected successfully',
      emailSent,
    });

  } catch (error) {
    console.error('Error rejecting agency:', error);

    if (error instanceof Error && error.message.includes('Platform admin')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reject agency' },
      { status: 500 }
    );
  }
}
