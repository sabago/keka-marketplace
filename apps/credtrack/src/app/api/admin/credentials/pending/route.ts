import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@mhc/db';

/**
 * GET /api/admin/credentials/pending
 * AGENCY_ADMIN: credentials for their agency only.
 * PLATFORM_ADMIN / SUPERADMIN: all pending credentials (optional ?agencyId= filter).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const role = session.user.role;
    const { searchParams } = new URL(req.url);
    const agencyIdFilter = searchParams.get('agencyId') ?? undefined;

    let agencyId: string | undefined;

    if (role === 'PLATFORM_ADMIN' || role === 'SUPERADMIN') {
      // Cross-agency access — optionally filtered
      await requireSuperadmin();
      agencyId = agencyIdFilter;
    } else {
      // Agency-scoped access
      const result = await requireOrgAdmin();
      agencyId = result.orgId;
    }

    const where: Record<string, unknown> = {
      reviewStatus: 'PENDING_REVIEW',
    };

    if (agencyId) {
      where.staffMember = { agencyId };
    }

    const credentials = await prisma.staffCredential.findMany({
      where,
      orderBy: [{ aiConfidence: 'asc' }, { createdAt: 'desc' }],
      include: {
        documentType: { select: { id: true, name: true } },
        staffMember: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            agency: { select: { id: true, agencyName: true } },
          },
        },
      },
    });

    return NextResponse.json({ credentials });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch pending credentials' }, { status: 500 });
  }
}
