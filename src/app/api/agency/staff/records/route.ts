import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/staff/records
 * List all staff credential records for the agency with credential stats
 */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const where: any = { agencyId: agency.id };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const records = await prisma.staffMember.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        credentials: {
          select: { id: true, status: true, reviewStatus: true },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const stats = {
      totalTracked: records.length,
      totalCredentials: records.reduce((sum, r) => sum + r.credentials.length, 0),
      pendingReview: records.reduce(
        (sum, r) => sum + r.credentials.filter((d) => d.reviewStatus === 'PENDING_REVIEW').length,
        0
      ),
    };

    return NextResponse.json({
      records: records.map((r) => ({
        staffRecordId: r.id,
        userId: r.userId,
        firstName: r.firstName,
        lastName: r.lastName,
        position: r.position,
        department: r.department,
        status: r.status,
        user: r.user,
        credentialCount: r.credentials.length,
        expiringSoon: r.credentials.filter((d) => d.status === 'EXPIRING_SOON').length,
        expired: r.credentials.filter((d) => d.status === 'EXPIRED').length,
        pendingReview: r.credentials.filter((d) => d.reviewStatus === 'PENDING_REVIEW').length,
      })),
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching staff records:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch staff records' }, { status: 500 });
  }
}

/**
 * POST /api/agency/staff/records
 * Create a credential tracking record for a staff member
 */
export async function POST(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();
    const body = await req.json();
    const { userId, firstName, lastName, position, department, hireDate } = body;

    if (!userId || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'userId, firstName, and lastName are required' },
        { status: 400 }
      );
    }

    // Verify the user belongs to this agency
    const staffUser = await prisma.user.findFirst({
      where: { id: userId, agencyId: agency.id },
    });

    if (!staffUser) {
      return NextResponse.json(
        { error: 'Staff member not found in your agency' },
        { status: 404 }
      );
    }

    // Check if a record already exists
    const existing = await prisma.staffMember.findFirst({
      where: { userId, agencyId: agency.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A credential tracking record already exists for this staff member' },
        { status: 409 }
      );
    }

    const record = await prisma.staffMember.create({
      data: {
        agencyId: agency.id,
        userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: staffUser.email,
        position: position?.trim() || null,
        department: department?.trim() || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating staff record:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create staff record' }, { status: 500 });
  }
}

/**
 * PUT /api/agency/staff/records
 * Update a staff credential record (by staffRecordId in body)
 */
export async function PUT(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();
    const body = await req.json();
    const { staffRecordId, firstName, lastName, position, department, hireDate, status } = body;

    if (!staffRecordId) {
      return NextResponse.json({ error: 'staffRecordId is required' }, { status: 400 });
    }

    const existing = await prisma.staffMember.findFirst({
      where: { id: staffRecordId, agencyId: agency.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (position !== undefined) updateData.position = position?.trim() || null;
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;
    if (status !== undefined) updateData.status = status;

    const record = await prisma.staffMember.update({
      where: { id: staffRecordId },
      data: updateData,
    });

    return NextResponse.json({ record });
  } catch (error: any) {
    console.error('Error updating staff record:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update staff record' }, { status: 500 });
  }
}
