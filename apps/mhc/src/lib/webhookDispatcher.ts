/**
 * Webhook Dispatcher
 *
 * Dispatches events to registered webhook subscriptions.
 * Retries failed deliveries using exponential backoff (5m → 30m → 2h, max 3 attempts).
 * The retry sweep happens at dispatch time — no separate cron needed.
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

const DISPATCH_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]; // 5m, 30m, 2h
const MAX_ATTEMPTS = 3;

function sign(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function deliver(
  url: string,
  secret: string,
  event: string,
  payload: unknown
): Promise<{ status: number | null; body: string; success: boolean }> {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ event, timestamp, data: payload });
  const signature = sign(secret, body);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Timestamp': timestamp,
      },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const responseBody = await res.text().catch(() => '');
    return { status: res.status, body: responseBody.slice(0, 1000), success: res.ok };
  } catch (err: any) {
    return { status: null, body: err?.message ?? 'Delivery failed', success: false };
  }
}

/**
 * Sweep pending retries for a subscription before dispatching a new event.
 */
async function sweepRetries(subscriptionId: string, secret: string, url: string): Promise<void> {
  const pending = await (prisma as any).webhookDelivery.findMany({
    where: {
      subscriptionId,
      success: false,
      nextRetryAt: { lte: new Date() },
      attemptCount: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const delivery of pending) {
    const result = await deliver(url, secret, delivery.event, delivery.payload);
    const nextAttempt = delivery.attemptCount + 1;
    const nextRetry =
      nextAttempt < MAX_ATTEMPTS
        ? new Date(Date.now() + (RETRY_DELAYS_MS[nextAttempt] ?? RETRY_DELAYS_MS[2]))
        : null;

    await (prisma as any).webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        responseStatus: result.status,
        responseBody: result.body,
        success: result.success,
        attemptCount: nextAttempt,
        nextRetryAt: result.success ? null : nextRetry,
        deliveredAt: result.success ? new Date() : null,
      },
    });
  }
}

/**
 * Dispatch a webhook event to all active subscribers for an agency.
 * Fire-and-forget — call with `void dispatchWebhookEvent(...)`.
 */
export async function dispatchWebhookEvent(
  agencyId: string,
  event: string,
  payload: unknown
): Promise<void> {
  let subscriptions: { id: string; url: string; secretEncrypted: string }[] = [];

  try {
    subscriptions = await (prisma as any).webhookSubscription.findMany({
      where: {
        agencyId,
        active: true,
        events: { has: event },
      },
      select: { id: true, url: true, secretEncrypted: true },
    });
  } catch (err) {
    console.error('[webhook] Failed to fetch subscriptions:', err);
    return;
  }

  for (const sub of subscriptions) {
    let secret: string;
    try {
      secret = decrypt(sub.secretEncrypted);
    } catch (err) {
      console.error(`[webhook] Failed to decrypt secret for subscription ${sub.id}:`, err);
      continue;
    }

    // Sweep any pending retries first
    await sweepRetries(sub.id, secret, sub.url).catch((err) =>
      console.error(`[webhook] Retry sweep failed for ${sub.id}:`, err)
    );

    // Dispatch new event
    const result = await deliver(sub.url, secret, event, payload);

    await (prisma as any).webhookDelivery.create({
      data: {
        subscriptionId: sub.id,
        event,
        payload: payload as any,
        responseStatus: result.status,
        responseBody: result.body,
        success: result.success,
        attemptCount: 1,
        nextRetryAt: result.success ? null : new Date(Date.now() + RETRY_DELAYS_MS[0]),
        deliveredAt: result.success ? new Date() : null,
      },
    }).catch((err: unknown) => console.error('[webhook] Failed to record delivery:', err));
  }
}
