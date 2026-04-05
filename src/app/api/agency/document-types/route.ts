import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin, requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/document-types
 * List all document types (global + agency-specific)
 */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgency();

    // Fetch global types and agency-specific types
    const documentTypes = await prisma.documentType.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { agencyId: agency.id },
        ],
        isActive: true,
      },
      orderBy: [
        { isGlobal: 'desc' }, // Global types first
        { name: 'asc' },
      ],
    });

    // Separate into categories
    const globalTypes = documentTypes.filter((dt) => dt.isGlobal);
    const customTypes = documentTypes.filter((dt) => !dt.isGlobal);

    return NextResponse.json(
      {
        documentTypes,
        globalTypes,
        customTypes,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching document types:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch document types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agency/document-types
 * Create agency-specific document type
 */
export async function POST(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const body = await req.json();

    const {
      name,
      description,
      expirationDays,
      reminderDays,
      isRequired,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document type name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name in agency
    const existing = await prisma.documentType.findFirst({
      where: {
        agencyId: agency.id,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A document type with this name already exists' },
        { status: 400 }
      );
    }

    // Validate reminderDays array
    let parsedReminderDays = [30, 7]; // Default
    if (reminderDays && Array.isArray(reminderDays)) {
      parsedReminderDays = reminderDays
        .filter((d: any) => typeof d === 'number' && d > 0)
        .sort((a: number, b: number) => b - a); // Sort descending
    }

    // Create document type
    const documentType = await prisma.documentType.create({
      data: {
        agencyId: agency.id,
        name: name.trim(),
        description: description?.trim() || null,
        expirationDays: expirationDays && expirationDays > 0 ? expirationDays : null,
        reminderDays: parsedReminderDays,
        isRequired: Boolean(isRequired),
        isGlobal: false,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Document type created successfully',
        documentType,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating document type:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create document type' },
      { status: 500 }
    );
  }
}
