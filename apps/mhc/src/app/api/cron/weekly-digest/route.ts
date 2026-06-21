/**
 * Vercel Cron Job Handler - Weekly Compliance Digest
 *
 * Sends a weekly compliance summary email to all agency admins.
 * GET /api/cron/weekly-digest
 * Schedule: Monday 8 AM  (0 8 * * 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAgencyComplianceSummary } from '@/lib/credentialHelpers';
import { sendWeeklyComplianceDigest } from '@/lib/credentialEmails';

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
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

    // Get all active agencies with autoReminderEnabled and their admin users
    const agencies = await prisma.agency.findMany({
      where: {
        autoReminderEnabled: true,
        approvalStatus: 'APPROVED',
      },
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
        const summary = await getAgencyComplianceSummary(agency.id);

        // Get top-5 urgent credentials (expired + expiring soonest)
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
            const firstName = nameParts[0] ?? '';
            const lastName = nameParts.slice(1).join(' ') ?? '';
            const sent = await sendWeeklyComplianceDigest(
              {
                email: admin.email,
                firstName,
                lastName,
              },
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
    console.error('[CRON-WEEKLY-DIGEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
