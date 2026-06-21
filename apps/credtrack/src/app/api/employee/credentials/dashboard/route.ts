import { NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/employee/credentials/dashboard
 * Credential dashboard for the logged-in AGENCY_USER.
 * Finds their StaffMember record by email match within the org.
 */
export async function GET() {
  try {
    const { user, orgId } = await requireOrg();

    const employee = await prisma.staffMember.findFirst({
      where: { agencyId: orgId, email: user.email },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'No staff record found for your account. Contact your administrator.' },
        { status: 404 }
      );
    }

    const credentials = await prisma.staffCredential.findMany({
      where: {
        staffMemberId: employee.id,
        status: { not: 'ARCHIVED' },
      },
      include: {
        documentType: true,
      },
      orderBy: [
        { status: 'desc' },
        { expirationDate: 'asc' },
      ],
    });

    const totalCredentials = credentials.length;
    const compliant = credentials.filter((c) => c.isCompliant).length;
    const pendingReview = credentials.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length;
    const expiringSoon = credentials.filter((c) => c.status === 'EXPIRING_SOON').length;
    const expired = credentials.filter((c) => c.status === 'EXPIRED').length;
    const active = credentials.filter((c) => c.status === 'ACTIVE' && c.isCompliant).length;
    const compliancePercentage = totalCredentials > 0
      ? Math.round((compliant / totalCredentials) * 100)
      : 0;

    // Per-category breakdown for weighted compliance score widget
    const categoryMap: Record<string, { compliant: number; total: number }> = {};
    for (const c of credentials) {
      const cat = (c.documentType?.category as string) ?? 'OTHER';
      categoryMap[cat] ??= { compliant: 0, total: 0 };
      categoryMap[cat].total++;
      if (c.isCompliant) categoryMap[cat].compliant++;
    }
    const categoryBreakdown = Object.entries(categoryMap).map(([category, counts]) => ({
      category,
      ...counts,
    }));

    const needsAction = credentials.filter(
      (c) =>
        c.status === 'EXPIRED' ||
        c.status === 'EXPIRING_SOON' ||
        c.reviewStatus === 'PENDING_REVIEW' ||
        c.reviewStatus === 'REJECTED' ||
        c.reviewStatus === 'NEEDS_CORRECTION'
    );

    const flaggedCount = credentials.filter(
      (c) => c.reviewStatus === 'REJECTED' || c.reviewStatus === 'NEEDS_CORRECTION'
    ).length;

    return NextResponse.json({
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      stats: {
        totalCredentials,
        compliant,
        compliancePercentage,
        pendingReview,
        expiringSoon,
        expired,
        active,
        needsActionCount: needsAction.length,
        flaggedCount,
      },
      credentials,
      categoryBreakdown,
      needsAction,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/employee/credentials/dashboard error:', err);
    return NextResponse.json({ error: 'Failed to fetch credential dashboard' }, { status: 500 });
  }
}
