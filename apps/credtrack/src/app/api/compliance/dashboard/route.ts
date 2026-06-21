import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/compliance/dashboard
 * Compliance dashboard stats for the org: expired/expiring/pending credential counts + staff issues.
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const expiringDays = daysParam ? parseInt(daysParam) : 30;
    const countsOnly = searchParams.get('countsOnly') === 'true';

    const now = new Date();

    const [
      totalEmployees,
      activeEmployees,
      totalDocuments,
      expiredDocumentsCount,
      expiringSoonDocumentsCount,
      pendingReviewCount,
    ] = await Promise.all([
      prisma.staffMember.count({ where: { agencyId: orgId } }),
      prisma.staffMember.count({ where: { agencyId: orgId, status: 'ACTIVE' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: orgId }, status: { not: 'ARCHIVED' } } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: orgId }, status: 'EXPIRED' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: orgId }, status: 'EXPIRING_SOON' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: orgId }, status: { not: 'ARCHIVED' }, reviewStatus: 'PENDING_REVIEW' } }),
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

    if (countsOnly) {
      return NextResponse.json({
        stats,
        expiredDocuments: [],
        expiringDocuments: [],
        pendingDocuments: [],
        employeesWithIssues: [],
      });
    }

    const [expiredList, expiringList, pendingList, employeesRaw] = await Promise.all([
      prisma.staffCredential.findMany({
        where: { staffMember: { agencyId: orgId }, status: 'EXPIRED' },
        include: {
          staffMember: { select: { id: true, firstName: true, lastName: true, position: true } },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { expirationDate: 'asc' },
        take: 50,
      }),

      prisma.staffCredential.findMany({
        where: { staffMember: { agencyId: orgId }, status: 'EXPIRING_SOON' },
        include: {
          staffMember: { select: { id: true, firstName: true, lastName: true, position: true } },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { expirationDate: 'asc' },
        take: 50,
      }),

      prisma.staffCredential.findMany({
        where: { staffMember: { agencyId: orgId }, reviewStatus: 'PENDING_REVIEW' },
        include: {
          staffMember: { select: { id: true, firstName: true, lastName: true, position: true } },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),

      prisma.staffCredential.groupBy({
        by: ['staffMemberId', 'status'],
        where: {
          staffMember: { agencyId: orgId, status: 'ACTIVE' },
          status: { in: ['EXPIRED', 'EXPIRING_SOON'] },
        },
        _count: { id: true },
      }),
    ]);

    const enrichedExpired = expiredList.map((doc) => ({
      ...doc,
      daysExpired: doc.expirationDate
        ? Math.floor((now.getTime() - doc.expirationDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    const enrichedExpiring = expiringList.map((doc) => ({
      ...doc,
      daysUntilExpiration: doc.expirationDate
        ? Math.floor((doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 999,
    }));

    const staffExpiredCounts = new Map<string, number>();
    const staffExpiringSoonCounts = new Map<string, number>();
    for (const row of employeesRaw) {
      if (row.status === 'EXPIRED') staffExpiredCounts.set(row.staffMemberId, row._count.id);
      if (row.status === 'EXPIRING_SOON') staffExpiringSoonCounts.set(row.staffMemberId, row._count.id);
    }

    const staffWithIssueIds = [...new Set([...staffExpiredCounts.keys(), ...staffExpiringSoonCounts.keys()])];
    const staffWithIssuesData = staffWithIssueIds.length > 0
      ? await prisma.staffMember.findMany({
          where: { id: { in: staffWithIssueIds } },
          select: { id: true, firstName: true, lastName: true, position: true },
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
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/compliance/dashboard error:', err);
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
  }
}
