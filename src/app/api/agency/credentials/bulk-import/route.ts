/**
 * POST /api/agency/credentials/bulk-import
 *
 * Bulk-import credentials from a JSON payload matching BulkImportCredentialsSchema.
 * Resolves employees by email or employeeNumber, credential types by name.
 * Supports dryRun (preview without writes), overwriteExisting, and autoApprove.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';
import { BulkImportCredentialsSchema } from '@/lib/credentialValidation';
import { calculateCredentialStatus, isCredentialCompliant } from '@/lib/credentialHelpers';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await checkRateLimit(agencyRateLimit, getIP(request));
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.reset, rateLimitResult.limit, rateLimitResult.remaining);
  }

  try {
    const { user, agency } = await requireAgencyAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = BulkImportCredentialsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dryRun, overwriteExisting, autoApprove, credentials } = parsed.data;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { row: number; employeeRef: string; reason: string }[] = [];

    // Fetch agency warning days once
    const warningDays = agency.credentialWarningDays ?? 30;

    for (let i = 0; i < credentials.length; i++) {
      const row = credentials[i];
      const employeeRef = row.employeeEmail ?? row.employeeNumber ?? `row ${i + 1}`;

      // Resolve employee
      let employee: { id: string } | null = null;
      if (row.employeeEmail) {
        employee = await prisma.staffMember.findFirst({
          where: { agencyId: agency.id, email: row.employeeEmail },
          select: { id: true },
        });
      } else if (row.employeeNumber) {
        employee = await prisma.staffMember.findFirst({
          where: { agencyId: agency.id, staffNumber: row.employeeNumber },
          select: { id: true },
        });
      }

      if (!employee) {
        errors.push({ row: i + 1, employeeRef, reason: 'Employee not found' });
        failed++;
        continue;
      }

      // Resolve document type (agency-specific or global)
      const documentType = await prisma.documentType.findFirst({
        where: {
          name: { equals: row.credentialTypeName, mode: 'insensitive' },
          isActive: true,
          OR: [{ agencyId: agency.id }, { isGlobal: true }],
        },
        select: { id: true },
      });

      if (!documentType) {
        errors.push({ row: i + 1, employeeRef, reason: `Credential type not found: "${row.credentialTypeName}"` });
        failed++;
        continue;
      }

      // Check for existing credential
      const existing = await prisma.staffCredential.findFirst({
        where: { staffMemberId: employee.id, documentTypeId: documentType.id },
        select: { id: true },
      });

      if (existing && !overwriteExisting) {
        skipped++;
        continue;
      }

      if (dryRun) {
        // In dry-run mode just count what would happen
        if (existing) {
          updated++;
        } else {
          created++;
        }
        continue;
      }

      // Calculate status
      const status = calculateCredentialStatus(row.expirationDate ?? null, warningDays);
      const reviewStatus = autoApprove ? 'APPROVED' : 'PENDING_REVIEW';
      const compliant = isCredentialCompliant(
        status,
        reviewStatus as 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'PENDING_UPLOAD',
        row.expirationDate ?? null
      );

      try {
        if (existing) {
          await prisma.staffCredential.update({
            where: { id: existing.id },
            data: {
              issueDate: row.issueDate ?? null,
              expirationDate: row.expirationDate ?? null,
              issuer: row.issuer ?? null,
              licenseNumber: row.licenseNumber ?? null,
              status,
              reviewStatus,
              isCompliant: compliant,
              complianceCheckedAt: new Date(),
            },
          });
          updated++;
        } else {
          await prisma.staffCredential.create({
            data: {
              staffMemberId: employee.id,
              documentTypeId: documentType.id,
              issueDate: row.issueDate ?? null,
              expirationDate: row.expirationDate ?? null,
              issuer: row.issuer ?? null,
              licenseNumber: row.licenseNumber ?? null,
              status,
              reviewStatus,
              isCompliant: compliant,
              complianceCheckedAt: new Date(),
              // Required fields with defaults for bulk import (no file upload)
              fileName: 'bulk-import',
              fileSize: 0,
              mimeType: 'application/octet-stream',
              s3Key: '',
              uploadedBy: user.id,
            },
          });
          created++;
        }
      } catch (err: any) {
        errors.push({ row: i + 1, employeeRef, reason: err.message ?? 'Database error' });
        failed++;
      }
    }

    // Log AdminAction (skip on dry run)
    if (!dryRun) {
      await prisma.adminAction.create({
        data: {
          adminId: user.id,
          actionType: 'BULK_CREDENTIAL_IMPORT',
          targetAgencyId: agency.id,
          details: {
            total: credentials.length,
            created,
            updated,
            skipped,
            failed,
            autoApprove,
            overwriteExisting,
          },
        },
      });
    }

    return NextResponse.json({
      dryRun,
      created,
      updated,
      skipped,
      failed,
      total: credentials.length,
      errors,
    });
  } catch (error: any) {
    console.error('[bulk-import] Error:', error);
    if (error.message?.includes('required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
