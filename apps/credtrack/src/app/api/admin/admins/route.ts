import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/admin/admins
 * PLATFORM_ADMIN: returns SUPERADMIN + AGENCY_ADMIN users.
 * SUPERADMIN: returns only AGENCY_ADMIN users.
 */
export async function GET(_req: NextRequest) {
  try {
    const { user } = await requireSuperadmin();

    const roles =
      user.role === 'PLATFORM_ADMIN'
        ? ['SUPERADMIN', 'AGENCY_ADMIN']
        : ['AGENCY_ADMIN'];

    const admins = await prisma.user.findMany({
      where: { role: { in: roles as ('SUPERADMIN' | 'AGENCY_ADMIN')[] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        agency: { select: { id: true, agencyName: true, approvalStatus: true } },
        passwordSetupTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { used: true, expiresAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ admins });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}
