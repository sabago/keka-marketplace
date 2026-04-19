import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin, requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { DocumentStatus } from '@prisma/client';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Helper to calculate document status
function calculateDocumentStatus(expirationDate: Date | null): DocumentStatus {
  if (!expirationDate) {
    return 'ACTIVE';
  }

  const now = new Date();
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 0) {
    return 'EXPIRED';
  } else if (daysUntilExpiration <= 30) {
    return 'EXPIRING_SOON';
  } else {
    return 'ACTIVE';
  }
}

/**
 * GET /api/agency/documents/:id
 * Get document metadata
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgency();
    const { id: documentId } = await params;

    const document = await prisma.staffCredential.findFirst({
      where: {
        id: documentId,
        staffMember: {
          agencyId: agency.id,
        },
      },
      include: {
        documentType: true,
        staffMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check permissions for staff users
    const isAdmin = user.role === 'AGENCY_ADMIN' || user.role === 'PLATFORM_ADMIN';
    if (!isAdmin && document.staffMember.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this document' },
        { status: 403 }
      );
    }

    return NextResponse.json({ document }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching document:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agency/documents/:id
 * Update document metadata (not the file itself)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const { id: documentId } = await params;
    const body = await req.json();

    // Verify document exists and belongs to agency
    const existing = await prisma.staffCredential.findFirst({
      where: {
        id: documentId,
        staffMember: {
          agencyId: agency.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const {
      issueDate,
      expirationDate,
      notes,
      status,
    } = body;

    // Build update data
    const updateData: any = {};

    if (issueDate !== undefined) {
      updateData.issueDate = issueDate ? new Date(issueDate) : null;
    }
    if (expirationDate !== undefined) {
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;
      // Recalculate status based on new expiration date
      updateData.status = calculateDocumentStatus(updateData.expirationDate);
    }
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }
    if (status !== undefined) {
      updateData.status = status as DocumentStatus;
    }

    // Update document
    const document = await prisma.staffCredential.update({
      where: { id: documentId },
      data: updateData,
      include: {
        documentType: true,
        staffMember: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Document updated successfully',
        document,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating document:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agency/documents/:id
 * Delete document and S3 file
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const { id: documentId } = await params;

    // Verify document exists and belongs to agency
    const existing = await prisma.staffCredential.findFirst({
      where: {
        id: documentId,
        staffMember: {
          agencyId: agency.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      const s3Client = new S3Client({
        region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || '',
        },
      });

      const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: existing.s3Key,
        })
      );
    } catch (s3Error) {
      console.error('Error deleting from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await prisma.staffCredential.delete({
      where: { id: documentId },
    });

    return NextResponse.json(
      { message: 'Document deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting document:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
