/**
 * DELETE /api/agency/api-keys/[id]  — Revoke (soft-delete) an API key
 *
 * Auth: AGENCY_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { agency } = await requireAgencyAdmin();
    const { id: paramId } = await params;

    const rl = await checkRateLimit(agencyRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const key = await (prisma as any).apiKey.findUnique({ where: { id: paramId } });
    if (!key || key.agencyId !== agency.id) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (key.revokedAt) {
      return NextResponse.json({ error: 'API key is already revoked' }, { status: 400 });
    }

    await (prisma as any).apiKey.update({
      where: { id: paramId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('API key revoke error:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
