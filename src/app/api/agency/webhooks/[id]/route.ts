/**
 * GET    /api/agency/webhooks/[id]  — Get subscription details
 * PUT    /api/agency/webhooks/[id]  — Update url, events, or active flag
 * DELETE /api/agency/webhooks/[id]  — Delete subscription
 *
 * Auth: AGENCY_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

const SUPPORTED_EVENTS = [
  'credential.approved',
  'credential.rejected',
  'credential.expiring',
  'credential.expired',
] as const;

const updateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(SUPPORTED_EVENTS)).min(1).optional(),
  active: z.boolean().optional(),
});

async function getSubscription(id: string, agencyId: string) {
  const sub = await (prisma as any).webhookSubscription.findUnique({ where: { id } });
  if (!sub || sub.agencyId !== agencyId) return null;
  return sub;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { agency } = await requireAgencyAdmin();
    const { id } = await params;

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const sub = await getSubscription(id, agency.id);
    if (!sub) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    // Never return secretEncrypted
    const { secretEncrypted: _secret, ...safeFields } = sub;
    return NextResponse.json({ subscription: safeFields });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Webhook get error:', error);
    return NextResponse.json({ error: 'Failed to get webhook' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { agency } = await requireAgencyAdmin();
    const { id } = await params;

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const sub = await getSubscription(id, agency.id);
    if (!sub) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { url, events, active } = parsed.data;
    const updated = await (prisma as any).webhookSubscription.update({
      where: { id },
      data: {
        ...(url !== undefined ? { url } : {}),
        ...(events !== undefined ? { events } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    const { secretEncrypted: _secret, ...safeFields } = updated;
    return NextResponse.json({ subscription: safeFields });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Webhook update error:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { agency } = await requireAgencyAdmin();
    const { id } = await params;

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const sub = await getSubscription(id, agency.id);
    if (!sub) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });

    await (prisma as any).webhookSubscription.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Webhook deleted' });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Webhook delete error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
