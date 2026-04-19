/**
 * POST /api/admin/agency/[id]/purge
 *
 * Hard-delete ARCHIVED EmployeeDocument records older than N days for an agency.
 * Auth: PLATFORM_ADMIN only (destructive operation).
 *
 * Body: { olderThanDays: number (min 90), dryRun?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const PurgeSchema = z.object({
  olderThanDays: z.number().int().min(90, 'Minimum retention period is 90 days'),
  dryRun: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requirePlatformAdmin();
  } catch {
    return NextResponse.json({ error: 'Platform admin access required' }, { status: 401 });
  }

  const { id: agencyId } = await Promise.resolve(params);

  // Verify agency exists
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, agencyName: true },
  });

  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PurgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { olderThanDays, dryRun } = parsed.data;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const candidates = await prisma.staffCredential.findMany({
    where: {
      staffMember: { agencyId },
      status: 'ARCHIVED',
      createdAt: { lt: cutoffDate },
    },
    select: { id: true },
  });

  const count = candidates.length;

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldDelete: count,
      cutoffDate: cutoffDate.toISOString(),
      agencyId,
      agencyName: agency.agencyName,
    });
  }

  // Hard delete
  await prisma.staffCredential.deleteMany({
    where: {
      id: { in: candidates.map((c) => c.id) },
    },
  });

  // Audit log
  await prisma.adminAction.create({
    data: {
      adminId: admin.id,
      actionType: 'DATA_PURGE',
      targetAgencyId: agencyId,
      details: {
        deletedCount: count,
        olderThanDays,
        cutoffDate: cutoffDate.toISOString(),
        agencyName: agency.agencyName,
      },
    },
  });

  return NextResponse.json({
    dryRun: false,
    deleted: count,
    cutoffDate: cutoffDate.toISOString(),
    agencyId,
    agencyName: agency.agencyName,
  });
}
