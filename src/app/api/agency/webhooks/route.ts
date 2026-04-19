/**
 * GET  /api/agency/webhooks  — List webhook subscriptions
 * POST /api/agency/webhooks  — Create a new webhook subscription
 *
 * Auth: AGENCY_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { encrypt } from '@/lib/encryption';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

const SUPPORTED_EVENTS = [
  'credential.approved',
  'credential.rejected',
  'credential.expiring',
  'credential.expired',
] as const;

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
  secret: z.string().min(16).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const subscriptions = await (prisma as any).webhookSubscription.findMany({
      where: { agencyId: agency.id },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // secretEncrypted is intentionally omitted
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ subscriptions });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Webhook list error:', error);
    return NextResponse.json({ error: 'Failed to list webhooks' }, { status: 500 });
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

    const rawSecret = parsed.data.secret ?? crypto.randomBytes(24).toString('hex');
    const secretEncrypted = encrypt(rawSecret);

    const subscription = await (prisma as any).webhookSubscription.create({
      data: {
        agencyId: agency.id,
        url: parsed.data.url,
        events: parsed.data.events,
        secretEncrypted,
        active: true,
        createdBy: user.id,
      },
    });

    return NextResponse.json(
      {
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        active: subscription.active,
        createdAt: subscription.createdAt,
        // Secret returned ONCE — never stored in plaintext, never returned again
        secret: rawSecret,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Webhook create error:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}
