import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin, requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { EmployeeStatus } from '@prisma/client';

/**
 * GET /api/agency/employees
 * List all employees for the agency
 */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgency();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as EmployeeStatus | null;
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      agencyId: agency.id,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch employees with document counts
    const employees = await prisma.employee.findMany({
      where,
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
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
      orderBy: [
        { status: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Calculate stats
    const stats = {
      total: employees.length,
      active: employees.filter((e) => e.status === 'ACTIVE').length,
      inactive: employees.filter((e) => e.status === 'INACTIVE').length,
      withExpiringDocs: employees.filter((e) => e.documents.length > 0).length,
    };

    return NextResponse.json(
      {
        employees: employees.map((emp) => ({
          ...emp,
          documentCount: emp._count.documents,
          expiringDocCount: emp.documents.filter((d) => d.status === 'EXPIRING_SOON').length,
          expiredDocCount: emp.documents.filter((d) => d.status === 'EXPIRED').length,
          documents: undefined, // Remove from response
          _count: undefined, // Remove from response
        })),
        stats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching employees:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agency/employees
 * Create a new employee
 */
export async function POST(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const body = await req.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      employeeNumber,
      hireDate,
      department,
      position,
      userId, // Optional: link to existing user
    } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Check if employee number is unique within agency
    if (employeeNumber) {
      const existing = await prisma.employee.findFirst({
        where: {
          agencyId: agency.id,
          employeeNumber,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Employee number already exists' },
          { status: 400 }
        );
      }
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        agencyId: agency.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        employeeNumber: employeeNumber?.trim() || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        department: department?.trim() || null,
        position: position?.trim() || null,
        userId: userId || null,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Employee created successfully',
        employee: {
          ...employee,
          documentCount: employee._count.documents,
          _count: undefined,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating employee:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
