import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireAgencyAdmin, requireAgency } from '@/lib/authHelpers';
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

const CreateAgencyDocTypeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().trim().optional().nullable(),
  category: z.enum(DOCUMENT_CATEGORIES).default('OTHER'),
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
});

/**
 * GET /api/agency/document-types
 * List all document types (global + agency-specific).
 */
export async function GET() {
  try {
    const { agency } = await requireAgency();

    const rl = await checkRateLimit(agencyRateLimit, agency.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const documentTypes = await prisma.documentType.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { agencyId: agency.id },
        ],
        isActive: true,
      },
      orderBy: [
        { isGlobal: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    const globalTypes = documentTypes.filter((dt) => dt.isGlobal);
    const customTypes = documentTypes.filter((dt) => !dt.isGlobal);

    return NextResponse.json(
      { documentTypes, globalTypes, customTypes },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error fetching document types:', error);
    return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 });
  }
}

/**
 * POST /api/agency/document-types
 * Create agency-specific document type.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();

    const rl = await checkRateLimit(agencyRateLimit, agency.id);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = CreateAgencyDocTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate name in agency
    const existing = await prisma.documentType.findFirst({
      where: { agencyId: agency.id, name: data.name },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A document type with this name already exists for your agency' },
        { status: 400 }
      );
    }

    const documentType = await prisma.documentType.create({
      data: {
        agencyId: agency.id,
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
        isGlobal: false,
        isActive: true,
      },
    });

    await logAuditEvent('document_type_created', {
      userId: user.id,
      agencyId: agency.id,
      targetId: documentType.id,
      targetType: 'DocumentType',
      metadata: {
        name: documentType.name,
        category: documentType.category,
        isGlobal: false,
      },
    });

    return NextResponse.json(
      { message: 'Document type created successfully', documentType },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error creating document type:', error);
    return NextResponse.json({ error: 'Failed to create document type' }, { status: 500 });
  }
}
