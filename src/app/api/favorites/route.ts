import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // In production, get agencyId from authenticated session
    let agency = await prisma.agency.findFirst();

    if (!agency) {
      return NextResponse.json({ favorites: [] });
    }

    // Fetch favorites for the agency
    const favorites = await prisma.favoriteReferral.findMany({
      where: {
        agencyId: agency.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch article details for each favorite
    const favoritesWithDetails = await Promise.all(
      favorites.map(async (fav) => {
        const article = await prisma.knowledgeBaseArticle.findUnique({
          where: { slug: fav.articleSlug },
          select: { title: true, category: true },
        });

        return {
          ...fav,
          articleTitle: article?.title,
          articleCategory: article?.category,
        };
      })
    );

    return NextResponse.json({
      favorites: favoritesWithDetails,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleSlug, notes } = body;

    if (!articleSlug) {
      return NextResponse.json(
        { error: "Article slug is required" },
        { status: 400 }
      );
    }

    // Verify article exists
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug: articleSlug },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Get or create agency
    let agency = await prisma.agency.findFirst();

    if (!agency) {
      agency = await prisma.agency.create({
        data: {
          agencyName: "Demo Agency",
          licenseNumber: "DEMO-001",
          subscriptionPlan: "PRO",
          subscriptionStatus: "ACTIVE",
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          servicesOffered: ["Home Care"],
          serviceArea: ["MA"],
          agencySize: "SMALL",
          primaryContactName: "Demo User",
          primaryContactRole: "Administrator",
          primaryContactEmail: "demo@example.com",
        },
      });
    }

    // Create or update favorite
    const favorite = await prisma.favoriteReferral.upsert({
      where: {
        agencyId_articleSlug: {
          agencyId: agency.id,
          articleSlug,
        },
      },
      update: {
        notes,
      },
      create: {
        agencyId: agency.id,
        articleSlug,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}
