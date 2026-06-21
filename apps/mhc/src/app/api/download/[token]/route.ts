import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFileFromS3 } from '@/lib/s3';

// GET /api/download/[token] - Download a file using a token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  
  try {
    // Find download record by token
    const download = await prisma.download.findUnique({
      where: { downloadToken: token },
      include: {
        product: true,
      },
    });

    // Return 404 if download not found
    if (!download) {
      return NextResponse.json(
        { error: 'Download not found' },
        { status: 404 }
      );
    }

    // Check if download has expired
    const now = new Date();
    if (download.expiresAt < now) {
      return NextResponse.json(
        { error: 'Download link has expired' },
        { status: 403 }
      );
    }

    // Get file from S3
    const fileKey = download.product.filePath;
    let fileStream;
    try {
      fileStream = await getFileFromS3(fileKey);
    } catch (s3Error) {
      console.error('S3 access error:', s3Error);
      return NextResponse.json(
        { 
          error: 'Unable to access file storage. This is likely due to missing S3 permissions.',
          details: 'In a production environment, ensure the IAM user has proper S3 permissions.'
        },
        { status: 500 }
      );
    }

    // Increment download count
    await prisma.download.update({
      where: { id: download.id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    // Extract filename from S3 key
    const filename = fileKey.split('/').pop() || 'download.pdf';

    // Create response with file stream
    const response = new NextResponse(fileStream);
    
    // Set headers for file download
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    return response;
  } catch (error) {
    console.error(`Error processing download for token ${token}:`, error);
    return NextResponse.json(
      { error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
