import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // In production, get agencyId from authenticated session
    // For now, return mock data
    const mockAgencyId = "mock-agency-id";

    // Fetch agency data
    const agency = await prisma.agency.findFirst({
      select: {
        queriesThisMonth: true,
        subscriptionPlan: true,
        billingPeriodEnd: true,
      },
    });

    if (!agency) {
      // Return mock data for development
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);

      const daysUntilReset = Math.ceil(
        (resetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      return NextResponse.json({
        queriesUsed: 47,
        queriesLimit: 200,
        isUnlimited: false,
        resetDate: resetDate.toISOString(),
        daysUntilReset,
      });
    }

    // Determine query limit based on plan
    const queryLimits = {
      FREE: 50,
      PRO: 200,
      BUSINESS: 500,
      ENTERPRISE: -1, // Unlimited
    };

    const queriesLimit = queryLimits[agency.subscriptionPlan] || 50;
    const isUnlimited = agency.subscriptionPlan === "ENTERPRISE";

    const resetDate = agency.billingPeriodEnd;
    const daysUntilReset = Math.ceil(
      (new Date(resetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      queriesUsed: agency.queriesThisMonth,
      queriesLimit,
      isUnlimited,
      resetDate: resetDate.toISOString(),
      daysUntilReset,
    });
  } catch (error) {
    console.error("Error fetching usage data:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
