import { NextRequest, NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * DELETE /api/documents/[id]
 * Archive-protected delete: removes the S3 object and the DB record.
 * Admins can delete any doc in their org. AGENCY_USER can only delete their own.
 * Archived documents cannot be deleted (compliance history must be preserved).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, orgId } = await requireOrg();
    const { id: documentId } = await params;

    const isAdmin = ['AGENCY_ADMIN', 'SUPERADMIN', 'PLATFORM_ADMIN'].includes(
      (await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } }))?.role ?? ''
    );

    const existing = await prisma.staffCredential.findFirst({
      where: {
        id: documentId,
        staffMember: { agencyId: orgId },
      },
      include: { staffMember: { select: { email: true } } },
    });

    // Non-admins can only delete their own documents
    if (!isAdmin && existing?.staffMember?.email !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (existing.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Archived documents cannot be deleted' },
        { status: 403 }
      );
    }

    // Delete from S3 (best-effort — DB deletion proceeds even if S3 fails)
    try {
      const s3Client = new S3Client({
        region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || '',
        },
      });
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '',
          Key: existing.s3Key,
        })
      );
    } catch (s3Err) {
      console.error('DELETE /api/documents/[id] — S3 deletion failed:', s3Err);
    }

    await prisma.staffCredential.delete({ where: { id: documentId } });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('DELETE /api/documents/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
