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

const CreateDocTypeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().trim().optional().nullable(),
  category: z.enum(DOCUMENT_CATEGORIES),
  expirationDays: z.number().int().positive().optional().nullable(),
  reminderDays: z.array(z.number().int().positive()).default([30, 7]),
  isRequired: z.boolean().default(false),
  requiresFrontBack: z.boolean().default(false),
  allowsMultiPage: z.boolean().default(true),
  minFiles: z.number().int().min(1).default(1),
  maxFiles: z.number().int().min(1).max(20).default(10),
  recheckCadenceDays: z.number().int().positive().optional().nullable(),
  aiParsingEnabled: z.boolean().default(true),
  customFields: z.record(z.string(), z.string()).optional().nullable(),
  isGlobal: z.boolean().default(true),
  agencyId: z.string().optional().nullable(),
});

/**
 * GET /api/admin/document-types
 * List all document types (global + all agency types).
 * Requires PLATFORM_ADMIN or SUPERADMIN.
 */
export async function GET() {
  try {
    const user = await requireSuperadmin();

    const rl = await checkRateLimit(adminRateLimit, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const documentTypes = await prisma.documentType.findMany({
      orderBy: [
        { isGlobal: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { credentials: true },
        },
      },
    });

    const globalTypes = documentTypes.filter((dt) => dt.isGlobal);
    const agencyTypes = documentTypes.filter((dt) => !dt.isGlobal);

    return NextResponse.json({ documentTypes, globalTypes, agencyTypes }, { status: 200 });
  } catch (error: any) {
    if (error.message?.includes('required') || error.message?.includes('access')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching admin document types:', error);
    return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 });
  }
}

/**
 * POST /api/admin/document-types
 * Create a new document type (global or agency-specific).
 * Requires PLATFORM_ADMIN or SUPERADMIN.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSuperadmin();

    const rl = await checkRateLimit(adminRateLimit, user.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = CreateDocTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for name collision
    const existing = data.isGlobal
      ? await prisma.documentType.findFirst({ where: { name: data.name, isGlobal: true } })
      : data.agencyId
        ? await prisma.documentType.findFirst({ where: { name: data.name, agencyId: data.agencyId } })
        : null;

    if (existing) {
      return NextResponse.json(
        { error: 'A document type with this name already exists' },
        { status: 400 }
      );
    }

    const documentType = await prisma.documentType.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        expirationDays: data.expirationDays ?? null,
        reminderDays: data.reminderDays,
        isRequired: data.isRequired,
        requiresFrontBack: data.requiresFrontBack,
        allowsMultiPage: data.allowsMultiPage,
        minFiles: data.minFiles,
        maxFiles: data.maxFiles,
        recheckCadenceDays: data.recheckCadenceDays ?? null,
        aiParsingEnabled: data.aiParsingEnabled,
        customFields: data.customFields ?? Prisma.DbNull,
        isGlobal: data.isGlobal,
        agencyId: data.agencyId ?? null,
        isActive: true,
      },
    });

    await logAuditEvent('document_type_created', {
      userId: user.id,
      targetId: documentType.id,
      targetType: 'DocumentType',
      metadata: {
        name: documentType.name,
        category: documentType.category,
        isGlobal: documentType.isGlobal,
      },
    });

    return NextResponse.json(
      { message: 'Document type created successfully', documentType },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('required') || error.message?.includes('access')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error creating admin document type:', error);
    return NextResponse.json({ error: 'Failed to create document type' }, { status: 500 });
  }
}
