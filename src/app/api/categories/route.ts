import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Define the category type with products
interface CategoryWithProducts {
  id: string;
  name: string;
  slug: string;
  products: { productId: string }[];
}

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        products: {
          select: {
            productId: true,
          },
        },
      },
    });

    // Add product count to each category
    const categoriesWithCount = categories.map((category: CategoryWithProducts) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      productCount: category.products.length,
    }));

    return NextResponse.json({ categories: categoriesWithCount });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
