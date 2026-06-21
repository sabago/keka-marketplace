import { NextRequest, NextResponse } from 'next/server';
import { processParsingQueue } from '@mhc/credential-core';

function verifyCronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  return !!token && token === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const start = Date.now();
  try {
    const result = await processParsingQueue(5);
    return NextResponse.json({ success: true, ...result, executionTimeMs: Date.now() - start });
  } catch (err) {
    console.error('[CT-CRON] process-parsing error:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
