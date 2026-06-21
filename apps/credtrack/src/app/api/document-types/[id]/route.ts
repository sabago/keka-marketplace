import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma, Prisma } from '@mhc/db';
import { z } from 'zod';

const UpdateDocumentTypeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z
    .enum([
      'LICENSE',
      'BACKGROUND_CHECK',
      'TRAINING',
      'HR',
      'ID',
      'INSURANCE',
      'VACCINATION',
      'COMPETENCY',
      'OTHER',
    ])
    .optional(),
  expirationDays: z.number().int().positive().nullable().optional(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  isRequired: z.boolean().optional(),
  requiresFrontBack: z.boolean().optional(),
  allowsMultiPage: z.boolean().optional(),
  minFiles: z.number().int().min(1).max(20).optional(),
  maxFiles: z.number().int().min(1).max(20).optional(),
  recheckCadenceDays: z.number().int().positive().nullable().optional(),
  aiParsingEnabled: z.boolean().optional(),
  customFields: z.record(z.string(), z.string()).nullable().optional(),
});

/**
 * PUT /api/document-types/[id]
 * Update an agency-specific document type. Admin only.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgAdmin();
    const { id } = await params;

    // Verify the document type belongs to this org (not global)
    const existing = await prisma.documentType.findUnique({
      where: { id },
      select: { agencyId: true, isGlobal: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found.' }, { status: 404 });
    }

    if (existing.isGlobal || existing.agencyId !== orgId) {
      return NextResponse.json(
        { error: 'You cannot edit this document type.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateDocumentTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid document type data.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customFields, ...rest } = parsed.data;

    // Enforce front/back min/max constraint
    if (rest.requiresFrontBack) {
      rest.minFiles = 2;
      rest.maxFiles = 2;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...rest,
      ...(customFields !== undefined
        ? { customFields: customFields === null ? Prisma.JsonNull : customFields }
        : {}),
    };

    const updated = await prisma.documentType.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ documentType: updated });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('PUT /api/document-types/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update document type.' }, { status: 500 });
  }
}

/**
 * DELETE /api/document-types/[id]
 * Soft-delete (deactivate) an agency-specific document type. Admin only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgAdmin();
    const { id } = await params;

    const existing = await prisma.documentType.findUnique({
      where: { id },
      select: { agencyId: true, isGlobal: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found.' }, { status: 404 });
    }

    if (existing.isGlobal || existing.agencyId !== orgId) {
      return NextResponse.json(
        { error: 'You cannot delete this document type.' },
        { status: 403 }
      );
    }

    await prisma.documentType.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('DELETE /api/document-types/[id] error:', err);
    return NextResponse.json({ error: 'Failed to disable document type.' }, { status: 500 });
  }
}
