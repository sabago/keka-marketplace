import { NextRequest, NextResponse } from 'next/server';
import { requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { getSignedDownloadUrl } from '@/lib/s3';

/**
 * GET /api/agency/documents/:id/download
 * Generate signed download URL for document
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, agency } = await requireAgency();
    const documentId = params.id;

    // Fetch document with employee info
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: documentId,
        employee: {
          agencyId: agency.id,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
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
    if (!isAdmin && document.employee.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to download this document' },
        { status: 403 }
      );
    }

    // Generate signed URL (valid for 5 minutes)
    const downloadUrl = await getSignedDownloadUrl(
      document.s3Key,
      300, // 5 minutes
      document.fileName
    );

    return NextResponse.json(
      {
        downloadUrl,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error generating download URL:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
