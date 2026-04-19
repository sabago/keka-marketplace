/**
 * Create Subscription Checkout Session
 *
 * POST /api/subscription/create-checkout
 *
 * Creates a Stripe Checkout session for subscription purchase.
 * Accepts a priceId and agencyId to create a checkout session.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getOrCreateStripeCustomer, getPlanAndSizeFromPriceId } from '@/lib/subscriptionHelpers';
import { prisma } from '@/lib/db';

// Lazy initialize Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripeInstance;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, agencyId } = body;

    // Validate required fields
    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing required field: priceId' },
        { status: 400 }
      );
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing required field: agencyId' },
        { status: 400 }
      );
    }

    // Validate price ID — must resolve to a known plan/size/cycle combination
    const planInfo = getPlanAndSizeFromPriceId(priceId);
    if (!planInfo) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Update agency size to match what they selected
    await prisma.agency.update({
      where: { id: agencyId },
      data: { agencySize: planInfo.agencySize },
    });

    // Get or create Stripe customer for the agency
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(agencyId, stripe);

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          agencyId,
        },
        trial_period_days: 14, // Optional: Add 14-day free trial
      },
      metadata: {
        agencyId,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    // Return the checkout session URL
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
