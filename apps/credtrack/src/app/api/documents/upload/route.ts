import { NextRequest, NextResponse } from 'next/server';
import { CredentialPageRole, DocumentStatus } from '@prisma/client';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { canUseAIParsing } from '@/lib/credtrackSubscription';
import { prisma } from '@mhc/db';
import { uploadToS3 } from '@/lib/s3';
import { enqueueParsingJob } from '@/lib/jobQueue';

const MAX_FILE_SIZE  = 10 * 1024 * 1024;
const ALLOWED_TYPES  = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'] as const;

function calcStatus(expDate: Date | null): DocumentStatus {
  if (!expDate) return 'ACTIVE';
  const days = Math.floor((expDate.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

interface FileEntry { file: File; pageRole: CredentialPageRole; order: number }

function parseFileEntries(fd: FormData): FileEntry[] {
  const entries: FileEntry[] = [];
  let i = 0;
  while (true) {
    const f = fd.get(`files[${i}][file]`) as File | null;
    if (!f || typeof f === 'string') break;
    const roleRaw = (fd.get(`files[${i}][pageRole]`) as string) ?? 'SINGLE';
    const pageRole = (['FRONT','BACK','SINGLE','PAGE'] as CredentialPageRole[]).includes(roleRaw as CredentialPageRole)
      ? (roleRaw as CredentialPageRole) : 'SINGLE';
    entries.push({ file: f, pageRole, order: parseInt((fd.get(`files[${i}][order]`) as string) ?? String(i), 10) || i });
    i++;
  }
  if (entries.length === 0) {
    const f = fd.get('file') as File | null;
    if (f && typeof f !== 'string') entries.push({ file: f, pageRole: 'SINGLE', order: 0 });
  }
  return entries;
}

/**
 * POST /api/documents/upload
 * Upload credential document(s) for a staff member.
 * AI parsing is gated: STARTER plan gets manual entry only.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntries = parseFileEntries(formData);

    if (fileEntries.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const staffMemberId = formData.get('staffMemberId') as string;
    const documentTypeId = formData.get('documentTypeId') as string;
    const issueDate      = formData.get('issueDate')      as string | null;
    const expirationDate = formData.get('expirationDate') as string | null;
    const notes          = formData.get('notes')          as string | null;

    let customFieldValues: Record<string, unknown> = {};
    try {
      const raw = formData.get('customFieldValues') as string | null;
      if (raw) customFieldValues = JSON.parse(raw);
    } catch { /* ignore */ }

    if (!staffMemberId || !documentTypeId) {
      return NextResponse.json({ error: 'staffMemberId and documentTypeId are required' }, { status: 400 });
    }

    // Per-file validation (before auth — fast fail)
    for (const entry of fileEntries) {
      if (entry.file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `"${entry.file.name}" exceeds 10 MB` }, { status: 400 });
      }
      if (!ALLOWED_TYPES.includes(entry.file.type as typeof ALLOWED_TYPES[number])) {
        return NextResponse.json({ error: `"${entry.file.name}": only PDF, JPEG, PNG allowed` }, { status: 400 });
      }
    }

    const { user, orgId } = await requireOrg();

    // Verify staff member belongs to this org
    const staffMember = await prisma.staffMember.findFirst({
      where: { id: staffMemberId, agencyId: orgId },
    });
    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Verify document type
    const documentType = await prisma.documentType.findFirst({
      where: { id: documentTypeId, OR: [{ isGlobal: true }, { agencyId: orgId }], isActive: true },
    });
    if (!documentType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    const minFiles = documentType.minFiles ?? 1;
    const maxFiles = documentType.maxFiles ?? 10;
    if (fileEntries.length < minFiles) {
      return NextResponse.json({ error: `${documentType.name} requires at least ${minFiles} file(s)` }, { status: 400 });
    }
    if (fileEntries.length > maxFiles) {
      return NextResponse.json({ error: `${documentType.name} allows max ${maxFiles} file(s)` }, { status: 400 });
    }

    // Upload to S3
    const timestamp = Date.now();
    const uploadedFiles: Array<{
      s3Key: string; fileName: string; fileSize: number;
      mimeType: string; pageRole: CredentialPageRole; order: number;
    }> = [];

    for (const entry of fileEntries) {
      const sanitized = entry.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `credtrack/${orgId}/${staffMemberId}/${timestamp}_${entry.order}_${sanitized}`;
      const bytes = await entry.file.arrayBuffer();
      const result = await uploadToS3(Buffer.from(bytes), s3Key, entry.file.type);
      if (!result.success) throw new Error(`S3 upload failed: ${result.error}`);
      uploadedFiles.push({ s3Key, fileName: entry.file.name, fileSize: entry.file.size, mimeType: entry.file.type, pageRole: entry.pageRole, order: entry.order });
    }

    // Create StaffCredential + CredentialFile in transaction
    const expDate = expirationDate ? new Date(expirationDate) : null;
    const status  = calcStatus(expDate);
    const primary = uploadedFiles[0];

    const credential = await prisma.$transaction(async (tx) => {
      // Archive previous active/expiring/expired credentials of same type
      await tx.staffCredential.updateMany({
        where: {
          staffMemberId,
          documentTypeId,
          status: { in: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] },
        },
        data: { status: 'ARCHIVED' },
      });

      const cred = await tx.staffCredential.create({
        data: {
          staffMemberId,
          documentTypeId,
          s3Key:     primary.s3Key,
          fileName:  primary.fileName,
          fileSize:  primary.fileSize,
          mimeType:  primary.mimeType,
          issueDate:      issueDate ? new Date(issueDate) : null,
          expirationDate: expDate,
          status,
          reviewStatus: 'PENDING_REVIEW',
          uploadedBy: user.id,
          notes: notes ?? null,
          aiParsedData: Object.keys(customFieldValues).length > 0
            ? ({ __userProvided: customFieldValues } as object)
            : undefined,
        },
        include: { documentType: true },
      });

      await tx.credentialFile.createMany({
        data: uploadedFiles.map((f) => ({
          credentialId: cred.id,
          s3Key:     f.s3Key,
          fileName:  f.fileName,
          fileSize:  f.fileSize,
          mimeType:  f.mimeType,
          pageRole:  f.pageRole,
          sortOrder: f.order,
        })),
      });

      return cred;
    });

    // AI parsing gate: only GROWTH/ENTERPRISE/BUNDLED plans
    let jobId: string | undefined;
    const aiEnabled = await canUseAIParsing(orgId);
    if (aiEnabled && documentType.aiParsingEnabled !== false) {
      const enqueued = await enqueueParsingJob(
        credential.id, credential.s3Key, credential.fileName, credential.mimeType, orgId
      );
      jobId = enqueued.jobId;
    }

    return NextResponse.json({ message: 'Document uploaded successfully', credential, fileCount: uploadedFiles.length, jobId, aiParsing: !!jobId }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/documents/upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
