import { NextRequest, NextResponse } from 'next/server';
import { requireAgency , HttpError , requireActiveAgency} from '@/lib/authHelpers';
import { getSubscriptionStatus, getStaffLimit, hasUnlimitedStaff, getCredentialLimit, hasUnlimitedCredentials } from '@/lib/subscriptionHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/subscription
 * Get subscription and usage data for the agency
 */
export async function GET(req: NextRequest) {
  try {
    const { user, agency: { id: agencyId, agencyName, subscriptionPlan, subscriptionStatus: subStatus } } = await requireActiveAgency();

    const [agencyData, subscriptionStatus, staffCount] = await Promise.all([
      prisma.agency.findUnique({
        where: { id: agencyId },
        select: {
          agencySize: true,
          queriesThisMonth: true,
          queriesAllTime: true,
          credentialUploadsTotal: true,
          billingPeriodStart: true,
          billingPeriodEnd: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      }),
      getSubscriptionStatus(agencyId),
      prisma.user.count({ where: { agencyId } }),
    ]);

    const staffLimit = agencyData?.agencySize ? getStaffLimit(agencyData.agencySize) : 0;
    const isUnlimitedStaff = agencyData?.agencySize ? hasUnlimitedStaff(agencyData.agencySize) : false;

    const credentialLimit = getCredentialLimit(subscriptionPlan);
    const isUnlimitedCredentials = hasUnlimitedCredentials(subscriptionPlan);

    return NextResponse.json(
      {
        agency: {
          id: agencyId,
          agencyName,
          agencySize: agencyData?.agencySize,
          subscriptionPlan,
          subscriptionStatus: subStatus,
          queriesThisMonth: agencyData?.queriesThisMonth,
          queriesAllTime: agencyData?.queriesAllTime,
          credentialUploadsTotal: agencyData?.credentialUploadsTotal,
          billingPeriodStart: agencyData?.billingPeriodStart,
          billingPeriodEnd: agencyData?.billingPeriodEnd,
          stripeCustomerId: agencyData?.stripeCustomerId,
          stripeSubscriptionId: agencyData?.stripeSubscriptionId,
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

    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch subscription data. Please try again.' },
      { status: 500 }
    );
  }
}
