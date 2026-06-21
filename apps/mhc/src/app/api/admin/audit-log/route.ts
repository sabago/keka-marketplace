/**
 * GET /api/admin/audit-log
 *
 * Query the AdminAction audit log. Supports CSV export.
 * Auth: SUPERADMIN or PLATFORM_ADMIN
 *
 * Query params:
 *   dateFrom     ISO date (inclusive)
 *   dateTo       ISO date (inclusive, treated as end of day)
 *   agencyId     Filter by agency
 *   actionType   Filter by action type
 *   page         Default 1
 *   limit        Default 100, max 500
 *   format       "csv" for CSV download
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

function escapeCSV(val: unknown): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin();
  } catch {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const agencyName = searchParams.get('agencyName') ?? undefined;
  const actionType = searchParams.get('actionType') ?? undefined;
  const format = searchParams.get('format');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '100')));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (agencyName) where.targetAgency = { agencyName: { contains: agencyName, mode: 'insensitive' } };
  if (actionType) where.actionType = actionType;
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const [actions, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      include: {
        admin: { select: { id: true, name: true, email: true } },
        targetAgency: { select: { agencyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: format === 'csv' ? undefined : limit,
      skip: format === 'csv' ? undefined : skip,
    }),
    prisma.adminAction.count({ where }),
  ]);

  if (format === 'csv') {
    const header = 'timestamp,adminId,adminName,adminEmail,agencyName,actionType,details,notes\n';
    const rows = actions.map((a) =>
      [
        a.createdAt.toISOString(),
        a.adminId,
        a.admin.name ?? '',
        a.admin.email ?? '',
        a.targetAgency?.agencyName ?? '',
        a.actionType,
        JSON.stringify(a.details ?? {}),
        a.notes ?? '',
      ]
        .map(escapeCSV)
        .join(',')
    );

    const date = new Date().toISOString().split('T')[0];
    return new NextResponse(header + rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${date}.csv"`,
      },
    });
  }

  return NextResponse.json({
    actions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
