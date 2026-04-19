import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const setPasswordSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/**
 * POST /api/auth/set-password
 *
 * Validates token and sets password for approved user
 * Body: { token: string, password: string, confirmPassword: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = setPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Find the token
    const tokenRecord = await prisma.passwordSetupToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            agency: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (tokenRecord.used) {
      return NextResponse.json(
        { error: 'This token has already been used' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      return NextResponse.json(
        { error: 'This token has expired. Please contact support for a new invitation.' },
        { status: 400 }
      );
    }

    // Check if user's agency is approved (skip for platform/superadmins who may have no agency)
    const isAdminRole = tokenRecord.user.role === 'PLATFORM_ADMIN' || tokenRecord.user.role === 'SUPERADMIN';
    if (!isAdminRole && tokenRecord.user.agency?.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Your agency must be approved before you can set a password' },
        { status: 403 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = tokenRecord.user;

    // Update user password and mark token as used in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user with new password and mark email as verified
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });

      // Mark token as used
      await tx.passwordSetupToken.update({
        where: { id: tokenRecord.id },
        data: { used: true },
      });

      // Auto-create staff credential record for AGENCY_USER members only.
      // Admin roles (AGENCY_ADMIN, PLATFORM_ADMIN, SUPERADMIN) manage staff — they are not staff.
      if (user.agencyId && user.role === 'AGENCY_USER') {
        const existingRecord = await tx.staffMember.findFirst({
          where: { userId: tokenRecord.userId },
        });
        if (!existingRecord) {
          const nameParts = (user.name || '').trim().split(/\s+/);
          await tx.staffMember.create({
            data: {
              agencyId: user.agencyId,
              userId: tokenRecord.userId,
              firstName: nameParts[0] || user.name || 'Staff',
              lastName: nameParts.slice(1).join(' ') || 'Member',
              email: user.email,
              status: 'ACTIVE',
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      user: {
        email: tokenRecord.user.email,
        name: tokenRecord.user.name,
      },
    });

  } catch (error) {
    console.error('Error setting password:', error);

    return NextResponse.json(
      { error: 'Failed to set password. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/set-password?token=xxx
 *
 * Validates token without setting password (for pre-validation)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the token
    const tokenRecord = await prisma.passwordSetupToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            role: true,
            agency: {
              select: {
                agencyName: true,
                approvalStatus: true,
              },
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid token', valid: false },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (tokenRecord.used) {
      return NextResponse.json(
        { error: 'This token has already been used', valid: false },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      return NextResponse.json(
        { error: 'This token has expired', valid: false },
        { status: 400 }
      );
    }

    // Check if user's agency is approved (skip for platform/superadmins who may have no agency)
    const isAdminRole = tokenRecord.user.role === 'PLATFORM_ADMIN' || tokenRecord.user.role === 'SUPERADMIN';
    if (!isAdminRole && tokenRecord.user.agency?.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Agency not approved', valid: false },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: tokenRecord.user.email,
        name: tokenRecord.user.name,
        agency: tokenRecord.user.agency?.agencyName,
      },
    });

  } catch (error) {
    console.error('Error validating token:', error);

    return NextResponse.json(
      { error: 'Failed to validate token', valid: false },
      { status: 500 }
    );
  }
}
