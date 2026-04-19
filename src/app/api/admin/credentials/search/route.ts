/**
 * GET /api/admin/credentials/search
 *
 * Advanced credential search with filtering across the platform.
 * Auth: SUPERADMIN or PLATFORM_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { checkRateLimit, adminRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireSuperadmin();

    const rl = await checkRateLimit(adminRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const reviewStatus = searchParams.get('reviewStatus');
    const credentialType = searchParams.get('credentialType');
    const employeeName = searchParams.get('employeeName');
    const agencyId = searchParams.get('agencyId');
    const expirationBefore = searchParams.get('expirationBefore');
    const expirationAfter = searchParams.get('expirationAfter');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    const where: Prisma.StaffCredentialWhereInput = {};

    if (status) where.status = status as any;
    if (reviewStatus) where.reviewStatus = reviewStatus as any;

    if (credentialType) {
      where.documentType = {
        name: { contains: credentialType, mode: 'insensitive' },
      };
    }

    if (employeeName || agencyId) {
      where.staffMember = {
        ...(agencyId ? { agencyId } : {}),
        ...(employeeName
          ? {
              OR: [
                { firstName: { contains: employeeName, mode: 'insensitive' } },
                { lastName: { contains: employeeName, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
    }

    if (expirationBefore || expirationAfter) {
      where.expirationDate = {
        ...(expirationBefore ? { lte: new Date(expirationBefore) } : {}),
        ...(expirationAfter ? { gte: new Date(expirationAfter) } : {}),
      };
    }

    const [credentials, total] = await Promise.all([
      prisma.staffCredential.findMany({
        where,
        include: {
          staffMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true,
              agencyId: true,
            },
          },
          documentType: { select: { id: true, name: true } },
        },
        orderBy: { expirationDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.staffCredential.count({ where }),
    ]);

    return NextResponse.json({
      credentials,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Credential search error:', error);
    return NextResponse.json({ error: 'Failed to search credentials' }, { status: 500 });
  }
}
