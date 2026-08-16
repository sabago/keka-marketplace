/**
 * GET /api/cron/weekly-digest
 * Sends weekly compliance summary email to all agency admins.
 * Schedule: Monday 10 AM (0 10 * * 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mhc/db';
import { sendWeeklyComplianceDigest } from '@mhc/credential-core';

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
    const agencies = await prisma.agency.findMany({
      where: { autoReminderEnabled: true, approvalStatus: 'APPROVED' },
      select: {
        id: true,
        agencyName: true,
        users: {
          where: { role: 'AGENCY_ADMIN' },
          select: { id: true, name: true, email: true },
        },
      },
    });

    let agenciesProcessed = 0;
    let emailsSent = 0;
    const errors: string[] = [];

    for (const agency of agencies) {
      if (!agency.users.length) continue;

      try {
        const [total, valid, expiringSoon, expired, missing, pendingReview] = await Promise.all([
          prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id } } }),
          prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'ACTIVE', isCompliant: true } }),
          prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRING_SOON' } }),
          prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRED' } }),
          prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'MISSING' } }),
          prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, reviewStatus: 'PENDING' } }),
        ]);

        const summary = {
          total,
          valid,
          expiringSoon,
          expired,
          missing,
          pendingReview,
          complianceRate: total > 0 ? Math.round((valid / total) * 100) : 0,
        };

        const urgentDocs = await prisma.staffCredential.findMany({
          where: {
            staffMember: { agencyId: agency.id, status: 'ACTIVE' },
            status: { in: ['EXPIRED', 'EXPIRING_SOON'] },
            reviewStatus: 'APPROVED',
          },
          include: {
            staffMember: { select: { firstName: true, lastName: true } },
            documentType: { select: { name: true } },
          },
          orderBy: { expirationDate: 'asc' },
          take: 5,
        });

        const urgentCredentials = urgentDocs.map((d) => ({
          employeeName: `${d.staffMember.firstName} ${d.staffMember.lastName}`,
          documentTypeName: d.documentType?.name ?? 'Credential',
          expirationDate: d.expirationDate,
          status: d.status,
        }));

        for (const admin of agency.users) {
          if (!admin.email) continue;
          try {
            const nameParts = (admin.name ?? '').split(' ');
            const sent = await sendWeeklyComplianceDigest(
              { email: admin.email, firstName: nameParts[0] ?? '', lastName: nameParts.slice(1).join(' ') },
              agency.agencyName ?? 'Your Agency',
              summary,
              urgentCredentials
            );
            if (sent) emailsSent++;
          } catch (err: any) {
            errors.push(`Agency ${agency.id} admin ${admin.id}: ${err.message}`);
          }
        }

        agenciesProcessed++;
      } catch (err: any) {
        errors.push(`Agency ${agency.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      agenciesProcessed,
      emailsSent,
      errors: errors.slice(0, 20),
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[CT-CRON] weekly-digest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
