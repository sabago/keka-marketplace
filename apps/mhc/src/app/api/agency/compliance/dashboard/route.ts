import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/compliance/dashboard
 * Get compliance dashboard data with expiration stats.
 * Returns pendingReview count, userId on staff members for correct navigation.
 */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const expiringDays = daysParam ? parseInt(daysParam) : 30;
    // ?countsOnly=true skips the heavy document list fetches — used by the settings page
    const countsOnly = searchParams.get('countsOnly') === 'true';

    // Calculate date threshold for expiring soon
    const now = new Date();
    const expiringThreshold = new Date();
    expiringThreshold.setDate(now.getDate() + expiringDays);

    // Always run the fast count queries in parallel
    const [
      totalEmployees,
      activeEmployees,
      totalDocuments,
      expiredDocumentsCount,
      expiringSoonDocumentsCount,
      pendingReviewCount,
    ] = await Promise.all([
      prisma.staffMember.count({ where: { agencyId: agency.id } }),
      prisma.staffMember.count({ where: { agencyId: agency.id, status: 'ACTIVE' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: { not: 'ARCHIVED' } } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRED' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRING_SOON' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: { not: 'ARCHIVED' }, reviewStatus: 'PENDING_REVIEW' } }),
    ]);

    const stats = {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees,
      },
      documents: {
        total: totalDocuments,
        active: totalDocuments - expiredDocumentsCount - expiringSoonDocumentsCount - pendingReviewCount,
        expiringSoon: expiringSoonDocumentsCount,
        expired: expiredDocumentsCount,
        pendingReview: pendingReviewCount,
      },
      employeesWithExpiredDocs: 0,
    };

    // Skip heavy document list queries when caller only needs counts (e.g. settings page)
    if (countsOnly) {
      return NextResponse.json({ stats, expiredDocuments: [], expiringDocuments: [], pendingDocuments: [], employeesWithIssues: [] });
    }

    // Run the expensive detail queries only when the full dashboard needs them
    const [expiredList, expiringList, pendingList, employeesRaw] = await Promise.all([
      // Detailed expired documents
      prisma.staffCredential.findMany({
        where: { staffMember: { agencyId: agency.id }, status: 'EXPIRED' },
        include: {
          staffMember: { select: { id: true, userId: true, firstName: true, lastName: true, position: true } },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { expirationDate: 'asc' },
        take: 50,
      }),

      // Detailed expiring documents
      prisma.staffCredential.findMany({
        where: { staffMember: { agencyId: agency.id }, status: 'EXPIRING_SOON' },
        include: {
          staffMember: { select: { id: true, userId: true, firstName: true, lastName: true, position: true } },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { expirationDate: 'asc' },
        take: 50,
      }),

      // Pending review documents
      prisma.staffCredential.findMany({
        where: { staffMember: { agencyId: agency.id }, reviewStatus: 'PENDING_REVIEW' },
        include: {
          staffMember: { select: { id: true, userId: true, firstName: true, lastName: true, position: true } },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),

      // Staff with expired or expiring credentials — use groupBy to avoid loading all credentials into memory
      prisma.staffCredential.groupBy({
        by: ['staffMemberId', 'status'],
        where: {
          staffMember: { agencyId: agency.id, status: 'ACTIVE' },
          status: { in: ['EXPIRED', 'EXPIRING_SOON'] },
        },
        _count: { id: true },
      }),
    ]);

    // Enrich expired docs with days overdue
    const enrichedExpired = expiredList.map((doc) => ({
      ...doc,
      daysExpired: doc.expirationDate
        ? Math.floor((now.getTime() - doc.expirationDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    // Enrich expiring docs with days remaining
    const enrichedExpiring = expiringList.map((doc) => ({
      ...doc,
      daysUntilExpiration: doc.expirationDate
        ? Math.floor((doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 999,
    }));

    // Aggregate staff issue counts from groupBy result (no per-staff credential fetch needed)
    const staffExpiredCounts = new Map<string, number>();
    const staffExpiringSoonCounts = new Map<string, number>();
    for (const row of employeesRaw) {
      if (row.status === 'EXPIRED') staffExpiredCounts.set(row.staffMemberId, row._count.id);
      if (row.status === 'EXPIRING_SOON') staffExpiringSoonCounts.set(row.staffMemberId, row._count.id);
    }

    // Fetch only the staff members who actually have issues (not all active staff)
    const staffWithIssueIds = [...new Set([...staffExpiredCounts.keys(), ...staffExpiringSoonCounts.keys()])];
    const staffWithIssuesData = staffWithIssueIds.length > 0
      ? await prisma.staffMember.findMany({
          where: { id: { in: staffWithIssueIds } },
          select: { id: true, userId: true, firstName: true, lastName: true, position: true },
        })
      : [];

    const employeesWithExpiredDocs = staffWithIssuesData
      .map((emp) => ({
        ...emp,
        expiredCount: staffExpiredCounts.get(emp.id) ?? 0,
        expiringSoonCount: staffExpiringSoonCounts.get(emp.id) ?? 0,
      }))
      .filter((emp) => emp.expiredCount > 0)
      .sort((a, b) => b.expiredCount - a.expiredCount);

    stats.employeesWithExpiredDocs = employeesWithExpiredDocs.length;

    return NextResponse.json({
      stats,
      expiredDocuments: enrichedExpired,
      expiringDocuments: enrichedExpiring,
      pendingDocuments: pendingList,
      employeesWithIssues: employeesWithExpiredDocs,
    });
  } catch (error: any) {
    console.error('Error fetching compliance dashboard:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
  }
}
