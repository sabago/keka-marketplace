import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/reviews - Get all reviews for admin
export async function GET() {
  try {
    // Note: In a production environment, you would want to add admin authentication here

    // Get all reviews with product information
    const reviews = await prisma.review.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            title: true,
          },
        },
      },
    });

    // Format the reviews to include product title
    const formattedReviews = reviews.map((review) => ({
      ...review,
      productTitle: review.product?.title || null,
      product: undefined, // Remove the product object
    }));

    return NextResponse.json({ reviews: formattedReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
