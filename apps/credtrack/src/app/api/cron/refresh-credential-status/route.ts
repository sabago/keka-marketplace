/**
 * GET /api/cron/refresh-credential-status
 * Recalculates DocumentStatus and saves a ComplianceSnapshot per agency.
 * Schedule: daily at 8:00 AM (0 8 * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mhc/db';
import { calculateCredentialStatus, isCredentialCompliant } from '@mhc/credential-core';

function verifyCronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  return !!token && token === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const BATCH_SIZE = 500;
    let cursor: string | undefined;
    let statusUpdated = 0;
    const now = new Date();

    do {
      const credentials = await prisma.staffCredential.findMany({
        where: { status: { not: 'ARCHIVED' } },
        include: {
          staffMember: {
            include: { agency: { select: { id: true, credentialWarningDays: true } } },
          },
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (credentials.length === 0) break;
      cursor = credentials[credentials.length - 1].id;

      const updates: Array<{ id: string; status: import('@prisma/client').DocumentStatus; isCompliant: boolean }> = [];

      for (const credential of credentials) {
        const warningDays = credential.staffMember.agency.credentialWarningDays ?? 30;
        const newStatus = calculateCredentialStatus(credential.expirationDate, warningDays);
        const newIsCompliant = isCredentialCompliant(newStatus, credential.reviewStatus, credential.expirationDate);
        if (credential.status !== newStatus || credential.isCompliant !== newIsCompliant) {
          updates.push({ id: credential.id, status: newStatus, isCompliant: newIsCompliant });
        }
      }

      if (updates.length > 0) {
        await prisma.$transaction(
          updates.map((u) =>
            prisma.staffCredential.update({
              where: { id: u.id },
              data: { status: u.status, isCompliant: u.isCompliant, complianceCheckedAt: now },
            })
          )
        );
        statusUpdated += updates.length;
      }

      if (credentials.length < BATCH_SIZE) break;
    } while (true);

    // Snapshot per agency
    const agencies = await prisma.agency.findMany({
      select: { id: true, _count: { select: { staffMembers: true } } },
    });

    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let snapshotsCreated = 0;

    for (const agency of agencies) {
      const [total, valid, expiringSoon, expired, missing, pendingReview, activeStaff] = await Promise.all([
        prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id } } }),
        prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'ACTIVE', isCompliant: true } }),
        prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRING_SOON' } }),
        prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRED' } }),
        prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'MISSING' } }),
        prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, reviewStatus: 'PENDING' } }),
        prisma.staffMember.count({ where: { agencyId: agency.id, status: 'ACTIVE' } }),
      ]);

      const complianceRate = total > 0 ? Math.round((valid / total) * 100) : 0;

      await prisma.complianceSnapshot.create({
        data: {
          agencyId: agency.id,
          period,
          totalStaff: agency._count.staffMembers,
          activeStaff,
          totalCredentials: total,
          validCredentials: valid,
          expiringCredentials: expiringSoon,
          expiredCredentials: expired,
          missingCredentials: missing,
          pendingReviewCredentials: pendingReview,
          complianceRate,
          byCredentialType: {},
        },
      });

      snapshotsCreated++;
    }

    return NextResponse.json({
      success: true,
      statusUpdated,
      snapshotsCreated,
      duration: `${Date.now() - startTime}ms`,
    });
  } catch (error) {
    console.error('[CT-CRON] refresh-credential-status error:', error);
    return NextResponse.json({ error: 'Failed to refresh credential statuses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
