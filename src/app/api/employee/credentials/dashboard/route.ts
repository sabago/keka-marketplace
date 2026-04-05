/**
 * GET /api/employee/credentials/dashboard
 *
 * Get credential dashboard data for authenticated employee
 * Includes: credentials list, compliance stats, upcoming expirations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { getUpcomingExpirations } from '@/lib/credentialReminders';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Find employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        agencyId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Get all credentials with document type info
    const credentials = await prisma.employeeDocument.findMany({
      where: { employeeId: employee.id },
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

    // Get credentials needing action
    const needsAction = credentials.filter(
      (c) =>
        c.status === 'EXPIRED' ||
        c.status === 'EXPIRING_SOON' ||
        c.reviewStatus === 'PENDING_REVIEW' ||
        c.reviewStatus === 'REJECTED'
    );

    // Get recent reminders
    const recentReminders = await prisma.credentialReminder.findMany({
      where: { employeeId: employee.id },
      include: {
        credential: {
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
      },
      credentials,
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
