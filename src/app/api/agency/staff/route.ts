import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/authHelpers';
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

    // Get all users in the agency
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
        createdAt: true,
        updatedAt: true,
        image: true,
      },
      orderBy: [
        { role: 'asc' }, // AGENCY_ADMIN first, then AGENCY_USER
        { createdAt: 'asc' }, // Then by creation date
      ],
    });

    // Check for pending invitations (users without password set)
    const staffWithInvitationStatus = await Promise.all(
      staffMembers.map(async (staff) => {
        // Check if user has set their password
        const hasPassword = await prisma.user.findUnique({
          where: { id: staff.id },
          select: { password: true },
        });

        // Check for pending password setup token
        const pendingToken = await prisma.passwordSetupToken.findFirst({
          where: {
            userId: staff.id,
            used: false,
            expiresAt: { gt: new Date() },
          },
        });

        return {
          ...staff,
          invitationStatus: hasPassword?.password
            ? 'active'
            : pendingToken
            ? 'pending'
            : 'expired',
        };
      })
    );

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
