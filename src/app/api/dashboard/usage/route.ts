import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getQueryLimit, hasUnlimitedQueries, getCredentialLimit, hasUnlimitedCredentials } from "@/lib/subscriptionHelpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const agencyId = (session.user as any).agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: "No agency associated" }, { status: 403 });
    }

    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        subscriptionPlan: true,
        queriesThisMonth: true,
        queriesAllTime: true,
        credentialUploadsTotal: true,
        billingPeriodEnd: true,
      },
    });

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    const plan = agency.subscriptionPlan;
    const isLifetime = plan === "FREE";
    const unlimited = hasUnlimitedQueries(plan);
    const queriesLimit = getQueryLimit(plan);
    const queriesUsed = isLifetime ? agency.queriesAllTime : agency.queriesThisMonth;

    const credLimit = getCredentialLimit(plan);
    const credUnlimited = hasUnlimitedCredentials(plan);

    const daysUntilReset = isLifetime
      ? null
      : Math.max(0, Math.ceil((new Date(agency.billingPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      plan,
      queriesUsed,
      queriesLimit,
      isUnlimited: unlimited,
      isLifetime,
      resetDate: isLifetime ? null : agency.billingPeriodEnd,
      daysUntilReset,
      credentialUploadsUsed: agency.credentialUploadsTotal,
      credentialUploadsLimit: credLimit,
      credentialUploadsUnlimited: credUnlimited,
    });
  } catch (error) {
    console.error("Error fetching usage data:", error);
    return NextResponse.json({ error: "Failed to fetch usage data" }, { status: 500 });
  }
}
