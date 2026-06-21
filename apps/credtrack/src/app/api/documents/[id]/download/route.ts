import { NextRequest, NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { getSignedDownloadUrl } from '@/lib/s3';

/**
 * GET /api/documents/[id]/download
 * Generate a signed S3 download URL for a credential document.
 * Only the owning org can download its own documents.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrg();
    const { id: documentId } = await params;

    const document = await prisma.staffCredential.findFirst({
      where: {
        id: documentId,
        staffMember: { agencyId: orgId },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const downloadUrl = await getSignedDownloadUrl(
      document.s3Key,
      300, // 5 minutes
      document.fileName
    );

    return NextResponse.json({
      downloadUrl,
      fileName: document.fileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/documents/[id]/download error:', err);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
