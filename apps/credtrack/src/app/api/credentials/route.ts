import { NextRequest, NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/credentials
 * List credentials for the org with optional status filter.
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    const status     = searchParams.get('status') ?? undefined;
    const staffId    = searchParams.get('staffId') ?? undefined;

    const where: Record<string, unknown> = {
      staffMember: { agencyId: orgId },
    };

    if (status) {
      // Support comma-separated status values, e.g. ?status=EXPIRED,EXPIRING_SOON
      const statuses = status.split(',').map((s) => s.trim().toUpperCase());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    } else {
      where.status = { not: 'ARCHIVED' };
    }

    if (staffId) {
      where.staffMemberId = staffId;
    }

    const credentials = await prisma.staffCredential.findMany({
      where,
      include: {
        documentType: { select: { id: true, name: true, category: true } },
        staffMember:  { select: { id: true, firstName: true, lastName: true } },
        parsingJob:   { select: { id: true, status: true } },
      },
      orderBy: [{ status: 'desc' }, { expirationDate: 'asc' }],
      take: 500, // Safety cap — paginate when needed
    });

    // Summary stats
    const all = credentials;
    const stats = {
      total:         all.length,
      active:        all.filter((c) => c.status === 'ACTIVE'        && c.reviewStatus === 'APPROVED').length,
      expiringSoon:  all.filter((c) => c.status === 'EXPIRING_SOON').length,
      expired:       all.filter((c) => c.status === 'EXPIRED').length,
      pendingReview: all.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length,
    };

    return NextResponse.json({ credentials, stats });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/credentials error:', err);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}
