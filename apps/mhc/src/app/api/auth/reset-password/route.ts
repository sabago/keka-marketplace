import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const resetSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/**
 * GET /api/auth/reset-password?token=xxx
 * Validate token without resetting (used by page on load)
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required', valid: false }, { status: 400 });
  }

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!tokenRecord || tokenRecord.used) {
    return NextResponse.json({ error: 'Invalid or already-used token', valid: false }, { status: 400 });
  }

  if (new Date() > tokenRecord.expiresAt) {
    return NextResponse.json({ error: 'This link has expired. Please request a new one.', valid: false }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    user: { email: tokenRecord.user.email, name: tokenRecord.user.name },
  });
}

/**
 * POST /api/auth/reset-password
 * Body: { token, password, confirmPassword }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.used) {
      return NextResponse.json({ error: 'Invalid or already-used token' }, { status: 400 });
    }

    if (new Date() > tokenRecord.expiresAt) {
      return NextResponse.json(
        { error: 'This link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in reset-password:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
