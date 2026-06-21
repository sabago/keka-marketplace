import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const InviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

/**
 * POST /api/admin/invite-superadmin
 * Invite a new SUPERADMIN user.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requirePlatformAdmin();

    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { name, email } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role: 'SUPERADMIN',
        agencyId: null,
        isActive: true,
        password: await bcrypt.hash(randomUUID(), 10),
        passwordSetupTokens: {
          create: {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        passwordSetupTokens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'INVITE_SUPERADMIN',
        details: { email, name },
      },
    });

    // Email sending skipped — no sendStaffInvitationEmail available in credtrack
    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/admin/invite-superadmin error:', err);
    return NextResponse.json({ error: 'Failed to invite superadmin' }, { status: 500 });
  }
}

/**
 * GET /api/admin/invite-superadmin
 * List all SUPERADMIN users.
 */
export async function GET(_req: NextRequest) {
  try {
    await requirePlatformAdmin();

    const superadmins = await prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        passwordSetupTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { used: true, expiresAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ superadmins });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch superadmins' }, { status: 500 });
  }
}
