/**
 * GET /api/admin/credentials/export
 *
 * Platform-wide credential export (all agencies or one agency).
 * Streams via ReadableStream + cursor pagination to avoid memory pressure.
 * Auth: SUPERADMIN or PLATFORM_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { checkRateLimit, adminRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

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

const CSV_HEADER = [
  'agencyName',
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

export async function GET(req: NextRequest) {
  try {
    await requireSuperadmin();

    const rl = await checkRateLimit(adminRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') ?? 'csv';
    const agencyIdFilter = searchParams.get('agencyId') ?? undefined;
    const dateTag = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      // For JSON, collect all pages in memory (admin context — acceptable)
      const allRows: object[] = [];
      let cursor: string | undefined;

      while (true) {
        const batch = await prisma.staffCredential.findMany({
          where: { staffMember: { ...(agencyIdFilter ? { agencyId: agencyIdFilter } : {}) } },
          include: {
            staffMember: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                department: true,
                position: true,
                agency: { select: { agencyName: true } },
              },
            },
            documentType: { select: { name: true } },
          },
          orderBy: { id: 'asc' },
          take: 100,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        if (!batch.length) break;

        for (const c of batch) {
          allRows.push({
            agencyName: c.staffMember.agency?.agencyName ?? '',
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
          });
        }

        cursor = batch[batch.length - 1].id;
        if (batch.length < 100) break;
      }

      return NextResponse.json(allRows, {
        headers: {
          'Content-Disposition': `attachment; filename="credentials-platform-${dateTag}.json"`,
        },
      });
    }

    // CSV — stream via ReadableStream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(CSV_HEADER + '\n'));

        let cursor: string | undefined;

        while (true) {
          const batch = await prisma.staffCredential.findMany({
            where: { staffMember: { ...(agencyIdFilter ? { agencyId: agencyIdFilter } : {}) } },
            include: {
              staffMember: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  department: true,
                  position: true,
                  agency: { select: { agencyName: true } },
                },
              },
              documentType: { select: { name: true } },
            },
            orderBy: { id: 'asc' },
            take: 100,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          });

          if (!batch.length) break;

          for (const c of batch) {
            const row = [
              escapeCSV(c.staffMember.agency?.agencyName),
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
            ].join(',');
            controller.enqueue(encoder.encode(row + '\n'));
          }

          cursor = batch[batch.length - 1].id;
          if (batch.length < 100) break;
        }

        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="credentials-platform-${dateTag}.csv"`,
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Platform credential export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
