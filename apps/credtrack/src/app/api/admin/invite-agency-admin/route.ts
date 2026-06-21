import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const InviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  agencyId: z.string().min(1),
});

/**
 * POST /api/admin/invite-agency-admin
 * Invite an AGENCY_ADMIN for a specific agency.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperadmin();

    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { name, email, agencyId } = parsed.data;

    // Verify agency exists
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    // Check no existing user with this email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Check no existing AGENCY_ADMIN for this agency
    const existingAdmin = await prisma.user.findFirst({
      where: { agencyId, role: 'AGENCY_ADMIN' },
    });
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'This agency already has an admin. Only one AGENCY_ADMIN per agency is allowed.' },
        { status: 409 }
      );
    }

    await prisma.user.create({
      data: {
        email,
        name,
        role: 'AGENCY_ADMIN',
        agencyId,
        isActive: true,
        password: await bcrypt.hash(randomUUID(), 10),
        passwordSetupTokens: {
          create: {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'INVITE_AGENCY_ADMIN',
        targetAgencyId: agencyId,
        details: { email, name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/admin/invite-agency-admin error:', err);
    return NextResponse.json({ error: 'Failed to invite agency admin' }, { status: 500 });
  }
}
