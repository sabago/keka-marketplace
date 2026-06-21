import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/internal/agency-status?id=<agencyId>
 *
 * Internal endpoint called by middleware to check agency approval status.
 * Only accessible with the internal secret header.
 */
export async function GET(req: NextRequest) {
  // Verify internal secret to prevent external access
  const secret = req.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const agencyId = req.nextUrl.searchParams.get('id');
  if (!agencyId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      approvalStatus: true,
      rejectionReason: true,
      agencyName: true,
    },
  });

  if (!agency) {
    return NextResponse.json({ agency: null });
  }

  return NextResponse.json({ agency });
}
