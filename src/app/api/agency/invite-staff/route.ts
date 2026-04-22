import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { generatePasswordSetupToken, sendStaffInvitationEmail } from '@/lib/email';
import { canAddStaff } from '@/lib/subscriptionHelpers';

/**
 * POST /api/agency/invite-staff
 * Invite a new staff member to the agency
 */
export async function POST(req: NextRequest) {
  try {
    // Require agency admin authentication
    const { user, agency } = await requireAgencyAdmin();

    // Check if agency can add more staff members
    const staffCheck = await canAddStaff(agency.id);
    if (!staffCheck.canAdd) {
      return NextResponse.json(
        {
          error: `Staff limit reached (${staffCheck.currentCount}/${staffCheck.limit}). Please upgrade to a larger plan to add more team members.`,
          currentCount: staffCheck.currentCount,
          limit: staffCheck.limit,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { email, name } = body;

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { agency: true },
    });

    if (existingUser) {
      // If user exists and belongs to the same agency
      if (existingUser.agencyId === agency.id) {
        return NextResponse.json(
          { error: 'A user with this email is already part of your agency' },
          { status: 409 }
        );
      }

      // If user exists and belongs to a different agency
      if (existingUser.agencyId && existingUser.agencyId !== agency.id) {
        return NextResponse.json(
          { error: 'This user is already associated with another agency' },
          { status: 409 }
        );
      }

      // If user exists but has no agency, we can invite them
      // This covers the case where someone signed up but didn't complete onboarding
    }

    // Create the staff member user account
    const newStaffMember = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        role: UserRole.AGENCY_USER,
        agencyId: agency.id,
        password: null, // Password will be set via the invitation link
        isPrimaryContact: false,
      },
    });

    // Generate password setup token (24 hour expiry)
    const token = await generatePasswordSetupToken(newStaffMember.id);

    if (!token) {
      // If token generation fails, delete the user and return error
      await prisma.user.delete({
        where: { id: newStaffMember.id },
      });
      return NextResponse.json(
        { error: 'Failed to generate invitation link. Please try again.' },
        { status: 500 }
      );
    }

    // Send invitation email
    const emailSent = await sendStaffInvitationEmail(
      {
        email: newStaffMember.email,
        name: newStaffMember.name,
      },
      token,
      agency.agencyName,
      user.name || user.email // Inviter's name
    );

    if (!emailSent) {
      // If email fails, we don't delete the user (admin can resend)
      console.error('Failed to send staff invitation email to:', email);
    }

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'STAFF_INVITED',
        targetAgencyId: agency.id,
        notes: JSON.stringify({
          staffEmail: email,
          staffName: name,
        }),
      },
    });

    return NextResponse.json(
      {
        message: 'Staff member invited successfully',
        staffMember: {
          id: newStaffMember.id,
          email: newStaffMember.email,
          name: newStaffMember.name,
          role: newStaffMember.role,
          createdAt: newStaffMember.createdAt,
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error inviting staff member:', error);

    // Handle specific error types
    if (error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to invite staff member. Please try again.' },
      { status: 500 }
    );
  }
}
