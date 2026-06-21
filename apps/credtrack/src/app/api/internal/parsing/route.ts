import { NextRequest, NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/internal/parsing?ids=id1,id2,...
 * Batch job status poll used by DocumentList to track parsing progress.
 * Returns status for up to 20 job IDs belonging to the authenticated org.
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();

    const ids = req.nextUrl.searchParams.get('ids');
    if (!ids) {
      return NextResponse.json({ success: true, jobs: [] });
    }

    const jobIds = ids.split(',').filter(Boolean).slice(0, 20);

    // Verify all requested jobs belong to credentials in this org (cross-tenant guard)
    const jobs = await prisma.credentialParsingJob.findMany({
      where: {
        id: { in: jobIds },
        document: { staffMember: { agencyId: orgId } },
      },
      select: { id: true, status: true, error: true, result: true, attemptCount: true },
    });

    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/internal/parsing error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch job status' }, { status: 500 });
  }
}
