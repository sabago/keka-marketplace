import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/compliance/dashboard
 * Get compliance dashboard data with expiration stats
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

    // Get employee counts
    const totalEmployees = await prisma.employee.count({
      where: { agencyId: agency.id },
    });

    const activeEmployees = await prisma.employee.count({
      where: {
        agencyId: agency.id,
        status: 'ACTIVE',
      },
    });

    // Get document counts
    const totalDocuments = await prisma.employeeDocument.count({
      where: {
        employee: {
          agencyId: agency.id,
        },
      },
    });

    const expiredDocuments = await prisma.employeeDocument.count({
      where: {
        employee: {
          agencyId: agency.id,
        },
        status: 'EXPIRED',
      },
    });

    const expiringSoonDocuments = await prisma.employeeDocument.count({
      where: {
        employee: {
          agencyId: agency.id,
        },
        status: 'EXPIRING_SOON',
      },
    });

    // Get detailed expired documents
    const expiredList = await prisma.employeeDocument.findMany({
      where: {
        employee: {
          agencyId: agency.id,
        },
        status: 'EXPIRED',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
        documentType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
      take: 50, // Limit to 50 most overdue
    });

    // Get detailed expiring documents
    const expiringList = await prisma.employeeDocument.findMany({
      where: {
        employee: {
          agencyId: agency.id,
        },
        status: 'EXPIRING_SOON',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
          },
        },
        documentType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
      take: 50, // Limit to 50 soonest to expire
    });

    // Calculate days expired/until expiration
    const enrichedExpired = expiredList.map((doc) => {
      const daysExpired = doc.expirationDate
        ? Math.floor((now.getTime() - doc.expirationDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        ...doc,
        daysExpired,
      };
    });

    const enrichedExpiring = expiringList.map((doc) => {
      const daysUntilExpiration = doc.expirationDate
        ? Math.floor((doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        ...doc,
        daysUntilExpiration,
      };
    });

    // Get employees with most expired documents
    const employeesWithIssues = await prisma.employee.findMany({
      where: {
        agencyId: agency.id,
        status: 'ACTIVE',
      },
      include: {
        documents: {
          where: {
            OR: [
              { status: 'EXPIRED' },
              { status: 'EXPIRING_SOON' },
            ],
          },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const employeesWithExpiredDocs = employeesWithIssues
      .filter((emp) => emp.documents.some((d) => d.status === 'EXPIRED'))
      .map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        expiredCount: emp.documents.filter((d) => d.status === 'EXPIRED').length,
        expiringSoonCount: emp.documents.filter((d) => d.status === 'EXPIRING_SOON').length,
      }))
      .sort((a, b) => b.expiredCount - a.expiredCount);

    return NextResponse.json(
      {
        stats: {
          employees: {
            total: totalEmployees,
            active: activeEmployees,
            inactive: totalEmployees - activeEmployees,
          },
          documents: {
            total: totalDocuments,
            active: totalDocuments - expiredDocuments - expiringSoonDocuments,
            expiringSoon: expiringSoonDocuments,
            expired: expiredDocuments,
          },
          employeesWithExpiredDocs: employeesWithExpiredDocs.length,
        },
        expiredDocuments: enrichedExpired,
        expiringDocuments: enrichedExpiring,
        employeesWithIssues: employeesWithExpiredDocs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching compliance dashboard:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch compliance data' },
      { status: 500 }
    );
  }
}
