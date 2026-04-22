import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/authHelpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

/**
 * GET /api/admin/users/[id]
 * Fetch a single user's detail for the admin profile panel.
 * Requires superadmin or platform admin.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperadmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        isActive: true,
        isPrimaryContact: true,
        password: true,
        createdAt: true,
        agencyId: true,
        agency: { select: { id: true, agencyName: true, approvalStatus: true } },
        passwordSetupTokens: {
          where: { used: false, expiresAt: { gt: new Date() } },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let invitationStatus: 'active' | 'pending' | 'expired';
    if (user.password) {
      invitationStatus = 'active';
    } else if (user.passwordSetupTokens.length > 0) {
      invitationStatus = 'pending';
    } else {
      invitationStatus = 'expired';
    }

    // Strip sensitive fields before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, passwordSetupTokens, ...safeUser } = user;

    return NextResponse.json({ user: { ...safeUser, invitationStatus } });
  } catch (error) {
    console.error('[GET /api/admin/users/[id]]', error);
    if (error instanceof Error && (error.message.includes('Superadmin') || error.message.includes('Platform admin'))) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Actions: deactivate | reactivate | resend_invite
 * Requires superadmin or platform admin.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireSuperadmin();
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const body = await req.json();
    const action = body?.action as string;

    if (!['deactivate', 'reactivate', 'resend_invite'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        password: true,
        agencyId: true,
        agency: { select: { id: true, agencyName: true } },
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── deactivate ──────────────────────────────────────────────────────────────
    if (action === 'deactivate') {
      if (target.id === session?.user?.id) {
        return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
      }
      if (target.role === UserRole.PLATFORM_ADMIN) {
        return NextResponse.json({ error: 'Platform admin accounts cannot be deactivated.' }, { status: 403 });
      }
      if (!target.isActive) {
        return NextResponse.json({ error: 'User is already deactivated.' }, { status: 409 });
      }

      await prisma.user.update({ where: { id }, data: { isActive: false } });

      await prisma.adminAction.create({
        data: {
          adminId: adminUser.id,
          actionType: 'USER_DEACTIVATED',
          targetAgencyId: target.agencyId ?? undefined,
          details: { targetUserId: id, targetEmail: target.email, targetName: target.name },
        },
      });

      return NextResponse.json({ message: 'User deactivated successfully.' });
    }

    // ── reactivate ──────────────────────────────────────────────────────────────
    if (action === 'reactivate') {
      if (target.isActive) {
        return NextResponse.json({ error: 'User is already active.' }, { status: 409 });
      }

      await prisma.user.update({ where: { id }, data: { isActive: true } });

      await prisma.adminAction.create({
        data: {
          adminId: adminUser.id,
          actionType: 'USER_REACTIVATED',
          targetAgencyId: target.agencyId ?? undefined,
          details: { targetUserId: id, targetEmail: target.email, targetName: target.name },
        },
      });

      return NextResponse.json({ message: 'User reactivated successfully.' });
    }

    // ── resend_invite ────────────────────────────────────────────────────────────
    if (action === 'resend_invite') {
      if (target.password) {
        return NextResponse.json(
          { error: 'This user has already activated their account. They can use the password reset feature if needed.' },
          { status: 400 }
        );
      }

      await prisma.passwordSetupToken.updateMany({
        where: { userId: id, used: false },
        data: { used: true },
      });

      const { generatePasswordSetupToken, sendStaffInvitationEmail } = await import('@/lib/email');
      const token = await generatePasswordSetupToken(id);

      if (!token) {
        return NextResponse.json({ error: 'Failed to generate invitation link.' }, { status: 500 });
      }

      const agencyName = target.agency?.agencyName ?? 'your agency';
      await sendStaffInvitationEmail(
        { email: target.email, name: target.name },
        token,
        agencyName,
        adminUser.name || adminUser.email
      );

      await prisma.adminAction.create({
        data: {
          adminId: adminUser.id,
          actionType: 'INVITATION_RESENT',
          targetAgencyId: target.agencyId ?? undefined,
          notes: JSON.stringify({ staffEmail: target.email, staffName: target.name }),
        },
      });

      return NextResponse.json({ message: 'Invitation resent successfully.' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[PATCH /api/admin/users/[id]]', error);
    if (error instanceof Error && (error.message.includes('Superadmin') || error.message.includes('Platform admin'))) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Action failed. Please try again.' }, { status: 500 });
  }
}
