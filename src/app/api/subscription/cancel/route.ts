/**
 * Cancel Subscription
 *
 * POST /api/subscription/cancel
 *
 * Cancels an agency's subscription at the end of the billing period.
 * The subscription will remain active until the period ends.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { SubscriptionStatus } from '@prisma/client';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agencyId, immediate = false } = body;

    // Validate required fields
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing required field: agencyId' },
        { status: 400 }
      );
    }

    // Get agency with subscription details
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        stripeSubscriptionId: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    if (!agency.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Cancel the subscription in Stripe
    // By default, cancel at period end (immediate=false)
    const subscription = await stripe.subscriptions.update(
      agency.stripeSubscriptionId,
      {
        cancel_at_period_end: !immediate,
        ...(immediate && { cancel_at: Math.floor(Date.now() / 1000) }),
      }
    );

    // Update agency status
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELED,
      },
    });

    return NextResponse.json({
      success: true,
      message: immediate
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the billing period',
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
