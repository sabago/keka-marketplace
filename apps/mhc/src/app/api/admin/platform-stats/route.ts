import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';

export async function GET() {
  try {
    await requireSuperadmin();

    const [agencies, totalUsers, recentActions] = await Promise.all([
      prisma.agency.findMany({
        select: {
          approvalStatus: true,
          agencySize: true,
          intakeMethods: true,
          followUpMethods: true,
          followUpFrequency: true,
        },
      }),
      prisma.user.count({
        where: { role: { in: ['AGENCY_ADMIN', 'AGENCY_USER'] } },
      }),
      prisma.adminAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          actionType: true,
          createdAt: true,
          targetAgency: { select: { agencyName: true } },
          admin: { select: { name: true } },
        },
      }),
    ]);

    const totalAgencies = agencies.length;
    const pendingApprovals = agencies.filter(a => a.approvalStatus === 'PENDING').length;
    const approvedAgencies = agencies.filter(a => a.approvalStatus === 'APPROVED').length;
    const approved = agencies.filter(a => a.approvalStatus === 'APPROVED');

    // Aggregate intake methods across approved agencies
    const intakeMethodCounts: Record<string, number> = {};
    const followUpMethodCounts: Record<string, number> = {};
    const followUpFrequencyCounts: Record<string, number> = {};
    const agencySizeCounts: Record<string, number> = {};

    for (const agency of approved) {
      for (const m of agency.intakeMethods ?? []) {
        intakeMethodCounts[m] = (intakeMethodCounts[m] ?? 0) + 1;
      }
      for (const m of agency.followUpMethods ?? []) {
        followUpMethodCounts[m] = (followUpMethodCounts[m] ?? 0) + 1;
      }
      if (agency.followUpFrequency) {
        followUpFrequencyCounts[agency.followUpFrequency] = (followUpFrequencyCounts[agency.followUpFrequency] ?? 0) + 1;
      }
      if (agency.agencySize) {
        agencySizeCounts[agency.agencySize] = (agencySizeCounts[agency.agencySize] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      totalAgencies,
      pendingApprovals,
      approvedAgencies,
      totalUsers,
      intakeMethodCounts,
      followUpMethodCounts,
      followUpFrequencyCounts,
      agencySizeCounts,
      recentActions: recentActions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        agencyName: a.targetAgency?.agencyName ?? 'Unknown',
        adminName: a.admin?.name ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Platform stats error:', error);
    return NextResponse.json({ error: 'Failed to load platform stats' }, { status: 500 });
  }
}
