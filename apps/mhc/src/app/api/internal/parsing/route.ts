/**
 * Internal Parsing API
 *
 * Endpoints for credential parsing job queue management
 *
 * GET /api/internal/parsing - Get queue statistics
 * POST /api/internal/parsing/process - Process queue (called by cron)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processParsingQueue, getQueueStats } from '@/lib/jobQueue';
import { requirePlatformAdmin, requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET - Batch job status poll (authenticated users) or queue statistics (platform admin)
 *
 * ?ids=id1,id2,id3  → returns status for those specific job IDs (any authenticated user)
 * no params          → returns full queue stats (platform admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const ids = req.nextUrl.searchParams.get('ids');

    if (ids) {
      // Batch job status poll — available to any authenticated user
      await requireAuth();
      const jobIds = ids.split(',').filter(Boolean).slice(0, 20); // cap at 20
      const jobs = await prisma.credentialParsingJob.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, status: true, error: true, result: true, attemptCount: true },
      });
      return NextResponse.json({ success: true, jobs });
    }

    // No ids param — return queue stats (platform admin only)
    await requirePlatformAdmin();
    const stats = await getQueueStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching parsing status:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch queue statistics',
      },
      { status: error instanceof Error && error.message.includes('required') ? 401 : 500 }
    );
  }
}

/**
 * POST - Process parsing queue
 *
 * This endpoint is called by:
 * 1. Vercel Cron job (every minute) - uses CRON_SECRET
 * 2. Platform admins (manual trigger) - uses NextAuth
 *
 * Request body (optional):
 * {
 *   batchSize?: number (default: 5)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authorization (cron secret OR platform admin)
    const cronSecret = req.headers.get('x-cron-secret');
    const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    let isPlatformAdmin = false;
    try {
      await requirePlatformAdmin();
      isPlatformAdmin = true;
    } catch (error) {
      // Not authenticated as admin
    }

    if (!isValidCron && !isPlatformAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. This endpoint requires cron secret or platform admin access.',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;

    // Validate batch size
    if (typeof batchSize !== 'number' || batchSize < 1 || batchSize > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid batch size. Must be between 1 and 50.',
        },
        { status: 400 }
      );
    }

    // Process queue
    console.log(`Processing queue with batch size ${batchSize} (triggered by ${isValidCron ? 'cron' : 'admin'})`);

    const result = await processParsingQueue(batchSize);

    return NextResponse.json({
      success: true,
      result,
      message: `Processed ${result.processed} jobs (${result.succeeded} succeeded, ${result.failed} failed)`,
    });
  } catch (error) {
    console.error('Error processing parsing queue:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process parsing queue',
      },
      { status: 500 }
    );
  }
}
