/**
 * GET /api/agency/credentials/export
 *
 * Export agency credentials as CSV or JSON.
 * Auth: AGENCY_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

function formatDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const format = new URL(req.url).searchParams.get('format') ?? 'csv';

    const credentials = await prisma.staffCredential.findMany({
      where: { staffMember: { agencyId: agency.id } },
      include: {
        staffMember: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            position: true,
          },
        },
        documentType: { select: { name: true } },
      },
      orderBy: [{ staffMember: { lastName: 'asc' } }, { expirationDate: 'asc' }],
    });

    if (format === 'json') {
      return NextResponse.json(
        credentials.map((c) => ({
          employeeName: `${c.staffMember.firstName} ${c.staffMember.lastName}`,
          email: c.staffMember.email,
          department: c.staffMember.department,
          position: c.staffMember.position,
          credentialType: c.documentType?.name ?? '',
          issuer: c.issuer,
          licenseNumber: c.licenseNumber,
          issueDate: formatDate(c.issueDate),
          expirationDate: formatDate(c.expirationDate),
          status: c.status,
          reviewStatus: c.reviewStatus,
          isCompliant: c.isCompliant,
          uploadedAt: formatDate(c.createdAt),
        })),
        {
          headers: {
            'Content-Disposition': `attachment; filename="credentials-${agency.id}-${new Date().toISOString().split('T')[0]}.json"`,
          },
        }
      );
    }

    // CSV
    const header = [
      'employeeName',
      'email',
      'department',
      'position',
      'credentialType',
      'issuer',
      'licenseNumber',
      'issueDate',
      'expirationDate',
      'status',
      'reviewStatus',
      'isCompliant',
      'uploadedAt',
    ].join(',');

    const rows = credentials.map((c) =>
      [
        escapeCSV(`${c.staffMember.firstName} ${c.staffMember.lastName}`),
        escapeCSV(c.staffMember.email),
        escapeCSV(c.staffMember.department),
        escapeCSV(c.staffMember.position),
        escapeCSV(c.documentType?.name),
        escapeCSV(c.issuer),
        escapeCSV(c.licenseNumber),
        escapeCSV(formatDate(c.issueDate)),
        escapeCSV(formatDate(c.expirationDate)),
        escapeCSV(c.status),
        escapeCSV(c.reviewStatus),
        escapeCSV(String(c.isCompliant)),
        escapeCSV(formatDate(c.createdAt)),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="credentials-${agency.id}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Credential export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
