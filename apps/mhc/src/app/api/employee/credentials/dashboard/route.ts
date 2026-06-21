/**
 * GET /api/employee/credentials/dashboard
 *
 * Get credential dashboard data for authenticated employee
 * Includes: credentials list, compliance stats, upcoming expirations
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { getUpcomingExpirations } from '@/lib/credentialReminders';
import { getOrCreateStaffRecord } from '@/lib/credentialHelpers';

export async function GET() {
  try {
    const { user } = await requireAuth();

    // Find or auto-create staff record
    const employee = await getOrCreateStaffRecord(user.id);

    if (!employee) {
      return NextResponse.json(
        { error: 'No agency association found for this account. Please contact your administrator.' },
        { status: 404 }
      );
    }

    // Get all credentials with document type info
    const credentials = await prisma.staffCredential.findMany({
      where: { staffMemberId: employee.id },
      include: {
        documentType: true,
        reminders: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { status: 'desc' },
        { expirationDate: 'asc' },
      ],
    });

    // Calculate statistics
    const totalCredentials = credentials.length;
    const compliant = credentials.filter((c) => c.isCompliant).length;
    const pendingReview = credentials.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length;
    const expiringSoon = credentials.filter((c) => c.status === 'EXPIRING_SOON').length;
    const expired = credentials.filter((c) => c.status === 'EXPIRED').length;
    const active = credentials.filter((c) => c.status === 'ACTIVE' && c.isCompliant).length;

    // Get upcoming expirations from helper
    const upcomingExpirations = await getUpcomingExpirations(employee.agencyId);

    // Calculate compliance percentage
    const compliancePercentage = totalCredentials > 0
      ? Math.round((compliant / totalCredentials) * 100)
      : 0;

    // Compute per-category breakdown for weighted compliance score in the widget
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

    // Get credentials needing action
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

    // Get recent reminders
    const recentReminders = await prisma.credentialReminder.findMany({
      where: { staffMemberId: employee.id },
      include: {
        document: {
          include: {
            documentType: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
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
      recentReminders,
      upcomingExpirations,
    });
  } catch (error) {
    console.error('Error fetching credential dashboard:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch credential dashboard' },
      { status: 500 }
    );
  }
}
