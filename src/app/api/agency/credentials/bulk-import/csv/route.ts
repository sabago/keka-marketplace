/**
 * POST /api/agency/credentials/bulk-import/csv
 *
 * Accept a multipart/form-data CSV file upload, parse it with papaparse,
 * map columns to BulkImportCredentialsSchema, and delegate to bulk-import logic.
 */

import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';
import { BulkImportCredentialsSchema } from '@/lib/credentialValidation';
import { prisma } from '@/lib/db';
import { calculateCredentialStatus, isCredentialCompliant } from '@/lib/credentialHelpers';

// Normalize column header to known field names
function normalizeHeader(header: string): string {
  const clean = header.trim().toLowerCase().replace(/[\s_-]+/g, '');
  const map: Record<string, string> = {
    employeeemail: 'employeeEmail',
    email: 'employeeEmail',
    employeenumber: 'employeeNumber',
    staffnumber: 'employeeNumber',
    credentialtypename: 'credentialTypeName',
    credentialtype: 'credentialTypeName',
    documenttype: 'credentialTypeName',
    issuedate: 'issueDate',
    issueddate: 'issueDate',
    expirationdate: 'expirationDate',
    expirydate: 'expirationDate',
    expiry: 'expirationDate',
    expires: 'expirationDate',
    issuer: 'issuer',
    licensenumber: 'licenseNumber',
    license: 'licenseNumber',
    certificatenumber: 'licenseNumber',
  };
  return map[clean] ?? header.trim();
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkRateLimit(agencyRateLimit, getIP(request));
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.reset, rateLimitResult.limit, rateLimitResult.remaining);
  }

  try {
    const { user, agency } = await requireAgencyAdmin();

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing "file" field in form data' }, { status: 400 });
    }

    const csvText = await (file as File).text();

    // Parse CSV
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parse error', details: parsed.errors.slice(0, 10) },
        { status: 400 }
      );
    }

    // Map rows to credential schema shape
    const credentials = parsed.data.map((row) => ({
      employeeEmail: row.employeeEmail || undefined,
      staffNumber: row.employeeNumber || undefined,
      credentialTypeName: row.credentialTypeName ?? '',
      issueDate: row.issueDate ? new Date(row.issueDate) : undefined,
      expirationDate: row.expirationDate ? new Date(row.expirationDate) : undefined,
      issuer: row.issuer || undefined,
      licenseNumber: row.licenseNumber || undefined,
    }));

    const dryRun = formData.get('dryRun') === 'true';
    const overwriteExisting = formData.get('overwriteExisting') === 'true';
    const autoApprove = formData.get('autoApprove') === 'true';

    const bodyParsed = BulkImportCredentialsSchema.safeParse({ credentials, dryRun, overwriteExisting, autoApprove });
    if (!bodyParsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: bodyParsed.error.flatten() },
        { status: 400 }
      );
    }

    const { credentials: validCredentials } = bodyParsed.data;
    const warningDays = agency.credentialWarningDays ?? 30;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { row: number; employeeRef: string; reason: string }[] = [];

    for (let i = 0; i < validCredentials.length; i++) {
      const row = validCredentials[i];
      const employeeRef = row.employeeEmail ?? row.employeeNumber ?? `row ${i + 1}`;

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

      const existing = await prisma.staffCredential.findFirst({
        where: { staffMemberId: employee.id, documentTypeId: documentType.id },
        select: { id: true },
      });

      if (existing && !overwriteExisting) {
        skipped++;
        continue;
      }

      if (dryRun) {
        existing ? updated++ : created++;
        continue;
      }

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

    if (!dryRun) {
      await prisma.adminAction.create({
        data: {
          adminId: user.id,
          actionType: 'BULK_CREDENTIAL_IMPORT',
          targetAgencyId: agency.id,
          details: {
            source: 'csv',
            total: validCredentials.length,
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

    return NextResponse.json({ dryRun, created, updated, skipped, failed, total: validCredentials.length, errors });
  } catch (error: any) {
    console.error('[bulk-import/csv] Error:', error);
    if (error.message?.includes('required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
