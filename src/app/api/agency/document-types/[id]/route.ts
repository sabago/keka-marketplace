import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { agencyRateLimit, checkRateLimit } from '@/lib/rateLimit';
import { logAuditEvent } from '@/lib/auditLog';

const DOCUMENT_CATEGORIES = [
  'LICENSE',
  'BACKGROUND_CHECK',
  'TRAINING',
  'HR',
  'ID',
  'INSURANCE',
  'VACCINATION',
  'COMPETENCY',
  'OTHER',
] as const;

const UpdateAgencyDocTypeSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().trim().optional().nullable(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  expirationDays: z.number().int().positive().optional().nullable(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  isRequired: z.boolean().optional(),
  requiresFrontBack: z.boolean().optional(),
  allowsMultiPage: z.boolean().optional(),
  minFiles: z.number().int().min(1).optional(),
  maxFiles: z.number().int().min(1).max(20).optional(),
  recheckCadenceDays: z.number().int().positive().optional().nullable(),
  aiParsingEnabled: z.boolean().optional(),
  customFields: z.record(z.string(), z.string()).optional().nullable(),
});

/**
 * PUT /api/agency/document-types/:id
 * Update an agency-specific document type (cannot edit global types).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const { id: documentTypeId } = await params;

    const rl = await checkRateLimit(agencyRateLimit, agency.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify document type exists and belongs to this agency
    const existing = await prisma.documentType.findFirst({
      where: { id: documentTypeId, agencyId: agency.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    // Cannot edit global document types through this route
    if (existing.isGlobal) {
      return NextResponse.json(
        { error: 'Cannot edit system-wide document types' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateAgencyDocTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate name within agency if name is changing
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.documentType.findFirst({
        where: {
          agencyId: agency.id,
          name: data.name,
          id: { not: documentTypeId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A document type with this name already exists' },
          { status: 400 }
        );
      }
    }

    const documentType = await prisma.documentType.update({
      where: { id: documentTypeId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.expirationDays !== undefined && { expirationDays: data.expirationDays }),
        ...(data.reminderDays !== undefined && {
          reminderDays: data.reminderDays.sort((a, b) => b - a),
        }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.requiresFrontBack !== undefined && { requiresFrontBack: data.requiresFrontBack }),
        ...(data.allowsMultiPage !== undefined && { allowsMultiPage: data.allowsMultiPage }),
        ...(data.minFiles !== undefined && { minFiles: data.minFiles }),
        ...(data.maxFiles !== undefined && { maxFiles: data.maxFiles }),
        ...(data.recheckCadenceDays !== undefined && { recheckCadenceDays: data.recheckCadenceDays }),
        ...(data.aiParsingEnabled !== undefined && { aiParsingEnabled: data.aiParsingEnabled }),
        ...(data.customFields !== undefined && { customFields: data.customFields ?? Prisma.DbNull }),
      },
    });

    await logAuditEvent('document_type_updated', {
      userId: user.id,
      agencyId: agency.id,
      targetId: documentTypeId,
      targetType: 'DocumentType',
      changes: {
        before: { name: existing.name, category: existing.category },
        after: { name: documentType.name, category: documentType.category },
      },
    });

    return NextResponse.json(
      { message: 'Document type updated successfully', documentType },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error updating document type:', error);
    return NextResponse.json({ error: 'Failed to update document type' }, { status: 500 });
  }
}

/**
 * DELETE /api/agency/document-types/:id
 * Soft-disable an agency-specific document type (sets isActive = false).
 * Never hard-deletes — existing credentials may still reference this type.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const { id: documentTypeId } = await params;

    const rl = await checkRateLimit(agencyRateLimit, agency.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify document type exists and belongs to this agency
    const existing = await prisma.documentType.findFirst({
      where: { id: documentTypeId, agencyId: agency.id },
      include: { _count: { select: { credentials: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    if (existing.isGlobal) {
      return NextResponse.json(
        { error: 'Cannot disable system-wide document types' },
        { status: 403 }
      );
    }

    // Soft-disable: safe regardless of in-use count
    const documentType = await prisma.documentType.update({
      where: { id: documentTypeId },
      data: { isActive: false },
    });

    await logAuditEvent('document_type_disabled', {
      userId: user.id,
      agencyId: agency.id,
      targetId: documentTypeId,
      targetType: 'DocumentType',
      metadata: {
        name: existing.name,
        credentialsUsing: existing._count.credentials,
      },
    });

    return NextResponse.json(
      {
        message: 'Document type disabled successfully',
        documentType,
        credentialsUsing: existing._count.credentials,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error disabling document type:', error);
    return NextResponse.json({ error: 'Failed to disable document type' }, { status: 500 });
  }
}
