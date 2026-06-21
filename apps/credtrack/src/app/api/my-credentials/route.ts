import { NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/my-credentials
 * Returns the StaffMember record + credentials for the currently signed-in AGENCY_USER.
 * Accessible to any authenticated org member (not just admins).
 */
export async function GET() {
  try {
    const { user, orgId } = await requireOrg();

    const [staffMember, documentTypes] = await Promise.all([
      prisma.staffMember.findFirst({
        where: { agencyId: orgId, email: user.email },
        include: {
          credentials: {
            where: { status: { not: 'ARCHIVED' } },
            include: {
              documentType: true,
              parsingJob: { select: { id: true, status: true } },
            },
            orderBy: [{ status: 'desc' }, { expirationDate: 'asc' }],
          },
        },
      }),
      prisma.documentType.findMany({
        where: {
          OR: [{ isGlobal: true }, { agencyId: orgId }],
          isActive: true,
        },
        orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      }),
    ]);

    if (!staffMember) {
      return NextResponse.json({
        staffMember: null,
        documents: [],
        documentTypes: [],
        credentialHistory: {},
      });
    }

    // Credential history (archived) grouped by documentTypeId
    const archived = await prisma.staffCredential.findMany({
      where: { staffMemberId: staffMember.id, status: 'ARCHIVED' },
      include: { documentType: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'desc' },
    });

    const credentialHistory = archived.reduce<Record<string, typeof archived>>((acc, c) => {
      (acc[c.documentTypeId] ??= []).push(c);
      return acc;
    }, {});

    const creds = staffMember.credentials;
    const stats = {
      total:         creds.length,
      active:        creds.filter((c) => c.status === 'ACTIVE' && c.reviewStatus === 'APPROVED').length,
      expiringSoon:  creds.filter((c) => c.status === 'EXPIRING_SOON').length,
      expired:       creds.filter((c) => c.status === 'EXPIRED').length,
      pendingReview: creds.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length,
    };

    const { credentials: _creds, ...record } = staffMember;

    return NextResponse.json({
      record,
      documents: creds,
      credentialHistory,
      stats,
      documentTypes,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/my-credentials error:', err);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}
