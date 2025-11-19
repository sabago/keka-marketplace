import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { categories } from '@/lib/categoryConfig';

// GET /api/knowledge-base/categories - Get all categories with article counts
export async function GET() {
  try {
    // Get article counts per category
    const counts = await prisma.knowledgeBaseArticle.groupBy({
      by: ['category'],
      where: {
        published: true,
      },
      _count: true,
    });

    // Create a map of category slug to count
    const countMap: Record<string, number> = {};
    counts.forEach(({ category, _count }) => {
      if (category) {
        countMap[category] = _count;
      }
    });

    // Add counts to categories (exclude icon - can't be serialized)
    const categoriesWithCounts = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      color: cat.color,
      order: cat.order,
      count: countMap[cat.slug] || 0,
    }));

    // Get total count
    const totalCount = await prisma.knowledgeBaseArticle.count({
      where: {
        published: true,
      },
    });

    return NextResponse.json({
      categories: categoriesWithCounts,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
