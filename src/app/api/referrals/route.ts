import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAgency } from "@/lib/authHelpers";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function getArticleTitleFromFiles(slug: string): string | undefined {
  const contentDirs = [
    path.join(process.cwd(), "src/content/knowledge-base"),
    path.join(process.cwd(), "src/content/massachusetts"),
  ];
  for (const dir of contentDirs) {
    const result = searchDirForSlug(dir, slug);
    if (result) return result;
  }
  return undefined;
}

function searchDirForSlug(dir: string, slug: string): string | undefined {
  if (!fs.existsSync(dir)) return undefined;
  for (const entry of fs.readdirSync(dir)) {
    const filePath = path.join(dir, entry);
    if (fs.statSync(filePath).isDirectory()) {
      const result = searchDirForSlug(filePath, slug);
      if (result) return result;
    } else if (entry.endsWith(".md")) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(raw);
        if (data.slug === slug) return data.title;
      } catch {
        // skip
      }
    }
  }
  return undefined;
}

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

    const withTitles = (list: typeof agencyReferrals) =>
      list.map((r) => ({ ...r, referralSourceTitle: getArticleTitleFromFiles(r.referralSourceSlug) }));

    return NextResponse.json({
      referrals: isAgencyUser ? withTitles(myReferrals) : withTitles(agencyReferrals),
      myReferrals: withTitles(myReferrals),
      agencyReferrals: withTitles(agencyReferrals),
    });
  } catch (error) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
  }
}
