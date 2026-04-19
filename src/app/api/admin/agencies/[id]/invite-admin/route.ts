import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { generatePasswordSetupToken, sendStaffInvitationEmail } from '@/lib/email';

/**
 * POST /api/admin/agencies/[id]/invite-admin
 *
 * Resend the invitation email to an agency's primary contact.
 * Useful when the original email was lost, the token expired, or the admin was
 * added before the automatic invitation was in place.
 *
 * Requires: SUPERADMIN or PLATFORM_ADMIN
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUser = await requireSuperadmin();

    const agency = await prisma.agency.findUnique({
      where: { id: id },
      select: {
        id: true,
        agencyName: true,
        primaryContactEmail: true,
        users: {
          where: { isPrimaryContact: true },
          select: { id: true, name: true, email: true, password: true },
          take: 1,
        },
      },
    });

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const primaryContact = agency.users[0];

    if (!primaryContact) {
      return NextResponse.json(
        { error: 'No primary contact user found for this agency' },
        { status: 404 }
      );
    }

    // Don't re-invite users who already have a password set
    if (primaryContact.password) {
      return NextResponse.json(
        { error: 'This user has already set their password and does not need a new invitation' },
        { status: 409 }
      );
    }

    const token = await generatePasswordSetupToken(primaryContact.id);

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to generate invitation token. Please try again.' },
        { status: 500 }
      );
    }

    const emailSent = await sendStaffInvitationEmail(
      { email: primaryContact.email, name: primaryContact.name },
      token,
      agency.agencyName,
      adminUser.name || adminUser.email
    );

    await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'AGENCY_ADMIN_REINVITED',
        targetAgencyId: agency.id,
        notes: JSON.stringify({ recipientEmail: primaryContact.email }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully',
      emailSent,
      recipient: primaryContact.email,
    });
  } catch (error) {
    console.error('[INVITE-ADMIN] Error:', error);

    if (
      error instanceof Error &&
      (error.message.includes('Platform admin') || error.message.includes('Superadmin'))
    ) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to send invitation. Please try again.' },
      { status: 500 }
    );
  }
}
