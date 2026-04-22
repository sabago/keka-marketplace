import { NextRequest, NextResponse } from 'next/server';
import { CredentialPageRole, DocumentStatus } from '@prisma/client';
import { requireAgency , HttpError , requireActiveAgency} from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';
import { enqueueParsingJob } from '@/lib/jobQueue';
import { incrementCredentialUploadCount } from '@/lib/subscriptionHelpers';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

// Helper to calculate document status based on expiration date
function calculateDocumentStatus(expirationDate: Date | null): DocumentStatus {
  if (!expirationDate) return 'ACTIVE';

  const now = new Date();
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 0) return 'EXPIRED';
  if (daysUntilExpiration <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

interface FileEntry {
  file: File;
  pageRole: CredentialPageRole;
  order: number;
}

function parseFileEntries(formData: FormData): FileEntry[] {
  const entries: FileEntry[] = [];

  // Try indexed format: files[0][file], files[1][file], ...
  let idx = 0;
  while (true) {
    const file = formData.get(`files[${idx}][file]`) as File | null;
    if (!file || typeof file === 'string') break;

    const roleRaw = (formData.get(`files[${idx}][pageRole]`) as string) ?? 'SINGLE';
    const orderRaw = (formData.get(`files[${idx}][order]`) as string) ?? String(idx);

    const pageRole: CredentialPageRole = (['FRONT', 'BACK', 'SINGLE', 'PAGE'] as CredentialPageRole[]).includes(
      roleRaw as CredentialPageRole
    )
      ? (roleRaw as CredentialPageRole)
      : 'SINGLE';

    entries.push({ file, pageRole, order: parseInt(orderRaw, 10) || idx });
    idx++;
  }

  // Backward compat: single 'file' field (old modal / programmatic callers)
  if (entries.length === 0) {
    const singleFile = formData.get('file') as File | null;
    if (singleFile && typeof singleFile !== 'string') {
      entries.push({ file: singleFile, pageRole: 'SINGLE', order: 0 });
    }
  }

  return entries;
}

/**
 * POST /api/agency/documents/upload
 * Upload one or more files for a staff credential.
 *
 * Accepts both the legacy single-file format (file=...) and the new
 * multi-file format (files[0][file]=..., files[0][pageRole]=..., etc.).
 * Creates one StaffCredential and one CredentialFile per file, then
 * enqueues an AI parsing job.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ── Parse file entries ─────────────────────────────────────────────────────
    const fileEntries = parseFileEntries(formData);

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const staffRecordId = (formData.get('staffRecordId') || formData.get('employeeId')) as string;
    const documentTypeId = formData.get('documentTypeId') as string;
    const issueDate = formData.get('issueDate') as string | null;
    const expirationDate = formData.get('expirationDate') as string | null;
    const notes = formData.get('notes') as string | null;

    // Parse customFieldValues (JSON string from modal)
    let customFieldValues: Record<string, unknown> = {};
    try {
      const raw = formData.get('customFieldValues') as string | null;
      if (raw) customFieldValues = JSON.parse(raw);
    } catch {
      // Ignore malformed customFieldValues
    }

    if (!staffRecordId || !documentTypeId) {
      return NextResponse.json(
        { error: 'Staff record ID and Document Type ID are required' },
        { status: 400 }
      );
    }

    // ── Per-file validation ────────────────────────────────────────────────────
    for (const entry of fileEntries) {
      if (entry.file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${entry.file.name}" exceeds the 10 MB size limit` },
          { status: 400 }
        );
      }
      if (!ALLOWED_MIME_TYPES.includes(entry.file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
        return NextResponse.json(
          { error: `File "${entry.file.name}": only PDF, JPEG, and PNG files are allowed` },
          { status: 400 }
        );
      }
    }

    // ── Auth + agency scope ───────────────────────────────────────────────────
    const { user, agency } = await requireActiveAgency();

    const isAdmin =
      user.role === 'AGENCY_ADMIN' ||
      user.role === 'PLATFORM_ADMIN' ||
      user.role === 'SUPERADMIN';

    // Verify the staff record belongs to this agency
    const staffRecord = await prisma.staffMember.findFirst({
      where: { id: staffRecordId, agencyId: agency.id },
    });

    if (!staffRecord) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    if (!isAdmin) {
      if (!staffRecord.userId || staffRecord.userId !== user.id) {
        return NextResponse.json(
          { error: 'You can only upload credentials for yourself' },
          { status: 403 }
        );
      }
    }

    // ── Verify document type and enforce file count limits ─────────────────────
    const documentType = await prisma.documentType.findFirst({
      where: {
        id: documentTypeId,
        OR: [{ isGlobal: true }, { agencyId: agency.id }],
        isActive: true,
      },
    });

    if (!documentType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    const minFiles = documentType.minFiles ?? 1;
    const maxFiles = documentType.maxFiles ?? 10;

    if (fileEntries.length < minFiles) {
      return NextResponse.json(
        { error: `${documentType.name} requires at least ${minFiles} file(s). Got ${fileEntries.length}.` },
        { status: 400 }
      );
    }
    if (fileEntries.length > maxFiles) {
      return NextResponse.json(
        { error: `${documentType.name} allows a maximum of ${maxFiles} file(s). Got ${fileEntries.length}.` },
        { status: 400 }
      );
    }

    // ── Upload all files to S3 ─────────────────────────────────────────────────
    const timestamp = Date.now();
    const uploadedFiles: Array<{
      s3Key: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      pageRole: CredentialPageRole;
      order: number;
    }> = [];

    for (const entry of fileEntries) {
      const sanitized = entry.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `documents/${agency.id}/${staffRecordId}/${timestamp}_${entry.order}_${sanitized}`;
      const bytes = await entry.file.arrayBuffer();
      const uploadResult = await uploadToS3(Buffer.from(bytes), s3Key, entry.file.type);
      if (!uploadResult.success) throw new Error(`Failed to upload file: ${uploadResult.error}`);
      uploadedFiles.push({
        s3Key,
        fileName: entry.file.name,
        fileSize: entry.file.size,
        mimeType: entry.file.type,
        pageRole: entry.pageRole,
        order: entry.order,
      });
    }

    // ── Create StaffCredential + CredentialFile records in one transaction ─────
    const expDate = expirationDate ? new Date(expirationDate) : null;
    const status = calculateDocumentStatus(expDate);
    const primaryFile = uploadedFiles[0];

    const document = await prisma.$transaction(async (tx) => {
      // Archive any previous credentials of the same type for this staff member.
      // PENDING_REVIEW and REJECTED rows are left untouched — a reviewer may still need to act on them.
      await tx.staffCredential.updateMany({
        where: {
          staffMemberId: staffRecordId,
          documentTypeId,
          status: { in: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] },
        },
        data: { status: 'ARCHIVED' },
      });

      const cred = await tx.staffCredential.create({
        data: {
          staffMemberId: staffRecordId,
          documentTypeId,
          // Keep s3Key on StaffCredential for backward compatibility.
          // CredentialFile is the authoritative file list going forward.
          s3Key: primaryFile.s3Key,
          fileName: primaryFile.fileName,
          fileSize: primaryFile.fileSize,
          mimeType: primaryFile.mimeType,
          issueDate: issueDate ? new Date(issueDate) : null,
          expirationDate: expDate,
          status,
          reviewStatus: 'PENDING_REVIEW',
          uploadedBy: user.id,
          notes: notes || null,
          // Store user-provided custom field values so the parser can merge them
          aiParsedData: Object.keys(customFieldValues).length > 0
            ? ({ __userProvided: customFieldValues } as object)
            : undefined,
        },
        include: { documentType: true },
      });

      // One CredentialFile row per uploaded file
      await tx.credentialFile.createMany({
        data: uploadedFiles.map((f) => ({
          credentialId: cred.id,
          s3Key: f.s3Key,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          pageRole: f.pageRole,
          sortOrder: f.order,
        })),
      });

      return cred;
    });

    // ── Increment lifetime upload counter ─────────────────────────────────────
    await incrementCredentialUploadCount(agency.id);

    // ── Enqueue AI parsing job (was missing from this route previously) ────────
    let jobId: string | undefined;
    if (documentType.aiParsingEnabled !== false) {
      const enqueued = await enqueueParsingJob(
        document.id,
        document.s3Key,
        document.fileName,
        document.mimeType,
        agency.id
      );
      jobId = enqueued.jobId;
    }

    return NextResponse.json(
      {
        message: 'Document uploaded successfully',
        document,
        fileCount: uploadedFiles.length,
        jobId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error uploading document:', error);

    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
