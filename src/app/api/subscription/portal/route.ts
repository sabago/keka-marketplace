/**
 * Create Billing Portal Session
 *
 * POST /api/subscription/portal
 *
 * Creates a Stripe billing portal session for managing subscriptions,
 * payment methods, and viewing billing history.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
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
    const { agencyId } = body;
    const stripe = getStripe();

    // Validate required fields
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing required field: agencyId' },
        { status: 400 }
      );
    }

    // Get agency with Stripe customer ID
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    if (!agency.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: agency.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription`,
    });

    // Return the portal URL
    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
