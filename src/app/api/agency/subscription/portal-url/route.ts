import { NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/subscription/portal-url
 * Returns a Stripe billing portal session URL for the agency admin to manage their payment method.
 */
export async function GET() {
  try {
    const { agency: { id: agencyId } } = await requireAgencyAdmin();

    const agencyData = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { stripeCustomerId: true },
    });

    if (!agencyData?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: agencyData.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/agency/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating billing portal session:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
