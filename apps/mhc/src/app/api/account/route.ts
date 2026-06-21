import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { compare, hash } from 'bcryptjs';

/**
 * GET /api/account
 * Returns the logged-in user's own profile.
 */
export async function GET() {
  try {
    const { user } = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agencyId: true,
        createdAt: true,
        agency: { select: { agencyName: true } },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error('[GET /api/account]', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PATCH /api/account
 * Update the logged-in user's own profile.
 * Accepts { name } to update display name.
 * Accepts { currentPassword, newPassword } to change password.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await req.json();

    // ── Change name ────────────────────────────────────────────────────────────
    if ('name' in body) {
      const name = (body.name as string)?.trim();
      if (!name || name.length < 1) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });

      return NextResponse.json({ message: 'Name updated successfully.' });
    }

    // ── Change password ────────────────────────────────────────────────────────
    if ('currentPassword' in body && 'newPassword' in body) {
      const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string };

      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Both current and new passwords are required.' }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });

      if (!dbUser?.password) {
        return NextResponse.json({ error: 'No password set on this account. Use the password setup link.' }, { status: 400 });
      }

      const valid = await compare(currentPassword, dbUser.password);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      const hashed = await hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });

      return NextResponse.json({ message: 'Password updated successfully.' });
    }

    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  } catch (error) {
    console.error('[PATCH /api/account]', error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
