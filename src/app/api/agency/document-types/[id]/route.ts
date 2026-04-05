import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * PUT /api/agency/document-types/:id
 * Update agency-specific document type (cannot edit global)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const documentTypeId = params.id;
    const body = await req.json();

    // Verify document type exists and belongs to agency
    const existing = await prisma.documentType.findFirst({
      where: {
        id: documentTypeId,
        agencyId: agency.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document type not found' },
        { status: 404 }
      );
    }

    // Cannot edit global document types
    if (existing.isGlobal) {
      return NextResponse.json(
        { error: 'Cannot edit system-wide document types' },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      expirationDays,
      reminderDays,
      isRequired,
      isActive,
    } = body;

    // Check for duplicate name (if changing name)
    if (name && name !== existing.name) {
      const duplicate = await prisma.documentType.findFirst({
        where: {
          agencyId: agency.id,
          name: name.trim(),
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

    // Build update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (expirationDays !== undefined) {
      updateData.expirationDays = expirationDays && expirationDays > 0 ? expirationDays : null;
    }
    if (reminderDays !== undefined && Array.isArray(reminderDays)) {
      updateData.reminderDays = reminderDays
        .filter((d: any) => typeof d === 'number' && d > 0)
        .sort((a: number, b: number) => b - a);
    }
    if (isRequired !== undefined) updateData.isRequired = Boolean(isRequired);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // Update document type
    const documentType = await prisma.documentType.update({
      where: { id: documentTypeId },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: 'Document type updated successfully',
        documentType,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating document type:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update document type' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agency/document-types/:id
 * Delete agency-specific document type (cannot delete global)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const documentTypeId = params.id;

    // Verify document type exists and belongs to agency
    const existing = await prisma.documentType.findFirst({
      where: {
        id: documentTypeId,
        agencyId: agency.id,
      },
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document type not found' },
        { status: 404 }
      );
    }

    // Cannot delete global document types
    if (existing.isGlobal) {
      return NextResponse.json(
        { error: 'Cannot delete system-wide document types' },
        { status: 403 }
      );
    }

    // Check if document type is in use
    if (existing._count.documents > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete document type. It is currently used by ${existing._count.documents} document(s).`,
          documentsCount: existing._count.documents,
        },
        { status: 400 }
      );
    }

    // Delete document type
    await prisma.documentType.delete({
      where: { id: documentTypeId },
    });

    return NextResponse.json(
      { message: 'Document type deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting document type:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete document type' },
      { status: 500 }
    );
  }
}
