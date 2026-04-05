/**
 * POST /api/employee/credentials/upload
 *
 * Upload a new credential document for authenticated employee
 * - Accepts multipart/form-data file upload
 * - Uploads to S3
 * - Creates EmployeeDocument record
 * - Enqueues AI parsing job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';
import { enqueueParsingJob } from '@/lib/jobQueue';
import { z } from 'zod';

// File validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const uploadSchema = z.object({
  documentTypeId: z.string().uuid('Invalid document type ID'),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Find employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true, agencyId: true, firstName: true, lastName: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentTypeId = formData.get('documentTypeId') as string;
    const notes = formData.get('notes') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate form data
    const validationResult = uploadSchema.safeParse({
      documentTypeId,
      notes: notes || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Only PDF, JPG, and PNG files are allowed.',
          allowedTypes: ALLOWED_MIME_TYPES,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          maxSize: MAX_FILE_SIZE,
          receivedSize: file.size,
        },
        { status: 400 }
      );
    }

    // Verify document type exists and belongs to agency
    const documentType = await prisma.documentType.findUnique({
      where: { id: documentTypeId },
      select: { id: true, name: true, agencyId: true, isGlobal: true },
    });

    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type not found' },
        { status: 404 }
      );
    }

    // Check if document type belongs to employee's agency or is global
    if (
      !documentType.isGlobal &&
      documentType.agencyId !== employee.agencyId
    ) {
      return NextResponse.json(
        { error: 'Document type not available for your agency' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate S3 key with proper path structure
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `credentials/${employee.agencyId}/${employee.id}/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const uploadResult = await uploadToS3(
      buffer,
      s3Key,
      file.type
    );

    if (!uploadResult.success) {
      console.error('S3 upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Create EmployeeDocument record
    const credential = await prisma.employeeDocument.create({
      data: {
        employeeId: employee.id,
        documentTypeId,
        s3Key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user.id,
        notes: notes || null,
        reviewStatus: 'PENDING_UPLOAD',
        status: 'ACTIVE',
        isCompliant: false,
      },
      include: {
        documentType: true,
      },
    });

    // Enqueue AI parsing job
    const { jobId, queuePosition } = await enqueueParsingJob(
      credential.id,
      s3Key,
      file.name,
      file.type,
      employee.agencyId
    );

    // Update credential with parsing job status
    await prisma.employeeDocument.update({
      where: { id: credential.id },
      data: { reviewStatus: 'PENDING_REVIEW' },
    });

    return NextResponse.json({
      success: true,
      message: 'Credential uploaded successfully',
      credential: {
        id: credential.id,
        fileName: credential.fileName,
        documentType: credential.documentType.name,
        uploadedAt: credential.createdAt,
      },
      parsing: {
        jobId,
        queuePosition,
        status: 'queued',
        estimatedWaitTime: queuePosition * 3, // ~3 seconds per job
      },
    });
  } catch (error) {
    console.error('Error uploading credential:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload credential' },
      { status: 500 }
    );
  }
}
