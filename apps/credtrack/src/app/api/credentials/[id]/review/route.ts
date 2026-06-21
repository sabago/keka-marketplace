import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';

const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'needs_correction', 'edit']),
  notes:  z.string().optional(),
  corrections: z.object({
    issuer:          z.string().optional(),
    licenseNumber:   z.string().optional(),
    issueDate:       z.string().optional(),
    expirationDate:  z.string().optional(),
    verificationUrl: z.string().optional(),
  }).optional(),
});

/**
 * GET /api/credentials/[id]/review
 * Fetch credential detail for the review modal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgAdmin();
    const { id } = await params;

    const credential = await prisma.staffCredential.findFirst({
      where: { id, staffMember: { agencyId: orgId } },
      include: {
        documentType: true,
        staffMember:  { select: { firstName: true, lastName: true } },
        files:        { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const parsingJob = await prisma.credentialParsingJob.findFirst({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ credential, parsingJob: parsingJob ?? null });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch credential' }, { status: 500 });
  }
}

/**
 * POST /api/credentials/[id]/review
 * Approve, reject, or request correction on a credential.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, user } = await requireOrgAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    // Verify credential belongs to this org
    const credential = await prisma.staffCredential.findFirst({
      where: { id, staffMember: { agencyId: orgId } },
    });
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const { action, notes, corrections } = parsed.data;

    const reviewStatusMap = {
      approve:          'APPROVED',
      reject:           'REJECTED',
      needs_correction: 'NEEDS_CORRECTION',
      edit:             'APPROVED', // edit = correct fields + approve
    } as const;

    const updateData: Record<string, unknown> = {
      reviewStatus: reviewStatusMap[action],
      reviewedBy:   user.id,
      reviewedAt:   new Date(),
      reviewNotes:  notes ?? null,
    };

    if (corrections) {
      if (corrections.issuer)          updateData.issuer          = corrections.issuer;
      if (corrections.licenseNumber)   updateData.licenseNumber   = corrections.licenseNumber;
      if (corrections.verificationUrl) updateData.verificationUrl = corrections.verificationUrl;
      if (corrections.issueDate)       updateData.issueDate       = new Date(corrections.issueDate);
      if (corrections.expirationDate)  updateData.expirationDate  = new Date(corrections.expirationDate);
    }

    const updated = await prisma.staffCredential.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ credential: updated });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/credentials/[id]/review error:', err);
    return NextResponse.json({ error: 'Review failed' }, { status: 500 });
  }
}
