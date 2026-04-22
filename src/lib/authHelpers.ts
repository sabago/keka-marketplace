import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole, PlanType } from '@prisma/client';

/**
 * Get the current authenticated user from the session
 * @returns User session or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Require authentication - throws error if not authenticated
 * @returns Authenticated user session
 * @throws Error if user is not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required. Please sign in to continue.');
  }

  return { user };
}

/**
 * Require that the user has an associated agency
 * @returns User session with verified agency
 * @throws Error if user has no agency
 */
export async function requireAgency() {
  const { user } = await requireAuth();

  // agencyId may be missing from a stale JWT — re-fetch from DB if needed
  let agencyId = user.agencyId;
  if (!agencyId && user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { agencyId: true },
    });
    agencyId = dbUser?.agencyId ?? null;
  }

  if (!agencyId) {
    throw new Error('Agency association required. Please contact support to link your account to an agency.');
  }

  // Verify agency exists and fetch the fields needed by the majority of routes.
  // Add to this select only when a route genuinely needs the extra column — don't
  // add "just in case" columns; each one wastes bandwidth on every single API call.
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      id: true,
      agencyName: true,
      licenseNumber: true,
      approvalStatus: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      queriesThisMonth: true,
      queriesAllTime: true,
      credentialUploadsTotal: true,
      billingPeriodStart: true,
      billingPeriodEnd: true,
      lastQueryReset: true,
      agencySize: true,
      credentialWarningDays: true,
      autoReminderEnabled: true,
      reminderFrequency: true,
      servicesOffered: true,
      serviceArea: true,
      primaryContactName: true,
      primaryContactRole: true,
      primaryContactEmail: true,
      primaryContactPhone: true,
      intakeMethod: true,
      intakeMethods: true,
      followUpFrequency: true,
      followUpMethods: true,
      avgReferralsPerMonth: true,
      specializations: true,
      consentToAnalytics: true,
      taxId: true,
    },
  });

  if (!agency) {
    throw new Error('Associated agency not found. Please contact support.');
  }

  return {
    user: { ...user, agencyId },
    agency,
  };
}

/**
 * Require platform admin role
 * @returns Authenticated admin user
 * @throws Error if user is not a platform admin
 */
export async function requirePlatformAdmin() {
  const { user } = await requireAuth();

  if (user.role !== UserRole.PLATFORM_ADMIN) {
    throw new Error('Platform administrator access required. You do not have permission to access this resource.');
  }

  return user;
}

/**
 * Require superadmin or platform admin role
 * @returns Authenticated superadmin or platform admin user
 * @throws Error if user is not a superadmin or platform admin
 */
export async function requireSuperadmin() {
  const { user } = await requireAuth();

  if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.PLATFORM_ADMIN) {
    throw new Error('Superadmin access required. You do not have permission to access this resource.');
  }

  return user;
}

/**
 * Require agency admin role (or platform admin)
 * @returns Authenticated admin user with agency
 * @throws Error if user is not an agency or platform admin
 */
export async function requireAgencyAdmin() {
  const { user, agency } = await requireAgency();

  if (user.role !== UserRole.AGENCY_ADMIN && user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.SUPERADMIN) {
    throw new Error('Agency administrator access required. You do not have permission to perform this action.');
  }

  return {
    user,
    agency,
  };
}

/**
 * Check if agency has queries remaining for the current billing period
 * @param agencyId - The agency ID to check
 * @returns Object with limit status and details
 */
export async function checkQueryLimit(agencyId: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      queriesThisMonth: true,
      billingPeriodEnd: true,
    },
  });

  if (!agency) {
    throw new Error('Agency not found');
  }

  // Define query limits per plan
  const queryLimits: Record<PlanType, number> = {
    FREE: 10,
    PRO: 100,
    BUSINESS: 500,
    ENTERPRISE: -1, // Unlimited
  };

  const limit = queryLimits[agency.subscriptionPlan];
  const isUnlimited = limit === -1;
  const hasQueriesRemaining = isUnlimited || agency.queriesThisMonth < limit;
  const queriesRemaining = isUnlimited ? null : Math.max(0, limit - agency.queriesThisMonth);

  return {
    hasQueriesRemaining,
    queriesUsed: agency.queriesThisMonth,
    queriesRemaining,
    limit: isUnlimited ? null : limit,
    isUnlimited,
    plan: agency.subscriptionPlan,
    subscriptionStatus: agency.subscriptionStatus,
    billingPeriodEnd: agency.billingPeriodEnd,
  };
}

/**
 * Increment agency query count
 * @param agencyId - The agency ID to increment
 * @throws Error if agency has exceeded query limit
 */
export async function incrementQueryCount(agencyId: string) {
  const limitStatus = await checkQueryLimit(agencyId);

  if (!limitStatus.hasQueriesRemaining) {
    throw new Error(
      `Query limit exceeded. Your ${limitStatus.plan} plan allows ${limitStatus.limit} queries per month. ` +
      `Please upgrade your plan to continue using the chatbot.`
    );
  }

  // Increment both monthly and all-time query counts
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      queriesThisMonth: { increment: 1 },
      queriesAllTime: { increment: 1 },
    },
    select: { id: true },
  });

  return limitStatus;
}

/**
 * Check if user has permission to access a specific agency
 * @param userId - User ID to check
 * @param agencyId - Agency ID to check access for
 * @returns Boolean indicating if user has access
 */
export async function hasAgencyAccess(userId: string, agencyId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { agencyId: true, role: true },
  });

  if (!user) return false;

  // Platform admins and superadmins have access to all agencies
  if (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.SUPERADMIN) return true;

  // Regular users only have access to their own agency
  return user.agencyId === agencyId;
}

/**
 * Get full user with agency details
 * @param userId - User ID
 * @returns User with agency data
 */
export async function getUserWithAgency(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agency: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}
