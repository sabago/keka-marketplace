import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // In production, get agencyId from authenticated session
    const mockAgencyId = "mock-agency-id";

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // For development, return mock data
    // In production, query actual data from database

    // Count referrals logged in last 30 days
    const referralsLogged = await prisma.referralTracking.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Count from previous period for comparison
    const referralsPrevious = await prisma.referralTracking.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    });

    const referralsChange =
      referralsPrevious > 0
        ? Math.round(((referralsLogged - referralsPrevious) / referralsPrevious) * 100)
        : 0;

    // Count unique directories accessed (event logs)
    const directoriesAccessed = await prisma.eventLog.groupBy({
      by: ["eventData"],
      where: {
        eventType: "ARTICLE_VIEW",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const directoriesPrevious = await prisma.eventLog.groupBy({
      by: ["eventData"],
      where: {
        eventType: "ARTICLE_VIEW",
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
    });

    const directoriesChange =
      directoriesPrevious.length > 0
        ? Math.round(
            ((directoriesAccessed.length - directoriesPrevious.length) /
              directoriesPrevious.length) *
              100
          )
        : 0;

    // Calculate average response time using DB-level aggregation (no row fetch)
    const responseTimeAgg = await prisma.referralTracking.aggregate({
      _avg: { responseTime: true },
      where: {
        responseTime: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const avgResponseTime = responseTimeAgg._avg.responseTime
      ? Math.round(responseTimeAgg._avg.responseTime)
      : 24;

    // Calculate success rate
    const totalReferrals = await prisma.referralTracking.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const acceptedReferrals = await prisma.referralTracking.count({
      where: {
        status: {
          in: ["ACCEPTED", "PATIENT_STARTED"],
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const successRate =
      totalReferrals > 0 ? Math.round((acceptedReferrals / totalReferrals) * 100) : 0;

    // For demo purposes, return some calculated values
    return NextResponse.json({
      referralsLogged: referralsLogged || 23,
      referralsChange: referralsChange || 12,
      directoriesAccessed: directoriesAccessed.length || 8,
      directoriesChange: directoriesChange || 5,
      avgResponseTime: avgResponseTime || 24,
      responseTimeChange: -8, // Negative is good (faster)
      successRate: successRate || 72,
      successRateChange: 5,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
