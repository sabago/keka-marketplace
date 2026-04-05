/**
 * Change Subscription Plan
 *
 * POST /api/subscription/change-plan
 *
 * Updates an existing subscription to a new plan (upgrade or downgrade).
 * Stripe handles prorations automatically.
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { getPlanTypeFromPriceId } from '@/lib/subscriptionHelpers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agencyId, newPriceId } = body;

    // Validate required fields
    if (!agencyId) {
      return NextResponse.json(
        { error: 'Missing required field: agencyId' },
        { status: 400 }
      );
    }

    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Missing required field: newPriceId' },
        { status: 400 }
      );
    }

    // Validate price ID
    const validPriceIds = [
      process.env.STRIPE_PRICE_PRO,
      process.env.STRIPE_PRICE_BUSINESS,
      process.env.STRIPE_PRICE_ENTERPRISE,
    ];

    if (!validPriceIds.includes(newPriceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Get agency with subscription details
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        stripeSubscriptionId: true,
        subscriptionPlan: true,
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
        { error: 'No active subscription found. Please create a subscription first.' },
        { status: 400 }
      );
    }

    // Get the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      agency.stripeSubscriptionId
    );

    // Check if already on this plan
    const currentPriceId = subscription.items.data[0]?.price.id;
    if (currentPriceId === newPriceId) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      );
    }

    // Determine if this is an upgrade or downgrade
    const newPlanType = getPlanTypeFromPriceId(newPriceId);
    if (!newPlanType) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const planOrder = { FREE: 0, PRO: 1, BUSINESS: 2, ENTERPRISE: 3 };
    const isUpgrade = planOrder[newPlanType] > planOrder[agency.subscriptionPlan];

    // Update the subscription in Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      agency.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations', // Stripe automatically handles prorations
        billing_cycle_anchor: 'unchanged', // Keep the same billing date
      }
    );

    // Note: The webhook will handle updating the database with the new plan
    // This ensures consistency between Stripe and our database

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? `Successfully upgraded to ${newPlanType} plan`
        : `Successfully changed to ${newPlanType} plan`,
      isUpgrade,
      newPlan: newPlanType,
      proratedAmount: updatedSubscription.latest_invoice
        ? (updatedSubscription.latest_invoice as string)
        : null,
      effectiveDate: new Date(updatedSubscription.current_period_start * 1000),
      nextBillingDate: new Date(updatedSubscription.current_period_end * 1000),
    });
  } catch (error) {
    console.error('Error changing subscription plan:', error);

    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    // Handle generic errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to change subscription plan' },
      { status: 500 }
    );
  }
}
