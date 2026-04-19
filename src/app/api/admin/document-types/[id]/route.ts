import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireSuperadmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { adminRateLimit, checkRateLimit } from '@/lib/rateLimit';
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

const UpdateDocTypeSchema = z.object({
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
  isGlobal: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/document-types/:id
 * Fetch a single document type.
 * Requires PLATFORM_ADMIN or SUPERADMIN.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperadmin();
    const { id } = await params;

    const rl = await checkRateLimit(adminRateLimit, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const documentType = await prisma.documentType.findUnique({
      where: { id },
      include: { _count: { select: { credentials: true } } },
    });

    if (!documentType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    return NextResponse.json({ documentType }, { status: 200 });
  } catch (error: any) {
    if (error.message?.includes('required') || error.message?.includes('access')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching document type:', error);
    return NextResponse.json({ error: 'Failed to fetch document type' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/document-types/:id
 * Update any document type (global or agency).
 * Requires PLATFORM_ADMIN or SUPERADMIN.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperadmin();
    const { id } = await params;

    const rl = await checkRateLimit(adminRateLimit, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const existing = await prisma.documentType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateDocTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for name collision if name is being changed
    if (data.name && data.name !== existing.name) {
      const collision = existing.isGlobal
        ? await prisma.documentType.findFirst({
            where: { name: data.name, isGlobal: true, id: { not: id } },
          })
        : existing.agencyId
          ? await prisma.documentType.findFirst({
              where: { name: data.name, agencyId: existing.agencyId, id: { not: id } },
            })
          : null;

      if (collision) {
        return NextResponse.json(
          { error: 'A document type with this name already exists' },
          { status: 400 }
        );
      }
    }

    const documentType = await prisma.documentType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.expirationDays !== undefined && { expirationDays: data.expirationDays }),
        ...(data.reminderDays !== undefined && { reminderDays: data.reminderDays }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.requiresFrontBack !== undefined && { requiresFrontBack: data.requiresFrontBack }),
        ...(data.allowsMultiPage !== undefined && { allowsMultiPage: data.allowsMultiPage }),
        ...(data.minFiles !== undefined && { minFiles: data.minFiles }),
        ...(data.maxFiles !== undefined && { maxFiles: data.maxFiles }),
        ...(data.recheckCadenceDays !== undefined && { recheckCadenceDays: data.recheckCadenceDays }),
        ...(data.aiParsingEnabled !== undefined && { aiParsingEnabled: data.aiParsingEnabled }),
        ...(data.customFields !== undefined && { customFields: data.customFields ?? Prisma.DbNull }),
        ...(data.isGlobal !== undefined && { isGlobal: data.isGlobal }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await logAuditEvent('document_type_updated', {
      userId: user.id,
      targetId: id,
      targetType: 'DocumentType',
      changes: {
        before: { name: existing.name, category: existing.category, isActive: existing.isActive },
        after: { name: documentType.name, category: documentType.category, isActive: documentType.isActive },
      },
    });

    return NextResponse.json(
      { message: 'Document type updated successfully', documentType },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message?.includes('required') || error.message?.includes('access')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error updating document type:', error);
    return NextResponse.json({ error: 'Failed to update document type' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/document-types/:id
 * Soft-disable a document type (sets isActive = false).
 * Never hard-deletes — existing credentials may still reference this type.
 * Requires PLATFORM_ADMIN or SUPERADMIN.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperadmin();
    const { id } = await params;

    const rl = await checkRateLimit(adminRateLimit, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const existing = await prisma.documentType.findUnique({
      where: { id },
      include: { _count: { select: { credentials: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    if (!existing.isActive) {
      return NextResponse.json({ error: 'Document type is already disabled' }, { status: 400 });
    }

    const documentType = await prisma.documentType.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent('document_type_disabled', {
      userId: user.id,
      targetId: id,
      targetType: 'DocumentType',
      metadata: {
        name: existing.name,
        category: existing.category,
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
    if (error.message?.includes('required') || error.message?.includes('access')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error disabling document type:', error);
    return NextResponse.json({ error: 'Failed to disable document type' }, { status: 500 });
  }
}
