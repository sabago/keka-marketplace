import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/staff/[id]
 * Get a single staff member with their credentials.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgAdmin();
    const { id } = await params;

    const [record, documentTypes] = await Promise.all([
      prisma.staffMember.findFirst({
        where: { id, agencyId: orgId },
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

    if (!record) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Credential history (archived) grouped by documentTypeId
    const archived = await prisma.staffCredential.findMany({
      where: { staffMemberId: id, status: 'ARCHIVED' },
      include: { documentType: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'desc' },
    });

    const credentialHistory = archived.reduce<Record<string, typeof archived>>((acc, c) => {
      (acc[c.documentTypeId] ??= []).push(c);
      return acc;
    }, {});

    const creds = record.credentials;
    const stats = {
      total:        creds.length,
      active:       creds.filter((c) => c.status === 'ACTIVE' && c.reviewStatus === 'APPROVED').length,
      expiringSoon: creds.filter((c) => c.status === 'EXPIRING_SOON').length,
      expired:      creds.filter((c) => c.status === 'EXPIRED').length,
      pendingReview: creds.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length,
    };

    return NextResponse.json({ record, documents: creds, credentialHistory, stats, documentTypes });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/staff/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 });
  }
}

/**
 * PATCH /api/staff/[id]
 * Update a staff member's details.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgAdmin();
    const { id } = await params;

    const existing = await prisma.staffMember.findFirst({ where: { id, agencyId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const body = await req.json();
    const { firstName, lastName, position, department, hireDate, status } = body;

    const data: Record<string, unknown> = {};
    if (firstName  !== undefined) data.firstName  = String(firstName).trim();
    if (lastName   !== undefined) data.lastName   = String(lastName).trim();
    if (position   !== undefined) data.position   = position ? String(position).trim() : null;
    if (department !== undefined) data.department = department ? String(department).trim() : null;
    if (hireDate   !== undefined) data.hireDate   = hireDate ? new Date(hireDate) : null;
    if (status     !== undefined) data.status     = status;

    const record = await prisma.staffMember.update({ where: { id }, data });
    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('PATCH /api/staff/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}
