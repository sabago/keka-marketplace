import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // In production, get agencyId from authenticated session
    const mockAgencyId = "mock-agency-id";

    // Fetch referrals for the agency
    const referrals = await prisma.referralTracking.findMany({
      orderBy: {
        submissionDate: "desc",
      },
      take: 100, // Limit to 100 most recent
    });

    // Fetch article titles for each referral
    const referralsWithTitles = await Promise.all(
      referrals.map(async (referral) => {
        const article = await prisma.knowledgeBaseArticle.findUnique({
          where: { slug: referral.referralSourceSlug },
          select: { title: true },
        });

        return {
          ...referral,
          referralSourceTitle: article?.title,
        };
      })
    );

    return NextResponse.json({
      referrals: referralsWithTitles,
    });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}
