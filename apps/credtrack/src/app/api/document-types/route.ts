import { NextRequest, NextResponse } from 'next/server';
import { requireOrg, requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma, Prisma } from '@mhc/db';
import { z } from 'zod';

/**
 * GET /api/document-types
 * Returns all active document types available to this org (global + org-specific).
 */
export async function GET() {
  try {
    const { orgId } = await requireOrg();

    const documentTypes = await prisma.documentType.findMany({
      where: {
        OR: [{ isGlobal: true }, { agencyId: orgId }],
        isActive: true,
      },
      orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ documentTypes });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/document-types error:', err);
    return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 });
  }
}

const CreateDocumentTypeSchema = z.object({
  name: z.string().min(1).max(200),
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
    .default('OTHER'),
  expirationDays: z.number().int().positive().nullable().optional(),
  reminderDays: z.array(z.number().int().positive()).default([30, 7]),
  isRequired: z.boolean().default(false),
  requiresFrontBack: z.boolean().default(false),
  allowsMultiPage: z.boolean().default(true),
  minFiles: z.number().int().min(1).max(20).default(1),
  maxFiles: z.number().int().min(1).max(20).default(10),
  recheckCadenceDays: z.number().int().positive().nullable().optional(),
  aiParsingEnabled: z.boolean().default(true),
  customFields: z.record(z.string(), z.string()).nullable().optional(),
});

/**
 * POST /api/document-types
 * Create a new agency-specific document type. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();

    const body = await req.json();
    const parsed = CreateDocumentTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid document type data.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { minFiles, maxFiles, requiresFrontBack, customFields, ...rest } = parsed.data;
    const effectiveMin = requiresFrontBack ? 2 : minFiles;
    const effectiveMax = requiresFrontBack ? 2 : maxFiles;

    if (effectiveMin > effectiveMax) {
      return NextResponse.json(
        { error: 'Min files cannot exceed max files.' },
        { status: 400 }
      );
    }

    const documentType = await prisma.documentType.create({
      data: {
        ...rest,
        requiresFrontBack,
        minFiles: effectiveMin,
        maxFiles: effectiveMax,
        agencyId: orgId,
        isGlobal: false,
        isActive: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customFields: (customFields ?? Prisma.JsonNull) as any,
      },
    });

    return NextResponse.json({ documentType }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/document-types error:', err);
    return NextResponse.json({ error: 'Failed to create document type.' }, { status: 500 });
  }
}
