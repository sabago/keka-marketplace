import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { uploadFileToS3 } from '@/lib/s3';
import { validateCredentialFormData } from '@/lib/credentialValidation';
import { calculateCredentialStatus, updateCredentialCompliance, getOrCreateStaffRecord } from '@/lib/credentialHelpers';
import { sanitizeFilename } from '@/lib/validation';
import { enqueueParsingJob } from '@/lib/jobQueue';

/**
 * GET /api/employee/credentials
 * List all credentials for the authenticated employee
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const employee = await getOrCreateStaffRecord(user.id);
    if (!employee) {
      return NextResponse.json(
        { error: 'No agency association found. Please contact your administrator.' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build where clause
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const where: any = {
      staffMemberId: employee.id,
      // Never expose archived (historical) credentials in the employee self-service view
      ...(status ? { status } : { status: { not: 'ARCHIVED' } }),
    };

    // Fetch credentials
    const credentials = await prisma.staffCredential.findMany({
      where,
      include: {
        documentType: true,
      },
      orderBy: [
        { status: 'desc' }, // Expired/Expiring first
        { expirationDate: 'asc' },
      ],
    });

    // Calculate stats
    const stats = {
      total: credentials.length,
      valid: credentials.filter((c) => c.status === 'ACTIVE' && c.isCompliant).length,
      expiringSoon: credentials.filter((c) => c.status === 'EXPIRING_SOON').length,
      expired: credentials.filter((c) => c.status === 'EXPIRED').length,
      missing: credentials.filter((c) => c.status === 'MISSING').length,
      pendingReview: credentials.filter((c) => c.reviewStatus === 'PENDING_REVIEW').length,
    };

    return NextResponse.json(
      {
        credentials,
        stats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching employee credentials:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employee/credentials
 * Upload a new credential document
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const staffRecord = await getOrCreateStaffRecord(user.id);
    if (!staffRecord) {
      return NextResponse.json(
        { error: 'No agency association found. Please contact your administrator.' },
        { status: 404 }
      );
    }

    // staffRecord was just created/found, so findUnique by id is guaranteed non-null
    const employee = (await prisma.staffMember.findUnique({
      where: { id: staffRecord.id },
      include: {
        agency: {
          select: {
            id: true,
            credentialWarningDays: true,
          },
        },
      },
    }))!;

    // Parse multipart form data
    const formData = await req.formData();

    // Validate form data
    const validation = validateCredentialFormData(formData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const { file, metadata } = validation.data!;

    // Verify employee is uploading for themselves
    if (metadata.employeeId !== employee.id) {
      return NextResponse.json(
        { error: 'You can only upload credentials for yourself' },
        { status: 403 }
      );
    }

    // Verify document type exists
    const documentType = await prisma.documentType.findFirst({
      where: {
        id: metadata.documentTypeId,
        isActive: true,
        OR: [
          { agencyId: employee.agencyId },
          { isGlobal: true },
        ],
      },
    });

    if (!documentType) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);

    // Upload to S3
    const folder = `documents/${employee.agencyId}/${employee.id}`;
    const s3Key = await uploadFileToS3(buffer, sanitizedFilename, file.type, folder);

    // Calculate initial status
    const initialStatus = calculateCredentialStatus(
      metadata.expirationDate || null,
      employee.agency.credentialWarningDays
    );

    // Create credential record
    const credential = await prisma.staffCredential.create({
      data: {
        staffMemberId: employee.id,
        documentTypeId: metadata.documentTypeId,
        s3Key,
        fileName: sanitizedFilename,
        fileSize: file.size,
        mimeType: file.type,
        issueDate: metadata.issueDate,
        expirationDate: metadata.expirationDate,
        issuer: metadata.issuer,
        licenseNumber: metadata.licenseNumber,
        verificationUrl: metadata.verificationUrl,
        notes: metadata.notes,
        status: initialStatus,
        reviewStatus: 'PENDING_REVIEW', // Always requires review initially
        uploadedBy: user.id,
        isCompliant: false, // Will be updated after review
      },
      include: {
        documentType: true,
      },
    });

    // Update compliance status
    await updateCredentialCompliance(credential.id);

    // Enqueue parsing job for AI extraction
    let parsingJob;
    try {
      parsingJob = await enqueueParsingJob(
        credential.id,
        s3Key,
        sanitizedFilename,
        file.type,
        employee.agencyId
      );
      console.log(`Enqueued parsing job ${parsingJob.jobId} for credential ${credential.id}`);
    } catch (error) {
      console.error('Failed to enqueue parsing job:', error);
      // Don't fail the upload if parsing job fails - admin can retry manually
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Credential uploaded successfully and is being processed',
        credential: {
          id: credential.id,
          status: credential.status,
          reviewStatus: credential.reviewStatus,
          credentialType: credential.documentType.name,
        },
        parsing: parsingJob ? {
          jobId: parsingJob.jobId,
          queuePosition: parsingJob.queuePosition,
          estimatedWaitSeconds: parsingJob.queuePosition * 30,
        } : null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error uploading credential:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error.message.includes('S3')) {
      return NextResponse.json(
        { error: 'Failed to upload file. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload credential' },
      { status: 500 }
    );
  }
}
