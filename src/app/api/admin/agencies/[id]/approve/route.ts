import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { generatePasswordSetupToken, sendAgencyApprovalEmail } from '@/lib/email';
import { ApprovalStatus } from '@prisma/client';

/**
 * POST /api/admin/agencies/[id]/approve
 *
 * Approve an agency and send password setup email
 * Body: { notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require platform admin authentication
    const admin = await requireSuperadmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Get the agency with primary contact
    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        users: {
          where: { isPrimaryContact: true },
        },
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    if (agency.approvalStatus === ApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: 'Agency is already approved' },
        { status: 400 }
      );
    }

    const primaryContact = agency.users[0];
    if (!primaryContact) {
      return NextResponse.json(
        { error: 'No primary contact found for agency' },
        { status: 400 }
      );
    }

    // Platform/super admins already have accounts — skip password setup email
    const alreadyHasAccount = primaryContact.role === 'PLATFORM_ADMIN' || primaryContact.role === 'SUPERADMIN';

    // Update agency and log action in transaction
    await prisma.$transaction(async (tx) => {
      await tx.agency.update({
        where: { id: id },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: admin.id,
          approvalEmailSent: !alreadyHasAccount,
        },
      });

      await tx.adminAction.create({
        data: {
          adminId: admin.id,
          actionType: 'APPROVE_AGENCY',
          targetAgencyId: id,
          notes: notes || null,
        },
      });
    });

    let emailSent = false;
    if (!alreadyHasAccount) {
      // Generate password setup token and send approval email
      const token = await generatePasswordSetupToken(primaryContact.id);
      if (!token) {
        return NextResponse.json(
          { error: 'Failed to generate password setup token' },
          { status: 500 }
        );
      }

      emailSent = await sendAgencyApprovalEmail(
        {
          email: primaryContact.email,
          name: primaryContact.name || 'User',
        },
        token,
        agency.agencyName
      );

      if (!emailSent) {
        console.error('Failed to send approval email to:', primaryContact.email);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Agency approved successfully',
      emailSent,
    });

  } catch (error) {
    console.error('Error approving agency:', error);

    if (error instanceof Error && error.message.includes('Platform admin')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve agency' },
      { status: 500 }
    );
  }
}
