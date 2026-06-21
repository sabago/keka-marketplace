import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAgency, requireActiveAgency, HttpError } from "@/lib/authHelpers";

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

    // Batch-resolve article titles from DB — avoids synchronous filesystem walks
    const uniqueSlugs = [...new Set(
      [...myFavs, ...agencyFavs].map((f) => f.articleSlug).filter(Boolean)
    )];
    const articles = uniqueSlugs.length
      ? await prisma.knowledgeBaseArticle.findMany({
          where: { slug: { in: uniqueSlugs } },
          select: { slug: true, title: true },
        })
      : [];
    const titleMap = new Map(articles.map((a) => [a.slug, a.title]));

    const withMeta = <T extends { articleSlug: string }>(list: T[]) =>
      list.map((fav) => ({ ...fav, articleTitle: titleMap.get(fav.articleSlug) ?? undefined }));

    return NextResponse.json({
      favorites: isAgencyUser ? withMeta(myFavs) : withMeta(agencyFavs),
      myFavorites: withMeta(myFavs),
      agencyFavorites: withMeta(agencyFavs),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, agency } = await requireActiveAgency();
    const body = await request.json();
    const { articleSlug, notes } = body;

    if (!articleSlug) {
      return NextResponse.json({ error: "Article slug is required" }, { status: 400 });
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
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error adding favorite:", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { agency } = await requireActiveAgency();
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
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Error removing favorite:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}
