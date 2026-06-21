import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@mhc/db';
import type Stripe from 'stripe';

const WEBHOOK_SECRET = process.env.CT_STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('CredTrack webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const agencyId = session.metadata?.agencyId;
        const plan     = session.metadata?.plan;
        if (!agencyId || !plan) {
          console.error('CredTrack webhook: missing agencyId/plan in session metadata');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const billingPeriodEnd = new Date(
          ((subscription as any).current_period_end ?? 0) * 1000
        );

        await prisma.credTrackSubscription.upsert({
          where: { agencyId },
          create: {
            agencyId,
            plan,
            status: 'ACTIVE',
            stripeCustomerId:     session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            billingPeriodEnd,
          },
          update: {
            plan,
            status: 'ACTIVE',
            stripeCustomerId:     session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            billingPeriodEnd,
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const agencyId = sub.metadata?.agencyId;
        if (!agencyId) break;

        const billingPeriodEnd = new Date(
          ((sub as any).current_period_end ?? 0) * 1000
        );

        // Derive status from Stripe status
        const status = sub.status === 'active'   ? 'ACTIVE'
                     : sub.status === 'past_due'  ? 'PAST_DUE'
                     : sub.status === 'canceled'  ? 'CANCELED'
                     : 'ACTIVE';

        // Derive plan from price ID
        const priceId = sub.items.data[0]?.price?.id ?? '';
        const { STRIPE_PRICES } = await import('@/lib/stripe');
        const plan = priceId === STRIPE_PRICES.ENTERPRISE ? 'ENTERPRISE'
                   : priceId === STRIPE_PRICES.GROWTH      ? 'GROWTH'
                   : undefined;

        await prisma.credTrackSubscription.update({
          where: { agencyId },
          data: {
            status,
            ...(plan && { plan }),
            billingPeriodEnd,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const agencyId = sub.metadata?.agencyId;
        if (!agencyId) break;

        await prisma.credTrackSubscription.update({
          where: { agencyId },
          data: { status: 'CANCELED', plan: 'STARTER' },
        });
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }
  } catch (err) {
    console.error('CredTrack webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
