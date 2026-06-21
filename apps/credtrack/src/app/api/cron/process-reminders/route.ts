import { NextRequest, NextResponse } from 'next/server';
import { processCredentialReminders } from '@/lib/credentialReminders';

function verifyCronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  return !!token && token === process.env.CRON_SECRET;
}

/**
 * GET /api/cron/process-reminders
 * Sends expiration reminder emails for credentials expiring in 30 or 7 days.
 * Called daily at 9:00 AM by the Railway cron service.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  try {
    const result = await processCredentialReminders();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        checked:                    result.checked,
        remindersSent:              result.remindersSent,
        expiredNotificationsSent:   result.expiredNotificationsSent,
        errors:                     result.errors,
        executionTimeMs:            Date.now() - start,
      },
      details: result.details?.slice(0, 20),
    });
  } catch (err) {
    console.error('[CT-CRON] process-reminders error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
