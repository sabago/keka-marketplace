/**
 * Vercel Cron Job Handler - Credential Reminders
 *
 * Processes credential expiration reminders daily
 *
 * GET /api/cron/process-reminders
 *
 * Called by Vercel Cron: daily at 9:00 AM (0 9 * * *)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processCredentialReminders } from '@/lib/credentialReminders';

/**
 * GET - Process credential reminders
 *
 * This endpoint is called by Vercel Cron every day
 * Finds credentials expiring soon and sends reminder emails
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production') {
      if (!authHeader || !cronSecret) {
        console.error('[CRON-REMINDERS] Missing cron authorization');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Vercel sends "Bearer <secret>"
      const token = authHeader.replace('Bearer ', '');
      if (token !== cronSecret) {
        console.error('[CRON-REMINDERS] Invalid cron secret');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[CRON-REMINDERS] Processing credential reminders...');

    // Process reminders
    const result = await processCredentialReminders();

    const executionTime = Date.now() - startTime;

    console.log('[CRON-REMINDERS] Processing complete:', {
      ...result,
      executionTimeMs: executionTime,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        checked: result.checked,
        remindersSent: result.remindersSent,
        expiredNotificationsSent: result.expiredNotificationsSent,
        errors: result.errors,
        executionTimeMs: executionTime,
      },
      message: `Processed ${result.checked} credentials, sent ${result.remindersSent} expiring reminders and ${result.expiredNotificationsSent} expired notifications`,
      details: result.details.slice(0, 20), // Only return first 20 details to avoid huge responses
    });
  } catch (error) {
    console.error('[CRON-REMINDERS] Error processing reminders:', error);

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
 * Can be used for testing or manual reminder processing
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
