/**
 * Individual Job Management API
 *
 * GET /api/internal/parsing/[jobId] - Get job status
 * POST /api/internal/parsing/[jobId]/retry - Retry failed job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus, retryFailedJob, cancelJob } from '@/lib/jobQueue';
import { requireAuth, requirePlatformAdmin } from '@/lib/authHelpers';

/**
 * GET - Get job status
 * Any authenticated user can check their job status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { jobId } = await params;

    // Get job status
    const status = await getJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        ...status,
      },
    });
  } catch (error) {
    console.error('Error fetching job status:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch job status',
      },
      { status: error instanceof Error && error.message.includes('required') ? 401 : 500 }
    );
  }
}

/**
 * POST - Retry or cancel job
 *
 * Request body:
 * {
 *   action: "retry" | "cancel"
 * }
 *
 * Platform admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { jobId } = await params;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (!action || !['retry', 'cancel'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "retry" or "cancel".',
        },
        { status: 400 }
      );
    }

    let success: boolean;
    let message: string;

    if (action === 'retry') {
      success = await retryFailedJob(jobId);
      message = success ? 'Job queued for retry' : 'Failed to retry job';
    } else {
      success = await cancelJob(jobId);
      message = success ? 'Job cancelled' : 'Failed to cancel job';
    }

    return NextResponse.json({
      success,
      message,
    });
  } catch (error) {
    console.error('Error performing job action:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform action',
      },
      { status: error instanceof Error && error.message.includes('required') ? 401 : 500 }
    );
  }
}

/**
 * DELETE - Cancel a job
 * Platform admin only
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { jobId } = await params;

    const success = await cancelJob(jobId);

    return NextResponse.json({
      success,
      message: success ? 'Job cancelled' : 'Failed to cancel job',
    });
  } catch (error) {
    console.error('Error cancelling job:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel job',
      },
      { status: error instanceof Error && error.message.includes('required') ? 401 : 500 }
    );
  }
}
