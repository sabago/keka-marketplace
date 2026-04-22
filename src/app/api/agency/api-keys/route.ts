/**
 * GET  /api/agency/api-keys  — List API keys (prefix shown, hash never returned)
 * POST /api/agency/api-keys  — Generate a new API key (raw key returned once)
 *
 * Auth: AGENCY_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { hash } from '@/lib/encryption';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const keys = await (prisma as any).apiKey.findMany({
      where: { agencyId: agency.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdBy: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('API key list error:', error);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = hash(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    const apiKey = await (prisma as any).apiKey.create({
      data: {
        agencyId: agency.id,
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        createdBy: user.id,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix,
        createdAt: apiKey.createdAt,
        // Raw key is returned ONCE here — never stored, never returned again
        key: rawKey,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('API key create error:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
