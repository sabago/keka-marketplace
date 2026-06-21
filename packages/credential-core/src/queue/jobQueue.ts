/**
 * Shared credential parsing job queue.
 * Contains DB-interaction helpers plus processParsingQueue for the AI parsing cron.
 * Both apps/mhc and apps/credtrack can run their own independent cron worker by
 * importing processParsingQueue from this package.
 */

import { prisma } from '@mhc/db';
import { parseCredentialDocument, parseCredentialFiles, type ParsedCredentialData } from '../parsers/credentialParser';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

async function getQueuePosition(jobId: string): Promise<number> {
  const job = await prisma.credentialParsingJob.findUnique({ where: { id: jobId } });
  if (!job) return 0;
  const pos = await prisma.credentialParsingJob.count({
    where: { status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { lt: job.createdAt } },
  });
  return pos + 1;
}

export async function enqueueParsingJob(
  credentialId: string,
  s3Key: string,
  fileName: string,
  mimeType: string,
  agencyId: string
): Promise<{ jobId: string; queuePosition: number }> {
  const existing = await prisma.credentialParsingJob.findFirst({
    where: { documentId: credentialId, status: { in: ['PENDING', 'PROCESSING'] } },
  });
  if (existing) {
    return { jobId: existing.id, queuePosition: await getQueuePosition(existing.id) };
  }

  const cred = await prisma.staffCredential.findUnique({
    where: { id: credentialId },
    include: { documentType: true },
  });
  if (!cred) throw new Error(`Credential ${credentialId} not found`);

  const job = await prisma.credentialParsingJob.create({
    data: {
      documentId: credentialId,
      agencyId,
      s3Key,
      fileName,
      mimeType,
      documentTypeName: cred.documentType?.name ?? 'Unknown',
      status: 'PENDING',
      attemptCount: 0,
      metadata: { enqueuedAt: new Date().toISOString(), documentTypeId: cred.documentTypeId },
    },
  });

  return { jobId: job.id, queuePosition: await getQueuePosition(job.id) };
}

export async function getJobStatus(jobId: string) {
  return prisma.credentialParsingJob.findUnique({ where: { id: jobId } });
}

export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    await prisma.credentialParsingJob.update({
      where: { id: jobId, status: { in: ['PENDING'] } },
      data: { status: 'CANCELLED' },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Queue processor (used by cron workers in both apps) ──────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds: 1min, 5min, 15min
const JOB_TIMEOUT_SECONDS = 600; // 10 minutes
const DEFAULT_BATCH_SIZE = 5;

// Document-type signal map for category mismatch detection (background checks)
const DOC_TYPE_SIGNALS: Record<string, { issuers: string[]; typeKeywords: string[] }> = {
  'cori (criminal background check)': {
    issuers:      ['dcjis', 'department of criminal justice', 'icori', 'cori'],
    typeKeywords: ['cori', 'criminal offender record', 'criminal background'],
  },
  'sori (sex offender registry)': {
    issuers:      ['dcjis', 'sex offender registry board', 'sorb'],
    typeKeywords: ['sori', 'sex offender registry', 'sex offender'],
  },
  'oig exclusion check': {
    issuers:      ['oig', 'oig leie', 'office of inspector general'],
    typeKeywords: ['oig', 'leie', 'oig exclusion'],
  },
  'sam.gov exclusion check': {
    issuers:      ['sam.gov', 'system for award management', 'gsa'],
    typeKeywords: ['sam.gov', 'sam exclusion', 'system for award management'],
  },
  'federal background check': {
    issuers:      ['fbi', 'federal bureau of investigation'],
    typeKeywords: ['federal background', 'fbi background'],
  },
  'sex offender registry national': {
    issuers:      ['nsopw', 'doj', 'department of justice'],
    typeKeywords: ['national sex offender', 'nsopw'],
  },
};

// License/certification keyword mismatch rules
const LICENSE_TYPE_KEYWORDS: Array<{
  filedContains: string[];
  mustMatch: string[];
  forbiddenMatch: string[];
  label: string;
}> = [
  {
    filedContains: ['cna', 'certified nursing assistant'],
    mustMatch: ['cna', 'certified nursing assistant', 'nurse aide', 'nursing assistant'],
    forbiddenMatch: ['physical therapist', 'pt license', 'registered nurse', 'lpn', 'licensed practical', 'rn license', 'hha', 'home health aide', 'cpr', 'bci'],
    label: 'CNA Certificate',
  },
  {
    filedContains: ['rn', 'registered nurse'],
    mustMatch: ['registered nurse', 'rn license', 'rn certification'],
    forbiddenMatch: ['physical therapist', 'cna', 'lpn', 'licensed practical', 'hha', 'cpr'],
    label: 'Registered Nurse (RN) License',
  },
  {
    filedContains: ['lpn', 'licensed practical nurse'],
    mustMatch: ['lpn', 'licensed practical nurse', 'practical nurse'],
    forbiddenMatch: ['physical therapist', 'cna', 'registered nurse', 'rn license', 'hha', 'cpr'],
    label: 'LPN License',
  },
  {
    filedContains: ['hha', 'home health aide'],
    mustMatch: ['hha', 'home health aide', 'home health'],
    forbiddenMatch: ['physical therapist', 'cna', 'registered nurse', 'lpn', 'cpr'],
    label: 'Home Health Aide (HHA) Certificate',
  },
  {
    filedContains: ['physical therapist', 'pt license', 'physical therapy'],
    mustMatch: ['physical therapist', 'pt license', 'physical therapy'],
    forbiddenMatch: ['cna', 'registered nurse', 'lpn', 'hha', 'cpr', 'occupational therapist'],
    label: 'Physical Therapist (PT) License',
  },
  {
    filedContains: ['occupational therapist', 'ot license'],
    mustMatch: ['occupational therapist', 'ot license', 'occupational therapy'],
    forbiddenMatch: ['cna', 'registered nurse', 'lpn', 'hha', 'physical therapist', 'cpr'],
    label: 'Occupational Therapist (OT) License',
  },
  {
    filedContains: ['cpr', 'basic life support', 'bls'],
    mustMatch: ['cpr', 'basic life support', 'bls', 'cardiopulmonary resuscitation'],
    forbiddenMatch: ['physical therapist', 'cna', 'registered nurse', 'lpn', 'hha'],
    label: 'CPR Certification',
  },
  {
    filedContains: ['bci', 'background check', 'criminal history'],
    mustMatch: ['background check', 'criminal history', 'bci', 'cori', 'criminal record'],
    forbiddenMatch: ['physical therapist', 'cna', 'registered nurse', 'lpn', 'hha', 'cpr'],
    label: 'Background Check',
  },
];

async function handleJobFailure(
  jobId: string,
  errorMessage: string,
  currentAttempts: number
): Promise<void> {
  const shouldRetry = currentAttempts < MAX_RETRIES;

  if (shouldRetry) {
    const delaySeconds = RETRY_DELAYS[currentAttempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const retryAt = new Date(Date.now() + delaySeconds * 1000);

    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        error: errorMessage,
        retryAt,
        metadata: {
          lastError: errorMessage,
          lastErrorAt: new Date().toISOString(),
          retryScheduledFor: retryAt.toISOString(),
        } as never,
      },
    });

    console.log(`Job ${jobId} failed (attempt ${currentAttempts}). Retrying at ${retryAt.toISOString()}`);
  } else {
    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: errorMessage,
        processingCompletedAt: new Date(),
        result: {
          success: false,
          error: errorMessage,
          totalAttempts: currentAttempts,
        } as never,
      },
    });

    const job = await prisma.credentialParsingJob.findUnique({
      where: { id: jobId },
      select: { documentId: true },
    });

    if (job) {
      await prisma.staffCredential.update({
        where: { id: job.documentId },
        data: {
          reviewStatus: 'PENDING_REVIEW',
          reviewNotes: `Automatic parsing failed after ${currentAttempts} attempts: ${errorMessage}`,
        },
      });
    }

    console.error(`Job ${jobId} permanently failed after ${currentAttempts} attempts`);
  }
}

async function cleanupStaleJobs(): Promise<number> {
  const staleThreshold = new Date(Date.now() - JOB_TIMEOUT_SECONDS * 1000);

  const staleJobs = await prisma.credentialParsingJob.findMany({
    where: {
      status: 'PROCESSING',
      processingStartedAt: { lt: staleThreshold },
    },
    select: { id: true, attemptCount: true },
  });

  let resetCount = 0;
  for (const job of staleJobs) {
    await handleJobFailure(job.id, 'Job timed out (exceeded processing time limit)', job.attemptCount);
    resetCount++;
  }

  if (resetCount > 0) {
    console.log(`Reset ${resetCount} stale jobs`);
  }

  return resetCount;
}

async function processJob(jobId: string): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Lock job for processing (optimistic lock — only pick up PENDING jobs)
    const job = await prisma.credentialParsingJob.update({
      where: { id: jobId, status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    console.log(`Processing job ${jobId} (attempt ${job.attemptCount}/${MAX_RETRIES})`);

    // Prefer CredentialFile rows (multi-file); fall back to job-level s3Key for legacy jobs
    const credentialFiles = await prisma.credentialFile.findMany({
      where: { credentialId: job.documentId },
      orderBy: { sortOrder: 'asc' },
    });

    const docTypeRecord = await prisma.staffCredential.findUnique({
      where: { id: job.documentId },
      select: { documentType: { select: { category: true } } },
    });
    const docCategory = docTypeRecord?.documentType?.category ?? undefined;

    const result = credentialFiles.length > 0
      ? await parseCredentialFiles(
          credentialFiles.map((f) => ({
            s3Key: f.s3Key,
            pageRole: f.pageRole,
            pageNumber: f.pageNumber ?? undefined,
            fileName: f.fileName,
            mimeType: f.mimeType,
          })),
          job.documentTypeName ?? 'Unknown',
          undefined,
          docCategory
        )
      : await parseCredentialDocument(
          job.s3Key,
          job.fileName,
          job.mimeType,
          job.documentTypeName ?? 'Unknown',
          docCategory
        );

    if (!result.success || !result.data) {
      await handleJobFailure(jobId, result.error || 'Unknown parsing error', job.attemptCount);
      return false;
    }

    const parsedData = result.data;

    const existing = await prisma.staffCredential.findUnique({
      where: { id: job.documentId },
      select: {
        issueDate: true,
        expirationDate: true,
        staffMemberId: true,
        documentType: { select: { expirationDays: true, category: true } },
      },
    });

    // ── Name match check ──────────────────────────────────────────────────────
    let nameMatchResult: 'matched' | 'mismatch' | 'not_found' = 'not_found';
    let nameMismatchNote: string | null = null;

    if (existing?.staffMemberId && parsedData.credentialHolderName) {
      const staffMember = await prisma.staffMember.findUnique({
        where: { id: existing.staffMemberId },
        select: { firstName: true, lastName: true },
      });

      if (staffMember) {
        const extractedName = parsedData.credentialHolderName.toLowerCase().trim();
        const staffFirst = staffMember.firstName.toLowerCase();
        const staffLast = staffMember.lastName.toLowerCase();

        if (extractedName.includes(staffFirst) && extractedName.includes(staffLast)) {
          nameMatchResult = 'matched';
        } else {
          nameMatchResult = 'mismatch';
          nameMismatchNote = `Name on document ("${parsedData.credentialHolderName}") does not match staff member ("${staffMember.firstName} ${staffMember.lastName}"). Verify the correct document was uploaded.`;
        }
      }
    }

    const ocrIssueDate = parsedData.issuedAt ? new Date(parsedData.issuedAt) : null;
    const ocrExpirationDate = parsedData.expiresAt ? new Date(parsedData.expiresAt) : null;

    const finalIssueDate = existing?.issueDate ?? ocrIssueDate;

    const expirationDays = existing?.documentType?.expirationDays ?? null;
    const derivedExpiration =
      finalIssueDate && expirationDays
        ? new Date(finalIssueDate.getTime() + expirationDays * 86_400_000)
        : null;
    const finalExpirationDate = existing?.expirationDate ?? ocrExpirationDate ?? derivedExpiration;

    // ── Date mismatch detection ───────────────────────────────────────────────
    const dateMismatchNotes: string[] = [];
    const ONE_DAY_MS = 86_400_000;

    if (existing?.issueDate && ocrIssueDate) {
      const diffMs = Math.abs(existing.issueDate.getTime() - ocrIssueDate.getTime());
      if (diffMs > ONE_DAY_MS) {
        dateMismatchNotes.push(
          `Issue date mismatch: user entered ${existing.issueDate.toISOString().slice(0, 10)}, OCR read ${parsedData.issuedAt}`
        );
      }
    }
    if (existing?.expirationDate && ocrExpirationDate) {
      const diffMs = Math.abs(existing.expirationDate.getTime() - ocrExpirationDate.getTime());
      if (diffMs > ONE_DAY_MS) {
        dateMismatchNotes.push(
          `Expiration date mismatch: user entered ${existing.expirationDate.toISOString().slice(0, 10)}, OCR read ${parsedData.expiresAt}`
        );
      }
    }

    const hasMismatch = dateMismatchNotes.length > 0;
    const mismatchNote = dateMismatchNotes.join(' | ');

    // ── Document type mismatch check ─────────────────────────────────────────
    let categoryMismatchNote: string | null = null;
    const filedTypeName = job.documentTypeName?.toLowerCase() ?? '';
    const extractedType = parsedData.credentialType?.toLowerCase() ?? '';
    const extractedIssuer = parsedData.issuer?.toLowerCase() ?? '';

    const filedSignals = DOC_TYPE_SIGNALS[filedTypeName];
    if (filedSignals && extractedIssuer) {
      const issuerMatchesFiled = filedSignals.issuers.some((s) => extractedIssuer.includes(s));

      if (!issuerMatchesFiled) {
        const detectedEntry = Object.entries(DOC_TYPE_SIGNALS).find(
          ([name, signals]) =>
            name !== filedTypeName &&
            signals.issuers.some((s) => extractedIssuer.includes(s))
        );

        if (detectedEntry) {
          const [detectedName] = detectedEntry;
          categoryMismatchNote = `Document type mismatch: filed under "${job.documentTypeName}" but the issuer "${parsedData.issuer}" indicates this is a "${detectedName}". Verify the correct document was uploaded.`;
        }
      }
    }

    // ── License / certification keyword mismatch check ───────────────────────
    if (!categoryMismatchNote && extractedType && filedTypeName) {
      const matchedRule = LICENSE_TYPE_KEYWORDS.find((rule) =>
        rule.filedContains.some((kw) => filedTypeName.includes(kw))
      );

      if (matchedRule) {
        const extractedMatchesMust = matchedRule.mustMatch.some((kw) => extractedType.includes(kw));
        const extractedMatchesForbidden = matchedRule.forbiddenMatch.some((kw) => extractedType.includes(kw));

        if (!extractedMatchesMust || extractedMatchesForbidden) {
          const credentialTypeDisplay = parsedData.credentialType || 'unknown credential type';
          categoryMismatchNote = `Document type mismatch: filed under "${job.documentTypeName}" but AI identified this as "${credentialTypeDisplay}". Verify the correct document was uploaded.`;
        }
      }
    }

    const requiresReview = parsedData.requiresReview || hasMismatch || nameMatchResult === 'mismatch' || !!categoryMismatchNote;
    const reviewReason = [parsedData.reviewReason, mismatchNote, nameMismatchNote, categoryMismatchNote].filter(Boolean).join(' | ') || null;

    await prisma.staffCredential.update({
      where: { id: job.documentId },
      data: {
        issuer: parsedData.issuer,
        licenseNumber: parsedData.licenseNumber,
        verificationUrl: parsedData.verificationUrl,
        issueDate: finalIssueDate,
        expirationDate: finalExpirationDate,
        aiParsedData: {
          ...parsedData,
          parsedAt: new Date().toISOString(),
          ocrProvider: result.ocrProvider,
          tokensUsed: result.tokensUsed,
          ocrIssuedAt: parsedData.issuedAt,
          ocrExpiresAt: parsedData.expiresAt,
          dateMismatch: hasMismatch ? dateMismatchNotes : undefined,
          nameMatch: nameMatchResult,
          categoryMatch: categoryMismatchNote ? 'mismatch' : (filedTypeName ? 'matched' : 'not_checked'),
        } as never,
        aiConfidence: parsedData.confidence,
        aiParsedAt: new Date(),
        aiParsedBy: 'gpt-4o',
        reviewStatus: requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
        reviewNotes: reviewReason,
        complianceCheckedAt: new Date(),
      },
    });

    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        processingCompletedAt: new Date(),
        result: {
          success: true,
          confidence: parsedData.confidence,
          requiresReview,
          reviewReason,
          dateMismatch: hasMismatch,
          nameMatch: nameMatchResult,
          tokensUsed: result.tokensUsed,
          ocrProvider: result.ocrProvider,
          processingTimeMs: Date.now() - startTime,
        } as never,
      },
    });

    console.log(`Job ${jobId} completed successfully (confidence: ${(parsedData.confidence * 100).toFixed(0)}%)`);
    return true;
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);

    const job = await prisma.credentialParsingJob.findUnique({
      where: { id: jobId },
      select: { attemptCount: true },
    });

    await handleJobFailure(
      jobId,
      error instanceof Error ? error.message : String(error),
      job?.attemptCount || 1
    );

    return false;
  }
}

/**
 * Process the credential parsing queue (called by cron in both apps).
 *
 * @param batchSize Number of jobs to process per run (default: 5)
 */
export async function processParsingQueue(
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  staleJobsReset: number;
  queueSize: number;
  processingTimeMs: number;
}> {
  const startTime = Date.now();

  try {
    console.log('Starting parsing queue processor...');

    const staleJobsReset = await cleanupStaleJobs();

    const pendingJobs = await prisma.credentialParsingJob.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { retryAt: null },
          { retryAt: { lt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (pendingJobs.length === 0) {
      console.log('No pending jobs to process');
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        staleJobsReset,
        queueSize: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    console.log(`Processing ${pendingJobs.length} jobs...`);

    let succeeded = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      const success = await processJob(job.id);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    const queueSize = await prisma.credentialParsingJob.count({
      where: { status: { in: ['PENDING', 'PROCESSING'] } },
    });

    const summary = {
      processed: pendingJobs.length,
      succeeded,
      failed,
      staleJobsReset,
      queueSize,
      processingTimeMs: Date.now() - startTime,
    };

    console.log('Queue processing complete:', summary);
    return summary;
  } catch (error) {
    console.error('Error processing parsing queue:', error);
    throw error;
  }
}
