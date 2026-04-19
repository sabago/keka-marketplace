import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { generatePasswordSetupToken, sendStaffInvitationEmail } from '@/lib/email';

/**
 * POST /api/admin/invite-superadmin
 * Platform admin invites a new superadmin
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin();

    const body = await req.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Create the superadmin user (no password yet, no agency)
    const newSuperadmin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        role: UserRole.SUPERADMIN,
        agencyId: null,
        password: null,
        isPrimaryContact: false,
      },
    });

    // Generate password setup token (24 hour expiry)
    const token = await generatePasswordSetupToken(newSuperadmin.id);

    if (!token) {
      await prisma.user.delete({ where: { id: newSuperadmin.id } });
      return NextResponse.json(
        { error: 'Failed to generate invitation link. Please try again.' },
        { status: 500 }
      );
    }

    // Send invitation email (reuse staff invitation email)
    const emailSent = await sendStaffInvitationEmail(
      { email: newSuperadmin.email, name: newSuperadmin.name },
      token,
      'the Platform',
      adminUser.name || adminUser.email
    );

    if (!emailSent) {
      console.error('Failed to send superadmin invitation email to:', email);
    }

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'SUPERADMIN_INVITED',
        notes: JSON.stringify({ superadminEmail: email, superadminName: name }),
      },
    });

    return NextResponse.json(
      {
        message: 'Superadmin invited successfully',
        superadmin: {
          id: newSuperadmin.id,
          email: newSuperadmin.email,
          name: newSuperadmin.name,
          role: newSuperadmin.role,
          createdAt: newSuperadmin.createdAt,
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error inviting superadmin:', error);

    if (error.message?.includes('Platform administrator')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to invite superadmin. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/invite-superadmin
 * Resend invitation to a pending superadmin
 * Body: { userId: string }
 */
export async function PUT(req: NextRequest) {
  try {
    const adminUser = await requirePlatformAdmin();

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const superadmin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, emailVerified: true, password: true },
    });

    if (!superadmin || superadmin.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Superadmin not found' }, { status: 404 });
    }

    if (superadmin.emailVerified || superadmin.password) {
      return NextResponse.json(
        { error: 'This user has already set up their account' },
        { status: 409 }
      );
    }

    const token = await generatePasswordSetupToken(superadmin.id);

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to generate invitation link. Please try again.' },
        { status: 500 }
      );
    }

    const emailSent = await sendStaffInvitationEmail(
      { email: superadmin.email, name: superadmin.name },
      token,
      'the Platform',
      adminUser.name || adminUser.email
    );

    await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'SUPERADMIN_INVITED',
        notes: JSON.stringify({ superadminEmail: superadmin.email, resend: true }),
      },
    });

    return NextResponse.json({ success: true, emailSent });
  } catch (error: any) {
    console.error('Error resending superadmin invitation:', error);

    if (error.message?.includes('Platform administrator')) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to resend invitation. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/invite-superadmin
 * List all superadmins
 */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const superadmins = await prisma.user.findMany({
      where: { role: UserRole.SUPERADMIN },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ superadmins });
  } catch (error: any) {
    console.error('Error fetching superadmins:', error);

    if (error.message?.includes('Platform administrator')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch superadmins' },
      { status: 500 }
    );
  }
}
