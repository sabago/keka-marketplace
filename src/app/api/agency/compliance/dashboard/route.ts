import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/authHelpers';
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

    // Calculate date threshold for expiring soon
    const now = new Date();
    const expiringThreshold = new Date();
    expiringThreshold.setDate(now.getDate() + expiringDays);

    // Run all count queries in parallel
    const [
      totalEmployees,
      activeEmployees,
      totalDocuments,
      expiredDocumentsCount,
      expiringSoonDocumentsCount,
      pendingReviewCount,
      expiredList,
      expiringList,
      pendingList,
      employeesRaw,
    ] = await Promise.all([
      prisma.staffMember.count({ where: { agencyId: agency.id } }),
      prisma.staffMember.count({ where: { agencyId: agency.id, status: 'ACTIVE' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: { not: 'ARCHIVED' } } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRED' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: 'EXPIRING_SOON' } }),
      prisma.staffCredential.count({ where: { staffMember: { agencyId: agency.id }, status: { not: 'ARCHIVED' }, reviewStatus: 'PENDING_REVIEW' } }),

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

      // Staff with expired or expiring credentials
      prisma.staffMember.findMany({
        where: { agencyId: agency.id, status: 'ACTIVE' },
        include: {
          credentials: {
            where: { OR: [{ status: 'EXPIRED' }, { status: 'EXPIRING_SOON' }] },
            select: { id: true, status: true },
          },
        },
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

    // Build staff-with-issues list (staff who have at least one expired credential)
    const employeesWithExpiredDocs = employeesRaw
      .filter((emp) => emp.credentials.some((d) => d.status === 'EXPIRED'))
      .map((emp) => ({
        id: emp.id,
        userId: emp.userId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        expiredCount: emp.credentials.filter((d) => d.status === 'EXPIRED').length,
        expiringSoonCount: emp.credentials.filter((d) => d.status === 'EXPIRING_SOON').length,
      }))
      .sort((a, b) => b.expiredCount - a.expiredCount);

    return NextResponse.json({
      stats: {
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
        employeesWithExpiredDocs: employeesWithExpiredDocs.length,
      },
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
