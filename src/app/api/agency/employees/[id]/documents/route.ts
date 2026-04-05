import { NextRequest, NextResponse } from 'next/server';
import { requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/employees/:id/documents
 * List all documents for specific employee
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, agency } = await requireAgency();
    const employeeId = params.id;

    // Verify employee belongs to agency
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        agencyId: agency.id,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check permissions for staff users
    const isAdmin = user.role === 'AGENCY_ADMIN' || user.role === 'PLATFORM_ADMIN';
    if (!isAdmin && employee.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view these documents' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {
      employeeId,
    };

    if (status) {
      where.status = status;
    }

    // Fetch documents
    const documents = await prisma.employeeDocument.findMany({
      where,
      include: {
        documentType: true,
      },
      orderBy: [
        { status: 'desc' }, // Expired/Expiring first
        { expirationDate: 'asc' },
      ],
    });

    // Calculate stats
    const stats = {
      total: documents.length,
      active: documents.filter((d) => d.status === 'ACTIVE').length,
      expiringSoon: documents.filter((d) => d.status === 'EXPIRING_SOON').length,
      expired: documents.filter((d) => d.status === 'EXPIRED').length,
    };

    return NextResponse.json(
      {
        documents,
        stats,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          position: employee.position,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching employee documents:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
