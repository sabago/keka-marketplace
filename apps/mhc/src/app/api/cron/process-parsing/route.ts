/**
 * Vercel Cron Job Handler
 *
 * Processes credential parsing queue every minute
 *
 * GET /api/cron/process-parsing
 *
 * Called by Vercel Cron: every minute (* * * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processParsingQueue } from '@/lib/jobQueue';

/**
 * GET - Process parsing queue
 *
 * This endpoint is called by Vercel Cron every minute
 * It processes up to 5 jobs per run to stay within execution limits
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify this is a legitimate cron request
    // Vercel cron jobs include a special header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production') {
      if (!authHeader || !cronSecret) {
        console.error('Missing cron authorization');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Vercel sends "Bearer <secret>"
      const token = authHeader.replace('Bearer ', '');
      if (token !== cronSecret) {
        console.error('Invalid cron secret');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[CRON] Processing parsing queue...');

    // Process up to 5 jobs per cron run
    // Vercel cron has a 10-second execution limit on Hobby plan
    // Each job takes ~2-5 seconds, so 5 jobs is safe
    const batchSize = 5;

    const result = await processParsingQueue(batchSize);

    const executionTime = Date.now() - startTime;

    console.log('[CRON] Queue processing complete:', {
      ...result,
      executionTimeMs: executionTime,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
      executionTimeMs: executionTime,
      message: `Processed ${result.processed} jobs in ${executionTime}ms`,
    });
  } catch (error) {
    console.error('[CRON] Error processing queue:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Alternative endpoint for manual triggering
 * Can be used for testing or manual queue processing
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
