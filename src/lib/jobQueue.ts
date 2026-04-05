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

import { parseCredentialDocument, type ParsedCredentialData } from './credentialParser';
import { prisma } from './db';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [60, 300, 900]; // seconds: 1min, 5min, 15min
const JOB_TIMEOUT_SECONDS = 120; // 2 minutes
const DEFAULT_BATCH_SIZE = 5; // Process 5 jobs per cron run

/**
 * Job status enum (matches Prisma schema)
 */
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ABANDONED';

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
        credentialId,
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
    const credential = await prisma.employeeDocument.findUnique({
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
        credentialId,
        agencyId,
        s3Key,
        fileName,
        mimeType,
        documentTypeName,
        status: 'PENDING',
        attempts: 0,
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
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    console.log(`Processing job ${jobId} (attempt ${job.attempts}/${MAX_RETRIES})`);

    // Parse credential
    const result = await parseCredentialDocument(
      job.s3Key,
      job.fileName,
      job.mimeType,
      job.documentTypeName
    );

    if (!result.success || !result.data) {
      // Parsing failed - determine if should retry
      await handleJobFailure(jobId, result.error || 'Unknown parsing error', job.attempts);
      return false;
    }

    // Parsing succeeded - update credential and complete job
    const parsedData = result.data;

    // Update credential with parsed data
    await prisma.employeeDocument.update({
      where: { id: job.credentialId },
      data: {
        // Parsed metadata
        issuer: parsedData.issuer,
        licenseNumber: parsedData.licenseNumber,
        verificationUrl: parsedData.verificationUrl,
        issueDate: parsedData.issuedAt ? new Date(parsedData.issuedAt) : null,
        expirationDate: parsedData.expiresAt ? new Date(parsedData.expiresAt) : null,

        // AI metadata
        aiParsedData: {
          ...parsedData,
          parsedAt: new Date().toISOString(),
          ocrProvider: result.ocrProvider,
          tokensUsed: result.tokensUsed,
        } as any,
        aiConfidence: parsedData.confidence,
        aiParsedAt: new Date(),
        aiParsedBy: 'gpt-4-turbo',

        // Review status
        reviewStatus: parsedData.requiresReview ? 'PENDING_REVIEW' : 'APPROVED',
        reviewNotes: parsedData.reviewReason || null,

        // Compliance will be checked later by compliance checker
        complianceCheckedAt: new Date(),
      },
    });

    // Mark job as completed
    await prisma.credentialParsingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: {
          success: true,
          confidence: parsedData.confidence,
          requiresReview: parsedData.requiresReview,
          reviewReason: parsedData.reviewReason,
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
      select: { attempts: true },
    });

    await handleJobFailure(
      jobId,
      error instanceof Error ? error.message : String(error),
      job?.attempts || 1
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
        completedAt: new Date(),
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
      select: { credentialId: true },
    });

    if (job) {
      await prisma.employeeDocument.update({
        where: { id: job.credentialId },
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
      startedAt: { lt: staleThreshold },
    },
    select: { id: true, attempts: true },
  });

  let resetCount = 0;

  for (const job of staleJobs) {
    await handleJobFailure(
      job.id,
      'Job timed out (exceeded processing time limit)',
      job.attempts
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
    attempts: job.attempts,
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
        attempts: 0,
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
        status: 'ABANDONED',
        error: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    console.log(`Cancelled job ${jobId}`);
    return true;
  } catch (error) {
    console.error('Error cancelling job:', error);
    return false;
  }
}
