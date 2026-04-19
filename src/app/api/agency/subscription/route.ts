import { NextRequest, NextResponse } from 'next/server';
import { requireAgency } from '@/lib/authHelpers';
import { getSubscriptionStatus, getStaffLimit, hasUnlimitedStaff, getCredentialLimit, hasUnlimitedCredentials } from '@/lib/subscriptionHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/subscription
 * Get subscription and usage data for the agency
 */
export async function GET(req: NextRequest) {
  try {
    const { user, agency } = await requireAgency();

    // Get subscription status with query limits
    const subscriptionStatus = await getSubscriptionStatus(agency.id);

    // Get staff count
    const staffCount = await prisma.user.count({
      where: { agencyId: agency.id },
    });

    // Get staff limit
    const staffLimit = getStaffLimit(agency.agencySize);
    const isUnlimitedStaff = hasUnlimitedStaff(agency.agencySize);

    const credentialLimit = getCredentialLimit(agency.subscriptionPlan);
    const isUnlimitedCredentials = hasUnlimitedCredentials(agency.subscriptionPlan);

    return NextResponse.json(
      {
        agency: {
          id: agency.id,
          agencyName: agency.agencyName,
          agencySize: agency.agencySize,
          subscriptionPlan: agency.subscriptionPlan,
          subscriptionStatus: agency.subscriptionStatus,
          queriesThisMonth: agency.queriesThisMonth,
          queriesAllTime: agency.queriesAllTime,
          credentialUploadsTotal: agency.credentialUploadsTotal,
          billingPeriodStart: agency.billingPeriodStart,
          billingPeriodEnd: agency.billingPeriodEnd,
          stripeCustomerId: agency.stripeCustomerId,
          stripeSubscriptionId: agency.stripeSubscriptionId,
        },
        queryLimit: subscriptionStatus.queryLimit,
        queriesRemaining: subscriptionStatus.queriesRemaining,
        hasUnlimitedQueries: subscriptionStatus.hasUnlimitedQueries,
        credentialLimit,
        isUnlimitedCredentials,
        staffCount,
        staffLimit,
        isUnlimitedStaff,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching subscription data:', error);

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch subscription data. Please try again.' },
      { status: 500 }
    );
  }
}
