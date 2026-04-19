/**
 * Subscription Helper Functions
 *
 * Utilities for managing subscription plans, query limits, and billing.
 */

import { prisma } from '@/lib/db';
import { PlanType, SubscriptionStatus, AgencySize } from '@prisma/client';

// Query limits by plan type
const QUERY_LIMITS: Record<PlanType, number> = {
  FREE: 20,
  PRO: 200,
  BUSINESS: -1, // unlimited
  ENTERPRISE: -1, // unlimited
};

/**
 * Stripe Price IDs for each plan, agency size, and billing cycle combination
 *
 * Environment variables needed:
 * Monthly: STRIPE_PRICE_PRO_SMALL_MONTHLY, _MEDIUM_MONTHLY, _LARGE_MONTHLY (same pattern for BUSINESS, ENTERPRISE)
 * Annual:  STRIPE_PRICE_PRO_SMALL_ANNUAL,  _MEDIUM_ANNUAL,  _LARGE_ANNUAL
 *
 * Legacy env vars (STRIPE_PRICE_PRO_SMALL etc.) are still checked for backwards compatibility.
 */
const STRIPE_PRICES = {
  monthly: {
    FREE: { SMALL: undefined, MEDIUM: undefined, LARGE: undefined },
    PRO: {
      SMALL: process.env.STRIPE_PRICE_PRO_SMALL_MONTHLY || process.env.STRIPE_PRICE_PRO_SMALL,
      MEDIUM: process.env.STRIPE_PRICE_PRO_MEDIUM_MONTHLY || process.env.STRIPE_PRICE_PRO_MEDIUM,
      LARGE: process.env.STRIPE_PRICE_PRO_LARGE_MONTHLY || process.env.STRIPE_PRICE_PRO_LARGE,
    },
    BUSINESS: {
      SMALL: process.env.STRIPE_PRICE_BUSINESS_SMALL_MONTHLY || process.env.STRIPE_PRICE_BUSINESS_SMALL,
      MEDIUM: process.env.STRIPE_PRICE_BUSINESS_MEDIUM_MONTHLY || process.env.STRIPE_PRICE_BUSINESS_MEDIUM,
      LARGE: process.env.STRIPE_PRICE_BUSINESS_LARGE_MONTHLY || process.env.STRIPE_PRICE_BUSINESS_LARGE,
    },
    ENTERPRISE: {
      SMALL: process.env.STRIPE_PRICE_ENTERPRISE_SMALL_MONTHLY || process.env.STRIPE_PRICE_ENTERPRISE_SMALL,
      MEDIUM: process.env.STRIPE_PRICE_ENTERPRISE_MEDIUM_MONTHLY || process.env.STRIPE_PRICE_ENTERPRISE_MEDIUM,
      LARGE: process.env.STRIPE_PRICE_ENTERPRISE_LARGE_MONTHLY || process.env.STRIPE_PRICE_ENTERPRISE_LARGE,
    },
  },
  annual: {
    FREE: { SMALL: undefined, MEDIUM: undefined, LARGE: undefined },
    PRO: {
      SMALL: process.env.STRIPE_PRICE_PRO_SMALL_ANNUAL,
      MEDIUM: process.env.STRIPE_PRICE_PRO_MEDIUM_ANNUAL,
      LARGE: process.env.STRIPE_PRICE_PRO_LARGE_ANNUAL,
    },
    BUSINESS: {
      SMALL: process.env.STRIPE_PRICE_BUSINESS_SMALL_ANNUAL,
      MEDIUM: process.env.STRIPE_PRICE_BUSINESS_MEDIUM_ANNUAL,
      LARGE: process.env.STRIPE_PRICE_BUSINESS_LARGE_ANNUAL,
    },
    ENTERPRISE: {
      SMALL: process.env.STRIPE_PRICE_ENTERPRISE_SMALL_ANNUAL,
      MEDIUM: process.env.STRIPE_PRICE_ENTERPRISE_MEDIUM_ANNUAL,
      LARGE: process.env.STRIPE_PRICE_ENTERPRISE_LARGE_ANNUAL,
    },
  },
} as const;

/**
 * Default pricing structure (in USD per month)
 * Used for display purposes on the pricing page
 */
export const PLAN_PRICING: Record<PlanType, Record<AgencySize, number>> = {
  FREE: {
    SMALL: 0,
    MEDIUM: 0,
    LARGE: 0,
  },
  PRO: {
    SMALL: 49,
    MEDIUM: 99,
    LARGE: 149,
  },
  BUSINESS: {
    SMALL: 199,
    MEDIUM: 299,
    LARGE: 449,
  },
  ENTERPRISE: {
    SMALL: 499,
    MEDIUM: 799,
    LARGE: 1199,
  },
};

/**
 * Staff limits by agency size
 * Used to determine how many staff members can be invited
 */
export const STAFF_LIMITS: Record<AgencySize, number> = {
  SMALL: 10,   // Up to 10 staff members
  MEDIUM: 50,  // Up to 50 staff members
  LARGE: -1,   // Unlimited staff members
};

/**
 * Lifetime credential upload limits per plan type
 * FREE plan: 10 lifetime uploads (never resets — trial only)
 * Paid plans: unlimited
 */
export const CREDENTIAL_LIMITS: Record<PlanType, number> = {
  FREE: 10,
  PRO: -1,
  BUSINESS: -1,
  ENTERPRISE: -1,
};

export function getCredentialLimit(planType: PlanType): number {
  return CREDENTIAL_LIMITS[planType];
}

export function hasUnlimitedCredentials(planType: PlanType): boolean {
  return CREDENTIAL_LIMITS[planType] === -1;
}

// Error class for subscription-related errors
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code:
      | 'QUERY_LIMIT_REACHED'
      | 'SUBSCRIPTION_INACTIVE'
      | 'AGENCY_NOT_FOUND'
      | 'UPGRADE_REQUIRED'
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

/**
 * Get the query limit for a given plan type
 */
export function getQueryLimit(planType: PlanType): number {
  return QUERY_LIMITS[planType];
}

/**
 * Check if a plan has unlimited queries
 */
export function hasUnlimitedQueries(planType: PlanType): boolean {
  return QUERY_LIMITS[planType] === -1;
}

/**
 * Get the current subscription status and plan details for an agency
 */
export async function getSubscriptionStatus(agencyId: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      queriesThisMonth: true,
      queriesAllTime: true,
      billingPeriodStart: true,
      billingPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!agency) {
    throw new SubscriptionError('Agency not found', 'AGENCY_NOT_FOUND');
  }

  const queryLimit = getQueryLimit(agency.subscriptionPlan);
  const hasUnlimited = hasUnlimitedQueries(agency.subscriptionPlan);
  const queriesRemaining = hasUnlimited
    ? -1
    : Math.max(0, queryLimit - agency.queriesThisMonth);

  return {
    ...agency,
    queryLimit,
    queriesRemaining,
    hasUnlimitedQueries: hasUnlimited,
    isActive: agency.subscriptionStatus === SubscriptionStatus.ACTIVE,
  };
}

/**
 * Enforce query limits before allowing an AI query
 * Throws an error if the limit is reached or subscription is inactive
 */
export async function enforceQueryLimit(agencyId: string): Promise<void> {
  const status = await getSubscriptionStatus(agencyId);

  // Check if subscription is active
  if (!status.isActive) {
    throw new SubscriptionError(
      `Subscription is ${status.subscriptionStatus}. Please update your payment method or upgrade your plan.`,
      'SUBSCRIPTION_INACTIVE'
    );
  }

  // Check if agency has unlimited queries
  if (status.hasUnlimitedQueries) {
    return; // No limit to enforce
  }

  // Check if query limit is reached
  if (status.queriesThisMonth >= status.queryLimit) {
    throw new SubscriptionError(
      `Query limit reached (${status.queryLimit}/${status.queryLimit}). Please upgrade your plan to continue.`,
      'QUERY_LIMIT_REACHED'
    );
  }
}

/**
 * Increment the query count for an agency
 * Should be called after a successful AI query
 */
export async function incrementQueryCount(agencyId: string): Promise<void> {
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      queriesThisMonth: {
        increment: 1,
      },
      queriesAllTime: {
        increment: 1,
      },
    },
  });
}

/**
 * Reset the monthly query count for an agency
 * Called at the start of a new billing period
 */
export async function resetQueryCount(agencyId: string): Promise<void> {
  const now = new Date();

  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      queriesThisMonth: 0,
      lastQueryReset: now,
      billingPeriodStart: now,
      // Set billing period end to 1 month from now
      billingPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Check if billing period has ended and reset if needed
 * Returns true if reset was performed
 */
export async function checkAndResetBillingPeriod(
  agencyId: string
): Promise<boolean> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      billingPeriodEnd: true,
    },
  });

  if (!agency) {
    throw new SubscriptionError('Agency not found', 'AGENCY_NOT_FOUND');
  }

  const now = new Date();
  if (now >= agency.billingPeriodEnd) {
    await resetQueryCount(agencyId);
    return true;
  }

  return false;
}

/**
 * Update agency subscription details after Stripe event
 */
export async function updateSubscriptionFromStripe(
  agencyId: string,
  data: {
    planType?: PlanType;
    status?: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    billingPeriodStart?: Date;
    billingPeriodEnd?: Date;
    agencySize?: AgencySize;
  }
) {
  return await prisma.agency.update({
    where: { id: agencyId },
    data,
  });
}

/**
 * Get or create a Stripe customer for an agency
 */
export async function getOrCreateStripeCustomer(
  agencyId: string,
  stripe: any // Stripe instance
): Promise<string> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      stripeCustomerId: true,
      agencyName: true,
      primaryContactEmail: true,
      primaryContactName: true,
    },
  });

  if (!agency) {
    throw new SubscriptionError('Agency not found', 'AGENCY_NOT_FOUND');
  }

  // Return existing customer ID if available
  if (agency.stripeCustomerId) {
    return agency.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: agency.primaryContactEmail,
    name: agency.agencyName,
    metadata: {
      agencyId,
      primaryContactName: agency.primaryContactName,
    },
  });

  // Save customer ID to database
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

/**
 * Downgrade agency to FREE plan (used when subscription is canceled/expired)
 * NOTE: Does NOT reset queriesAllTime or credentialUploadsTotal — these are lifetime
 * counters. An agency that used up its free trial quota and then canceled should not
 * get a fresh bank of free queries/uploads.
 */
export async function downgradeToFree(agencyId: string): Promise<void> {
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      subscriptionPlan: PlanType.FREE,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      stripeSubscriptionId: null,
    },
  });
}

/**
 * Get plan name from Stripe price ID (legacy - for backwards compatibility)
 */
export function getPlanTypeFromPriceId(priceId: string): PlanType | null {
  const result = getPlanAndSizeFromPriceId(priceId);
  return result?.planType || null;
}

/**
 * Get plan type and agency size from Stripe price ID (checks both monthly and annual)
 */
export function getPlanAndSizeFromPriceId(priceId: string): {
  planType: PlanType;
  agencySize: AgencySize;
  billingCycle: 'monthly' | 'annual';
} | null {
  for (const billingCycle of ['monthly', 'annual'] as const) {
    for (const planType of Object.keys(STRIPE_PRICES[billingCycle]) as PlanType[]) {
      const sizes = STRIPE_PRICES[billingCycle][planType] as Record<string, string | undefined>;
      for (const agencySize of Object.keys(sizes) as AgencySize[]) {
        if (sizes[agencySize] === priceId) {
          return { planType, agencySize, billingCycle };
        }
      }
    }
  }
  return null;
}

/**
 * Get Stripe price ID for a specific plan, agency size, and billing cycle
 */
export function getPriceIdForPlan(
  planType: PlanType,
  agencySize: AgencySize,
  billingCycle: 'monthly' | 'annual' = 'monthly'
): string | null {
  const prices = STRIPE_PRICES[billingCycle][planType] as Record<string, string | undefined>;
  return prices?.[agencySize] || null;
}

/**
 * Get pricing amount for a specific plan and agency size
 */
export function getPricing(planType: PlanType, agencySize: AgencySize): number {
  return PLAN_PRICING[planType]?.[agencySize] || 0;
}

/**
 * Check if an agency can upload another credential document
 * FREE plan has a lifetime cap; paid plans are unlimited
 */
export async function canUploadCredential(agencyId: string): Promise<{
  canUpload: boolean;
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
}> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { subscriptionPlan: true, credentialUploadsTotal: true },
  });

  if (!agency) {
    throw new SubscriptionError('Agency not found', 'AGENCY_NOT_FOUND');
  }

  const limit = getCredentialLimit(agency.subscriptionPlan);
  const isUnlimited = hasUnlimitedCredentials(agency.subscriptionPlan);

  return {
    canUpload: isUnlimited || agency.credentialUploadsTotal < limit,
    currentCount: agency.credentialUploadsTotal,
    limit,
    isUnlimited,
  };
}

/**
 * Increment lifetime credential upload counter for an agency
 * Should be called after a successful credential document parse
 */
export async function incrementCredentialUploadCount(agencyId: string): Promise<void> {
  await prisma.agency.update({
    where: { id: agencyId },
    data: { credentialUploadsTotal: { increment: 1 } },
  });
}

/**
 * Get staff limit for an agency size
 */
export function getStaffLimit(agencySize: AgencySize): number {
  return STAFF_LIMITS[agencySize];
}

/**
 * Check if agency has unlimited staff
 */
export function hasUnlimitedStaff(agencySize: AgencySize): boolean {
  return STAFF_LIMITS[agencySize] === -1;
}

/**
 * Check if agency can add more staff members
 */
export async function canAddStaff(agencyId: string): Promise<{
  canAdd: boolean;
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
}> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      agencySize: true,
      _count: {
        select: { users: true },
      },
    },
  });

  if (!agency) {
    throw new SubscriptionError('Agency not found', 'AGENCY_NOT_FOUND');
  }

  const limit = getStaffLimit(agency.agencySize);
  const isUnlimited = hasUnlimitedStaff(agency.agencySize);
  const currentCount = agency._count.users;

  return {
    canAdd: isUnlimited || currentCount < limit,
    currentCount,
    limit,
    isUnlimited,
  };
}

/**
 * Format query usage for display
 */
export function formatQueryUsage(queriesUsed: number, queryLimit: number): string {
  if (queryLimit === -1) {
    return `${queriesUsed} queries used (unlimited)`;
  }
  return `${queriesUsed}/${queryLimit} queries used`;
}

/**
 * Calculate percentage of queries used
 */
export function getQueryUsagePercentage(queriesUsed: number, queryLimit: number): number {
  if (queryLimit === -1) {
    return 0; // Unlimited plans don't have a percentage
  }
  return Math.min(100, Math.round((queriesUsed / queryLimit) * 100));
}
