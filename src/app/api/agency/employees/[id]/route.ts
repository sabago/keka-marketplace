import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin, requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { EmployeeStatus } from '@prisma/client';

/**
 * GET /api/agency/employees/:id
 * Get employee details with documents
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { agency } = await requireAgency();
    const employeeId = params.id;

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        agencyId: agency.id,
      },
      include: {
        documents: {
          include: {
            documentType: true,
          },
          orderBy: {
            expirationDate: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching employee:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agency/employees/:id
 * Update employee
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const employeeId = params.id;
    const body = await req.json();

    // Verify employee belongs to agency
    const existing = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        agencyId: agency.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      employeeNumber,
      hireDate,
      department,
      position,
      status,
    } = body;

    // Check if employee number is unique (if changing)
    if (employeeNumber && employeeNumber !== existing.employeeNumber) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          agencyId: agency.id,
          employeeNumber,
          id: { not: employeeId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Employee number already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) updateData.email = email?.trim().toLowerCase() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (employeeNumber !== undefined) updateData.employeeNumber = employeeNumber?.trim() || null;
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (position !== undefined) updateData.position = position?.trim() || null;
    if (status !== undefined) updateData.status = status as EmployeeStatus;

    // Update employee
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
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
        message: 'Employee updated successfully',
        employee: {
          ...employee,
          documentCount: employee._count.documents,
          _count: undefined,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating employee:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agency/employees/:id
 * Soft delete employee (set status to INACTIVE)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const employeeId = params.id;

    // Verify employee belongs to agency
    const existing = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        agencyId: agency.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to INACTIVE
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json(
      { message: 'Employee deactivated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting employee:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to deactivate employee' },
      { status: 500 }
    );
  }
}
