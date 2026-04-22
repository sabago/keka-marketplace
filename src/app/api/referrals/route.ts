import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAgency, HttpError } from "@/lib/authHelpers";

export async function GET(request: NextRequest) {
  try {
    const { user, agency } = await requireAgency();

    const isAgencyUser = user.role === "AGENCY_USER";

    const [myReferrals, agencyReferrals] = await Promise.all([
      prisma.referralTracking.findMany({
        where: { agencyId: agency.id, loggedByUserId: user.id },
        orderBy: { submissionDate: "desc" },
        take: 100,
        include: { statusHistory: { orderBy: { changedAt: "asc" } } },
      }),
      isAgencyUser
        ? Promise.resolve([])
        : prisma.referralTracking.findMany({
            where: { agencyId: agency.id },
            orderBy: { submissionDate: "desc" },
            take: 100,
            include: { statusHistory: { orderBy: { changedAt: "asc" } } },
          }),
    ]);

    // Resolve article titles via DB (KnowledgeBaseArticle has slug + title indexed)
    // instead of synchronous filesystem walks that block the event loop
    const allReferrals = isAgencyUser ? myReferrals : agencyReferrals;
    const uniqueSlugs = [...new Set(
      [...myReferrals, ...agencyReferrals].map((r) => r.referralSourceSlug).filter(Boolean)
    )];
    const articles = uniqueSlugs.length
      ? await prisma.knowledgeBaseArticle.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true, title: true },
        })
      : [];
    const titleMap = new Map(articles.map((a) => [a.slug, a.title]));

    const withTitles = <T extends { referralSourceSlug: string }>(list: T[]) =>
      list.map((r) => ({ ...r, referralSourceTitle: titleMap.get(r.referralSourceSlug) ?? undefined }));

    return NextResponse.json({
      referrals: withTitles(allReferrals),
      myReferrals: withTitles(myReferrals),
      agencyReferrals: withTitles(agencyReferrals),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error fetching referrals:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}
