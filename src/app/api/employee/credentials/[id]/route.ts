/**
 * GET /api/employee/credentials/[id]
 *
 * Get detailed information for a specific credential
 * Includes S3 presigned download URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { getS3DownloadUrl } from '@/lib/s3';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAuth();
    const credentialId = params.id;

    // Find employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true, agencyId: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Get credential with all details
    const credential = await prisma.employeeDocument.findUnique({
      where: { id: credentialId },
      include: {
        documentType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Verify credential belongs to employee
    if (credential.employeeId !== employee.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this credential' },
        { status: 403 }
      );
    }

    // Generate S3 presigned download URL (valid for 1 hour)
    let s3DownloadUrl: string | undefined;
    try {
      const downloadResult = await getS3DownloadUrl(credential.s3Key, 3600);
      if (downloadResult.success && downloadResult.url) {
        s3DownloadUrl = downloadResult.url;
      }
    } catch (error) {
      console.error('Error generating S3 download URL:', error);
      // Don't fail the request if download URL generation fails
    }

    return NextResponse.json({
      success: true,
      credential: {
        ...credential,
        s3DownloadUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching credential detail:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch credential detail' },
      { status: 500 }
    );
  }
}
