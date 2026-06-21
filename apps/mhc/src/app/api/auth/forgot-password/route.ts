import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Always returns 200 to prevent email enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // If no user found, still return success to prevent enumeration
    if (user) {
      // Invalidate any existing unused reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      // Create new token — expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const tokenRecord = await prisma.passwordResetToken.create({
        data: { userId: user.id, expiresAt, used: false },
      });

      await sendPasswordResetEmail({ email: user.email, name: user.name }, tokenRecord.token);
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
