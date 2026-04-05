import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin, requireAgency } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { uploadFileToS3 } from '@/lib/s3';
import { DocumentStatus } from '@prisma/client';

// Helper to calculate document status based on expiration date
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
 * POST /api/agency/documents/upload
 * Upload a document with file
 */
export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData();

    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const documentTypeId = formData.get('documentTypeId') as string;
    const issueDate = formData.get('issueDate') as string;
    const expirationDate = formData.get('expirationDate') as string;
    const notes = formData.get('notes') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!employeeId || !documentTypeId) {
      return NextResponse.json(
        { error: 'Employee ID and Document Type ID are required' },
        { status: 400 }
      );
    }

    // File size validation (10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10 MB' },
        { status: 400 }
      );
    }

    // File type validation
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, JPEG, and PNG files are allowed' },
        { status: 400 }
      );
    }

    // Get authenticated user and verify access
    const { user, agency } = await requireAgency();

    // Check if user is admin OR if they're uploading for themselves (staff)
    const isAdmin = user.role === 'AGENCY_ADMIN' || user.role === 'PLATFORM_ADMIN';

    // Verify employee belongs to agency
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        agencyId: agency.id,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // If not admin, verify they're uploading for themselves
    if (!isAdmin) {
      if (!employee.userId || employee.userId !== user.id) {
        return NextResponse.json(
          { error: 'You can only upload documents for yourself' },
          { status: 403 }
        );
      }
    }

    // Verify document type exists
    const documentType = await prisma.documentType.findFirst({
      where: {
        id: documentTypeId,
        OR: [
          { isGlobal: true },
          { agencyId: agency.id },
        ],
      },
    });

    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `documents/${agency.id}/${employeeId}/${timestamp}_${sanitizedFileName}`;

    // Upload to S3
    await uploadFileToS3(
      buffer,
      s3Key,
      file.type,
      'documents'
    );

    // Calculate document status
    const expDate = expirationDate ? new Date(expirationDate) : null;
    const status = calculateDocumentStatus(expDate);

    // Create document record
    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentTypeId,
        s3Key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        issueDate: issueDate ? new Date(issueDate) : null,
        expirationDate: expDate,
        status,
        uploadedBy: user.id,
        notes: notes || null,
      },
      include: {
        documentType: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Document uploaded successfully',
        document,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error uploading document:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
