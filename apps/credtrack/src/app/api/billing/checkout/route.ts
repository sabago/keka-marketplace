import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES, type StripePricePlan } from '@/lib/stripe';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';

const CheckoutSchema = z.object({
  plan: z.enum(['GROWTH', 'ENTERPRISE']),
});

export async function POST(req: NextRequest) {
  try {
    const { orgId, isBundled } = await requireOrg();

    if (isBundled) {
      return NextResponse.json(
        { error: 'CredTrack is already included in your Mastering HomeCare subscription.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 });
    }

    const { plan } = parsed.data as { plan: StripePricePlan };
    const priceId = STRIPE_PRICES[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID for ${plan} is not configured.` },
        { status: 500 }
      );
    }

    // Retrieve or create Stripe customer
    const ctSub = await prisma.credTrackSubscription.findUnique({
      where: { agencyId: orgId },
      select: { stripeCustomerId: true },
    });

    const agency = await prisma.agency.findUnique({
      where: { id: orgId },
      select: { agencyName: true, primaryContactEmail: true },
    });

    let customerId = ctSub?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agency?.primaryContactEmail ?? undefined,
        name: agency?.agencyName ?? undefined,
        metadata: { agencyId: orgId },
      });
      customerId = customer.id;

      // Persist customer ID so the webhook can resolve orgId
      await prisma.credTrackSubscription.update({
        where: { agencyId: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?upgraded=1`,
      cancel_url:  `${baseUrl}/pricing?canceled=1`,
      metadata: { agencyId: orgId, plan },
      subscription_data: {
        metadata: { agencyId: orgId, plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 });
  }
}
