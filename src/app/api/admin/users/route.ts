import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { Prisma, UserRole } from '@prisma/client';

/**
 * GET /api/admin/users
 * List users associated with agencies: AGENCY_ADMIN, AGENCY_USER, and platform-level
 * roles (PLATFORM_ADMIN, SUPERADMIN) when they are linked to an agency.
 * Query params: search, role, status (active|pending), page, limit
 */
export async function GET(req: NextRequest) {
  try {
    await requireSuperadmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const roleParam = searchParams.get('role') || '';
    const statusParam = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
    const skip = (page - 1) * limit;

    // Agency-role filter (respects ?role= param)
    let agencyRoleFilter: UserRole[] = [UserRole.AGENCY_ADMIN, UserRole.AGENCY_USER];
    if (roleParam === 'AGENCY_ADMIN') {
      agencyRoleFilter = [UserRole.AGENCY_ADMIN];
    } else if (roleParam === 'AGENCY_USER') {
      agencyRoleFilter = [UserRole.AGENCY_USER];
    }

    // Base: agency roles OR platform roles that are linked to an agency
    const roleCondition: Prisma.UserWhereInput = {
      OR: [
        { role: { in: agencyRoleFilter } },
        {
          role: { in: [UserRole.PLATFORM_ADMIN, UserRole.SUPERADMIN] },
          agencyId: { not: null },
        },
      ],
    };

    // Compose additional filters with AND
    const andClauses: Prisma.UserWhereInput[] = [roleCondition];

    // Status filter: pending = emailVerified is null, active = emailVerified is not null
    if (statusParam === 'pending') {
      andClauses.push({ emailVerified: null });
    } else if (statusParam === 'active') {
      andClauses.push({ emailVerified: { not: null } });
    }

    // Search by name or email
    if (search) {
      andClauses.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = { AND: andClauses };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          agencyId: true,
          agency: {
            select: { id: true, agencyName: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);

    if (
      error instanceof Error &&
      (error.message.includes('Superadmin') || error.message.includes('Platform admin'))
    ) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
