import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/admin/platform-stats
 * Platform KPIs for the admin dashboard.
 */
export async function GET(_req: NextRequest) {
  try {
    await requireSuperadmin();

    const [
      totalAgencies,
      pendingAgencies,
      approvedAgencies,
      totalUsers,
      recentActions,
    ] = await Promise.all([
      prisma.agency.count(),
      prisma.agency.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.agency.count({ where: { approvalStatus: 'APPROVED' } }),
      prisma.user.count(),
      prisma.adminAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          admin: { select: { id: true, name: true, email: true } },
          targetAgency: { select: { id: true, agencyName: true } },
        },
      }),
    ]);

    return NextResponse.json({
      totalAgencies,
      pendingAgencies,
      approvedAgencies,
      totalUsers,
      recentActions,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch platform stats' }, { status: 500 });
  }
}
