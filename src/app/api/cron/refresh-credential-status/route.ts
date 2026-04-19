/**
 * Vercel Cron Job Handler - Credential Status Refresh & Compliance Snapshots
 *
 * Runs daily at 8:55 AM — just before the 9 AM reminder cron — so that
 * reminders always act on freshly calculated document statuses.
 *
 * GET /api/cron/refresh-credential-status
 *
 * What it does:
 * 1. Recalculates DocumentStatus (ACTIVE / EXPIRING_SOON / EXPIRED) for every
 *    non-archived credential that has an expiration date.
 * 2. Saves a ComplianceSnapshot for each agency so admins can track trends.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  calculateCredentialStatus,
  isCredentialCompliant,
  getAgencyComplianceSummary,
} from '@/lib/credentialHelpers';

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret in production
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!authHeader || !cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const token = authHeader.replace('Bearer ', '');
      if (token !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[CRON-REFRESH] Starting credential status refresh');

    // ----------------------------------------------------------------
    // Step 1: Refresh document statuses
    // ----------------------------------------------------------------

    // Fetch all credentials that could need a status update (exclude archived)
    const credentials = await prisma.staffCredential.findMany({
      where: {
        status: { not: 'ARCHIVED' },
      },
      include: {
        staffMember: {
          include: { agency: { select: { id: true, credentialWarningDays: true } } },
        },
      },
    });

    let statusUpdated = 0;

    for (const credential of credentials) {
      const warningDays = credential.staffMember.agency.credentialWarningDays ?? 30;
      const newStatus = calculateCredentialStatus(credential.expirationDate, warningDays);
      const newIsCompliant = isCredentialCompliant(
        newStatus,
        credential.reviewStatus,
        credential.expirationDate
      );

      if (credential.status !== newStatus || credential.isCompliant !== newIsCompliant) {
        await prisma.staffCredential.update({
          where: { id: credential.id },
          data: {
            status: newStatus,
            isCompliant: newIsCompliant,
            complianceCheckedAt: new Date(),
          },
        });
        statusUpdated++;
      }
    }

    console.log(`[CRON-REFRESH] Updated ${statusUpdated} credential statuses`);

    // ----------------------------------------------------------------
    // Step 2: Create a ComplianceSnapshot per agency
    // ----------------------------------------------------------------

    const agencies = await prisma.agency.findMany({
      select: {
        id: true,
        _count: {
          select: {
            staffMembers: true,
          },
        },
      },
    });

    const today = new Date();
    const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let snapshotsCreated = 0;

    for (const agency of agencies) {
      const summary = await getAgencyComplianceSummary(agency.id);

      const activeEmployeeCount = await prisma.staffMember.count({
        where: { agencyId: agency.id, status: 'ACTIVE' },
      });

      await prisma.complianceSnapshot.create({
        data: {
          agencyId: agency.id,
          period,
          totalStaff: agency._count.staffMembers,
          activeStaff: activeEmployeeCount,
          totalCredentials: summary.total,
          validCredentials: summary.valid,
          expiringCredentials: summary.expiringSoon,
          expiredCredentials: summary.expired,
          missingCredentials: summary.missing,
          pendingReviewCredentials: summary.pendingReview,
          complianceRate: summary.complianceRate,
          byCredentialType: {},
        },
      });

      snapshotsCreated++;
    }

    console.log(`[CRON-REFRESH] Created ${snapshotsCreated} compliance snapshots`);

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      statusUpdated,
      snapshotsCreated,
      duration: `${elapsed}ms`,
    });
  } catch (error) {
    console.error('[CRON-REFRESH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh credential statuses' },
      { status: 500 }
    );
  }
}
