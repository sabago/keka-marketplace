import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAgency } from "@/lib/authHelpers";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Look up article title/category from markdown files by slug
function getArticleMetaFromFiles(slug: string): { title?: string; category?: string } {
  const contentDirs = [
    path.join(process.cwd(), "src/content/knowledge-base"),
    path.join(process.cwd(), "src/content/massachusetts"),
  ];

  for (const dir of contentDirs) {
    const result = searchDirForSlug(dir, slug);
    if (result) return result;
  }
  return {};
}

function searchDirForSlug(dir: string, slug: string): { title?: string; category?: string } | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const result = searchDirForSlug(filePath, slug);
      if (result) return result;
    } else if (entry.endsWith(".md")) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(raw);
        if (data.slug === slug) {
          return { title: data.title, category: data.category };
        }
      } catch {
        // skip
      }
    }
  }
  return null;
}

// Check if slug exists in markdown files
function articleExistsInFiles(slug: string): boolean {
  return getArticleMetaFromFiles(slug).title !== undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { user, agency } = await requireAgency();

    const isAgencyUser = user.role === "AGENCY_USER";

    const [myFavs, agencyFavs] = await Promise.all([
      prisma.favoriteReferral.findMany({
        where: { agencyId: agency.id, savedByUserId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      isAgencyUser
        ? Promise.resolve([])
        : prisma.favoriteReferral.findMany({
            where: { agencyId: agency.id },
            orderBy: { createdAt: "desc" },
          }),
    ]);

    const withMeta = (list: typeof agencyFavs) =>
      list.map((fav) => {
        const meta = getArticleMetaFromFiles(fav.articleSlug);
        return { ...fav, articleTitle: meta.title, articleCategory: meta.category };
      });

    return NextResponse.json({
      favorites: isAgencyUser ? withMeta(myFavs) : withMeta(agencyFavs),
      myFavorites: withMeta(myFavs),
      agencyFavorites: withMeta(agencyFavs),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, agency } = await requireAgency();
    const body = await request.json();
    const { articleSlug, notes } = body;

    if (!articleSlug) {
      return NextResponse.json({ error: "Article slug is required" }, { status: 400 });
    }

    // Verify article exists in markdown files
    if (!articleExistsInFiles(articleSlug)) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const favorite = await prisma.favoriteReferral.upsert({
      where: {
        agencyId_articleSlug: {
          agencyId: agency.id,
          articleSlug,
        },
      },
      update: { notes },
      create: {
        agencyId: agency.id,
        savedByUserId: user.id,
        articleSlug,
        notes,
      },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { agency } = await requireAgency();
    const body = await request.json();
    const { articleSlug } = body;

    if (!articleSlug) {
      return NextResponse.json({ error: "Article slug is required" }, { status: 400 });
    }

    await prisma.favoriteReferral.deleteMany({
      where: {
        agencyId: agency.id,
        articleSlug,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
