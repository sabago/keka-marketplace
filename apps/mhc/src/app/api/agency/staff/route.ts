import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

/**
 * GET /api/agency/staff
 * List all staff members in the agency
 */
export async function GET(req: NextRequest) {
  try {
    // Require agency admin authentication
    const { user, agency } = await requireAgencyAdmin();

    // Get all users in the agency (active and inactive)
    const staffMembers = await prisma.user.findMany({
      where: {
        agencyId: agency.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        isPrimaryContact: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        image: true,
      },
      orderBy: [
        { isActive: 'desc' }, // Active staff first
        { role: 'asc' },      // AGENCY_ADMIN before AGENCY_USER
        { createdAt: 'asc' },
      ],
    });

    // Batch-fetch password status and pending tokens in 2 queries instead of 2N
    const staffIds = staffMembers.map((s) => s.id);
    const [passwordRows, tokenRows] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, password: true },
      }),
      prisma.passwordSetupToken.findMany({
        where: { userId: { in: staffIds }, used: false, expiresAt: { gt: new Date() } },
        select: { userId: true },
      }),
    ]);
    const passwordMap = new Map(passwordRows.map((r) => [r.id, !!r.password]));
    const pendingTokenSet = new Set(tokenRows.map((r) => r.userId));

    const staffWithInvitationStatus = staffMembers.map((staff) => ({
      ...staff,
      invitationStatus: passwordMap.get(staff.id)
        ? 'active'
        : pendingTokenSet.has(staff.id)
        ? 'pending'
        : 'expired',
    }));

    return NextResponse.json(
      {
        staffMembers: staffWithInvitationStatus,
        total: staffWithInvitationStatus.length,
        agency: {
          id: agency.id,
          name: agency.agencyName,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching staff members:', error);

    // Handle specific error types
    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch staff members. Please try again.' },
      { status: 500 }
    );
  }
}
