import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

/**
 * DELETE /api/agency/staff/[id]
 * Remove a staff member from the agency
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require agency admin authentication
    const { user, agency } = await requireAgencyAdmin();
    const { id: staffId } = await params;

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff member ID is required' },
        { status: 400 }
      );
    }

    // Verify the staff member exists and belongs to the same agency
    const staffMember = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyId: true,
        isPrimaryContact: true,
      },
    });

    if (!staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Verify the staff member belongs to the same agency
    if (staffMember.agencyId !== agency.id) {
      return NextResponse.json(
        { error: 'You can only remove staff members from your own agency' },
        { status: 403 }
      );
    }

    // Prevent deletion of the primary contact
    if (staffMember.isPrimaryContact) {
      return NextResponse.json(
        {
          error:
            'Cannot remove the primary contact. Please designate a new primary contact first.',
        },
        { status: 403 }
      );
    }

    // Prevent non-platform-admins from deleting agency admins
    if (
      staffMember.role === UserRole.AGENCY_ADMIN &&
      user.role !== UserRole.PLATFORM_ADMIN
    ) {
      return NextResponse.json(
        { error: 'Only platform administrators can remove agency administrators' },
        { status: 403 }
      );
    }

    // Prevent users from deleting themselves
    if (staffMember.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself. Please contact another admin.' },
        { status: 403 }
      );
    }

    // Delete the staff member
    await prisma.user.delete({
      where: { id: staffId },
    });

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'STAFF_REMOVED',
        targetAgencyId: agency.id,
        details: {
          staffId,
          staffEmail: staffMember.email,
          staffName: staffMember.name,
          staffRole: staffMember.role,
          agencyName: agency.agencyName,
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Staff member removed successfully',
        staffMember: {
          id: staffMember.id,
          email: staffMember.email,
          name: staffMember.name,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing staff member:', error);

    // Handle specific error types
    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to remove staff member. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agency/staff/[id]/resend-invitation
 * Resend invitation email to a staff member
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require agency admin authentication
    const { user, agency } = await requireAgencyAdmin();
    const { id: staffId } = await params;

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff member ID is required' },
        { status: 400 }
      );
    }

    // Get the staff member
    const staffMember = await prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyId: true,
        password: true,
      },
    });

    if (!staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Verify the staff member belongs to the same agency
    if (staffMember.agencyId !== agency.id) {
      return NextResponse.json(
        { error: 'Staff member does not belong to your agency' },
        { status: 403 }
      );
    }

    // Check if user has already set their password
    if (staffMember.password) {
      return NextResponse.json(
        {
          error:
            'This staff member has already activated their account. They can use the password reset feature if needed.',
        },
        { status: 400 }
      );
    }

    // Invalidate any existing tokens
    await prisma.passwordSetupToken.updateMany({
      where: {
        userId: staffId,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate a new password setup token
    const { generatePasswordSetupToken, sendStaffInvitationEmail } = await import(
      '@/lib/email'
    );
    const token = await generatePasswordSetupToken(staffId);

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to generate invitation link. Please try again.' },
        { status: 500 }
      );
    }

    // Resend invitation email
    const emailSent = await sendStaffInvitationEmail(
      {
        email: staffMember.email,
        name: staffMember.name,
      },
      token,
      agency.agencyName,
      user.name || user.email
    );

    if (!emailSent) {
      console.error('Failed to resend staff invitation email to:', staffMember.email);
    }

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'INVITATION_RESENT',
        targetAgencyId: agency.id,
        notes: JSON.stringify({
          staffEmail: staffMember.email,
          staffName: staffMember.name,
        }),
      },
    });

    return NextResponse.json(
      {
        message: 'Invitation resent successfully',
        emailSent,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error resending staff invitation:', error);

    // Handle specific error types
    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to resend invitation. Please try again.' },
      { status: 500 }
    );
  }
}
