import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // In production, get agencyId from authenticated session
    let agency = await prisma.agency.findFirst({
      select: {
        servicesOffered: true,
        serviceArea: true,
        agencySize: true,
        subscriptionPlan: true,
      },
    });

    // Get all published articles
    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: {
        published: true,
      },
      select: {
        slug: true,
        title: true,
        category: true,
        tags: true,
        state: true,
      },
    });

    // Simple recommendation algorithm
    const scoredArticles = articles.map((article) => {
      let score = 50; // Base score
      let reason = "";

      // Boost if in same state
      if (agency && agency.serviceArea.includes(article.state)) {
        score += 20;
        reason = `Located in your service area (${article.state})`;
      }

      // Boost if has "Free" tag for small agencies
      if (
        agency &&
        agency.agencySize === "SMALL" &&
        article.tags.includes("Free")
      ) {
        score += 15;
        reason = reason
          ? `${reason}. No-cost option ideal for small agencies`
          : "No-cost option ideal for small agencies";
      }

      // Boost if category matches services
      if (
        agency &&
        article.category &&
        agency.servicesOffered.some((service) =>
          article.category?.toLowerCase().includes(service.toLowerCase())
        )
      ) {
        score += 15;
        reason = reason
          ? `${reason}. Matches your service offerings`
          : "Matches your service offerings";
      }

      // Boost if has "State Portal" tag
      if (article.tags.includes("State Portal")) {
        score += 10;
        reason = reason
          ? `${reason}. Official state resource`
          : "Official state resource";
      }

      if (!reason) {
        reason = "Popular with similar agencies";
      }

      return {
        slug: article.slug,
        title: article.title,
        category: article.category || "General",
        compatibilityScore: Math.min(score, 95),
        reason,
        tags: article.tags.slice(0, 3), // Limit to 3 tags
      };
    });

    // Sort by score and return top 5
    const recommendations = scoredArticles
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 5);

    return NextResponse.json({
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
