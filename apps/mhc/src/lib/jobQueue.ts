/**
 * Job Queue System for Background Processing
 *
 * Database-backed job queue for asynchronous credential parsing
 * Compatible with Vercel's serverless architecture
 *
 * Flow:
 * 1. Upload endpoint enqueues parsing job
 * 2. Vercel Cron runs every minute
 * 3. Cron processes pending jobs in batches
 * 4. Results stored in database, employee notified
 *
 * Usage:
 *   // Enqueue job after upload
 *   await enqueueParsingJob(credentialId, s3Key, fileName, mimeType);
 *
 *   // Process queue (called by cron)
 *   await processParsingQueue(batchSize);
 */

import { parseCredentialDocument, parseCredentialFiles, type ParsedCredentialData } from './credentialParser';
import { prisma } from './db';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds: 1min, 5min, 15min
const JOB_TIMEOUT_SECONDS = 600; // 10 minutes (Tesseract cold start can take several minutes)
const DEFAULT_BATCH_SIZE = 5; // Process 5 jobs per cron run

/**
 * Job status enum (matches Prisma schema)
 */
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Enqueue a new parsing job
 *
 * @param credentialId ID of EmployeeDocument record
 * @param s3Key S3 key of uploaded file
 * @param fileName Original file name
 * @param mimeType MIME type
 * @param agencyId Agency ID (for scoping)
 * @returns Created job record
 */
export async function enqueueParsingJob(
  credentialId: string,
  s3Key: string,
  fileName: string,
  mimeType: string,
  agencyId: string
): Promise<{ jobId: string; queuePosition: number }> {
  try {
    // Check if job already exists for this credential
    const existingJob = await prisma.credentialParsingJob.findFirst({
      where: {
        documentId: credentialId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingJob) {
      console.log(`Parsing job already exists for credential ${credentialId}: ${existingJob.id}`);
      return {
        jobId: existingJob.id,
        queuePosition: await getQueuePosition(existingJob.id),
      };
    }

    // Get document type name for parsing hint
    const credential = await prisma.staffCredential.findUnique({
      where: { id: credentialId },
      include: { documentType: true },
    });

    if (!credential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    const documentTypeName = credential.documentType?.name || 'Unknown';

    // Create new job
    const job = await prisma.credentialParsingJob.create({
      data: {
        documentId: credentialId,
        agencyId,
        s3Key,
        fileName,
        mimeType,
        documentTypeName,
        status: 'PENDING',
        attemptCount: 0,
        metadata: {
          enqueuedAt: new Date().toISOString(),
          documentTypeId: credential.documentTypeId,
        },
      },
    });

    const queuePosition = await getQueuePosition(job.id);

    console.log(`Enqueued parsing job ${job.id} for credential ${credentialId} (position ${queuePosition})`);

    return { jobId: job.id, queuePosition };
  } catch (error) {
    console.error('Error enqueuing parsing job:', error);
    throw error;
  }
}

/**
 * Get queue position for a job
 *
 * @param jobId Job ID
 * @returns Position in queue (1-indexed)
 */
async function getQueuePosition(jobId: string): Promise<number> {
  const job = await prisma.credentialParsingJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return 0;

  const position = await prisma.credentialParsingJob.count({
    where: {
      status: { in: ['PENDING', 'PROCESSING'] },
      createdAt: { lt: job.createdAt },
    },
  });

  return position + 1;
}

/**
 * Process a single parsing job
 *
 * @param jobId Job ID to process
 * @returns Success status
 */
async function processJob(jobId: string): Promise<boolean> {
  const startTime = Date.now();

  try {
    // Lock job for processing
    const job = await prisma.credentialParsingJob.update({
      where: {
        id: jobId,
        status: 'PENDING', // Only pick up pending jobs (optimistic locking)
      },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    console.log(`Processing job ${jobId} (attempt ${job.attemptCount}/${MAX_RETRIES})`);

    // Parse credential — prefer CredentialFile rows (multi-file support);
    // fall back to job-level s3Key for legacy jobs that pre-date the migration.
    const credentialFiles = await prisma.credentialFile.findMany({
      where: { credentialId: job.documentId },
      orderBy: { sortOrder: 'asc' },
    });

    // Fetch document type category for category-specific prompt guidance
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
      // Parsing failed - determine if should retry
      await handleJobFailure(jobId, result.error || 'Unknown parsing error', job.attemptCount);
      return false;
    }

    // Parsing succeeded - update credential and complete job
    const parsedData = result.data;

    // Fetch existing user-provided dates + staff member name + document type config.
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
    // Verify the credential was issued to the correct staff member.
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

    // Use user-provided if present; fall back to OCR
    const finalIssueDate = existing?.issueDate ?? ocrIssueDate;

    // Expiration priority: user-provided → OCR-extracted → derived from issueDate + expirationDays
    const expirationDays = existing?.documentType?.expirationDays ?? null;
    const derivedExpiration =
      finalIssueDate && expirationDays
        ? new Date(finalIssueDate.getTime() + expirationDays * 86_400_000)
        : null;
    const finalExpirationDate = existing?.expirationDate ?? ocrExpirationDate ?? derivedExpiration;

    // Detect discrepancies (>1 day difference) for admin visibility
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
    // Compare what GPT identified vs. the specific document type it was filed under.
    // Keyed by document type name (lowercase) → keywords that should appear in credentialType.
    // ── Document type mismatch check ─────────────────────────────────────────
    // Match against issuer + credentialType combined — the issuer is the most
    // reliable discriminator between document types in the same category
    // (e.g. DCJIS = CORI, SAM.gov = SAM.gov exclusion, OIG = OIG exclusion).
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

    let categoryMismatchNote: string | null = null;
    const filedTypeName = job.documentTypeName?.toLowerCase() ?? '';
    const extractedType = parsedData.credentialType?.toLowerCase() ?? '';
    const extractedIssuer = parsedData.issuer?.toLowerCase() ?? '';

    const filedSignals = DOC_TYPE_SIGNALS[filedTypeName];
    if (filedSignals && extractedIssuer) {
      const issuerMatchesFiled = filedSignals.issuers.some((s) => extractedIssuer.includes(s));

      if (!issuerMatchesFiled) {
        // Issuer doesn't match — find what the issuer actually belongs to
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
    // For document types not covered by DOC_TYPE_SIGNALS (i.e. license and certification
    // types), compare GPT's extracted credentialType against keywords expected for the
    // filed document type name.  A filed "CNA Certificate" should not match a PT license.
    // Only fires when the issuer-based check above did NOT already set categoryMismatchNote.
    if (!categoryMismatchNote && extractedType && filedTypeName) {
      // Map of substrings in filed type name → keywords that should appear in credentialType.
      // Each entry: { must: at least one keyword must match; forbidden: none of these may match }
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

    // Require review if AI flagged it, date discrepancy, name mismatch, or category mismatch
    const requiresReview = parsedData.requiresReview || hasMismatch || nameMatchResult === 'mismatch' || !!categoryMismatchNote;
    const reviewReason = [parsedData.reviewReason, mismatchNote, nameMismatchNote, categoryMismatchNote].filter(Boolean).join(' | ') || null;

    // Update credential with parsed data
    await prisma.staffCredential.update({
      where: { id: job.documentId },
      data: {
        // Parsed metadata — user-provided dates win; OCR fills gaps
        issuer: parsedData.issuer,
        licenseNumber: parsedData.licenseNumber,
        verificationUrl: parsedData.verificationUrl,
        issueDate: finalIssueDate,
        expirationDate: finalExpirationDate,

        // AI metadata
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
        } as any,
        aiConfidence: parsedData.confidence,
        aiParsedAt: new Date(),
        aiParsedBy: 'gpt-4o',

        // Review status — escalate if date discrepancy or name mismatch found
        reviewStatus: requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
        reviewNotes: reviewReason,

        // Compliance will be checked later by compliance checker
        complianceCheckedAt: new Date(),
      },
    });

    // Mark job as completed
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
        } as any,
      },
    });

    console.log(`Job ${jobId} completed successfully (confidence: ${(parsedData.confidence * 100).toFixed(0)}%)`);

    return true;
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);

    // Get current attempt count
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
 * Handle job failure with retry logic
 *
 * @param jobId Job ID
 * @param errorMessage Error description
 * @param currentAttempts Current number of attempts
 */
async function handleJobFailure(
  jobId: string,
  errorMessage: string,
  currentAttempts: number
): Promise<void> {
  const shouldRetry = currentAttempts < MAX_RETRIES;

  if (shouldRetry) {
    // Calculate next retry time
    const delaySeconds = RETRY_DELAYS[currentAttempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const retryAt = new Date(Date.now() + delaySeconds * 1000);

    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING', // Reset to pending for retry
        error: errorMessage,
        retryAt,
        metadata: {
          lastError: errorMessage,
          lastErrorAt: new Date().toISOString(),
          retryScheduledFor: retryAt.toISOString(),
        } as any,
      },
    });

    console.log(`Job ${jobId} failed (attempt ${currentAttempts}). Retrying at ${retryAt.toISOString()}`);
  } else {
    // Max retries exceeded - mark as failed
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
        } as any,
      },
    });

    // Mark credential for manual review
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

/**
 * Clean up stale jobs that are stuck in PROCESSING
 *
 * @returns Number of jobs reset
 */
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
    await handleJobFailure(
      job.id,
      'Job timed out (exceeded processing time limit)',
      job.attemptCount
    );
    resetCount++;
  }

  if (resetCount > 0) {
    console.log(`Reset ${resetCount} stale jobs`);
  }

  return resetCount;
}

/**
 * Process parsing queue (called by cron job)
 *
 * @param batchSize Number of jobs to process in this run
 * @returns Processing summary
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

    // Clean up stale jobs first
    const staleJobsReset = await cleanupStaleJobs();

    // Get pending jobs (ready to process)
    const pendingJobs = await prisma.credentialParsingJob.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { retryAt: null },
          { retryAt: { lt: new Date() } }, // Retry time has passed
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

    // Process jobs sequentially (to avoid rate limits and memory issues)
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

    // Get remaining queue size
    const queueSize = await prisma.credentialParsingJob.count({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
      },
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

/**
 * Get job status
 *
 * @param jobId Job ID
 * @returns Job details
 */
export async function getJobStatus(jobId: string): Promise<{
  status: JobStatus;
  attempts: number;
  queuePosition?: number;
  error?: string;
  result?: any;
  estimatedWaitSeconds?: number;
} | null> {
  const job = await prisma.credentialParsingJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return null;

  const response: any = {
    status: job.status,
    attempts: job.attemptCount,
    error: job.error,
    result: job.result,
  };

  if (job.status === 'PENDING') {
    response.queuePosition = await getQueuePosition(jobId);
    // Rough estimate: 30 seconds per job ahead
    response.estimatedWaitSeconds = response.queuePosition * 30;
  }

  return response;
}

/**
 * Get queue statistics
 *
 * @returns Queue metrics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalJobs: number;
  oldestPendingAge?: number; // seconds
}> {
  const [pending, processing, completed, failed, total, oldestPending] = await Promise.all([
    prisma.credentialParsingJob.count({ where: { status: 'PENDING' } }),
    prisma.credentialParsingJob.count({ where: { status: 'PROCESSING' } }),
    prisma.credentialParsingJob.count({ where: { status: 'COMPLETED' } }),
    prisma.credentialParsingJob.count({ where: { status: 'FAILED' } }),
    prisma.credentialParsingJob.count(),
    prisma.credentialParsingJob.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  const stats: any = {
    pending,
    processing,
    completed,
    failed,
    totalJobs: total,
  };

  if (oldestPending) {
    stats.oldestPendingAge = Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000);
  }

  return stats;
}

/**
 * Retry a failed job
 *
 * @param jobId Job ID
 * @returns Success status
 */
export async function retryFailedJob(jobId: string): Promise<boolean> {
  try {
    const job = await prisma.credentialParsingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'FAILED') {
      throw new Error('Only failed jobs can be manually retried');
    }

    // Reset job to pending with attempt count reset
    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        error: null,
        retryAt: null,
        metadata: {
          ...(job.metadata as any),
          manuallyRetriedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`Manually retried job ${jobId}`);
    return true;
  } catch (error) {
    console.error('Error retrying job:', error);
    return false;
  }
}

/**
 * Cancel a pending job
 *
 * @param jobId Job ID
 * @returns Success status
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const job = await prisma.credentialParsingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    if (!['PENDING', 'PROCESSING'].includes(job.status)) {
      throw new Error('Only pending or processing jobs can be cancelled');
    }

    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        error: 'Cancelled by user',
        processingCompletedAt: new Date(),
      },
    });

    console.log(`Cancelled job ${jobId}`);
    return true;
  } catch (error) {
    console.error('Error cancelling job:', error);
    return false;
  }
}
