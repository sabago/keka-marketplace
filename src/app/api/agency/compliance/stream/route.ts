/**
 * GET /api/agency/compliance/stream
 *
 * Server-Sent Events endpoint that streams live compliance stats every 30 seconds.
 * Payload: { expiredCount, expiringSoonCount, complianceRate, lastUpdated }
 *
 * Uses Node.js runtime (required for setInterval — Edge Runtime does not support it).
 */

import { NextRequest } from 'next/server';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

async function getComplianceCounts(agencyId: string) {
  const [total, expired, expiringSoon] = await Promise.all([
    prisma.staffCredential.count({ where: { staffMember: { agencyId } } }),
    prisma.staffCredential.count({ where: { staffMember: { agencyId }, status: 'EXPIRED' } }),
    prisma.staffCredential.count({ where: { staffMember: { agencyId }, status: 'EXPIRING_SOON' } }),
  ]);

  const active = total - expired - expiringSoon;
  const complianceRate = total > 0 ? Math.round(((active + expiringSoon) / total) * 100) : 100;

  return {
    expiredCount: expired,
    expiringSoonCount: expiringSoon,
    complianceRate,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  let agencyId: string;
  try {
    const { agency } = await requireAgencyAdmin();
    agencyId = agency.id;
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data immediately
      try {
        const data = await getComplianceCounts(agencyId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch (err) {
        console.error('[SSE] Initial fetch error:', err);
      }

      // Poll every 30 seconds
      intervalId = setInterval(async () => {
        if (request.signal.aborted) {
          clearInterval(intervalId);
          controller.close();
          return;
        }
        try {
          const data = await getComplianceCounts(agencyId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          console.error('[SSE] Poll error:', err);
        }
      }, 30_000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
