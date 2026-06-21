import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';

/**
 * GET /api/staff
 * List all StaffMember records for the org (CredTrack admins only).
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;

    const where: Record<string, unknown> = { agencyId: orgId, status: 'ACTIVE' };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { position:  { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.staffMember.findMany({
      where,
      include: {
        credentials: {
          select: { id: true, status: true, reviewStatus: true },
          where: { status: { not: 'ARCHIVED' } },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName:  r.lastName,
        position:  r.position,
        department: r.department,
        email:     r.email,
        status:    r.status,
        hireDate:  r.hireDate,
        credentialCount: r.credentials.length,
        expiringSoon: r.credentials.filter((c) => c.status === 'EXPIRING_SOON').length,
        expired:      r.credentials.filter((c) => c.status === 'EXPIRED').length,
        pendingReview: r.credentials.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length,
      })),
      total: records.length,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/staff error:', err);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

const CreateStaffSchema = z.object({
  firstName:  z.string().min(1),
  lastName:   z.string().min(1),
  email:      z.string().email(),
  position:   z.string().optional(),
  department: z.string().optional(),
  hireDate:   z.string().optional(),
});

/**
 * POST /api/staff
 * Create a new StaffMember directly (no linked User account needed).
 * CredTrack tracks credentials for staff members who are not platform users.
 */
export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();

    const body = await req.json();
    const parsed = CreateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { firstName, lastName, email, position, department, hireDate } = parsed.data;

    // Prevent duplicate email within same org
    const existing = await prisma.staffMember.findFirst({
      where: { agencyId: orgId, email },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A staff member with this email already exists' },
        { status: 409 }
      );
    }

    const record = await prisma.staffMember.create({
      data: {
        agencyId:   orgId,
        firstName:  firstName.trim(),
        lastName:   lastName.trim(),
        email:      email.toLowerCase().trim(),
        position:   position?.trim() ?? null,
        department: department?.trim() ?? null,
        hireDate:   hireDate ? new Date(hireDate) : null,
        status:     'ACTIVE',
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/staff error:', err);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}
