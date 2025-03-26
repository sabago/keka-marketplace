import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/products/[id] - Get a product by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fix the "params should be awaited" error
    const { id } = await Promise.resolve(params);

    // Get product with related data
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        reviews: {
          where: {
            approved: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Return 404 if product not found
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate average rating
      /* eslint-disable @typescript-eslint/no-explicit-any */
    const totalRating = product.reviews.reduce((sum: any, review: { rating: any; }) => sum + review.rating, 0);
    const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;

    // Return product with average rating
    return NextResponse.json({
      ...product,
      averageRating,
      reviewCount: product.reviews.length,
    });
  } catch (error) {
    // Fix the "params should be awaited" error here too
    const safeId = params ? await Promise.resolve(params).then(p => p.id) : 'unknown';
    console.error(`Error fetching product with ID ${safeId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fix the "params should be awaited" error
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const { title, description, price, filePath, thumbnail, categories } = body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title,
        description,
        price,
        filePath,
        thumbnail,
        // If categories are provided, update them
        ...(categories && {
          categories: {
            // Delete existing category connections
            deleteMany: {},
            // Create new category connections
            create: categories.map((categoryId: string) => ({
              category: {
                connect: { id: categoryId },
              },
            })),
          },
        }),
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    // Fix the "params should be awaited" error here too
    const safeId = params ? await Promise.resolve(params).then(p => p.id) : 'unknown';
    console.error(`Error updating product with ID ${safeId}:`, error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fix the "params should be awaited" error
    const { id } = await Promise.resolve(params);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
        reviews: true,
        orderItems: true,
        downloads: true
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Use a transaction to delete related records first
    await prisma.$transaction(async (tx: any) => {
      // Delete related ProductCategory records
      await tx.productCategory.deleteMany({
        where: { productId: id }
      });

      // Delete related reviews
      await tx.review.deleteMany({
        where: { productId: id }
      });

      // Delete related downloads
      await tx.download.deleteMany({
        where: { productId: id }
      });

      // Delete related order items
      await tx.orderItem.deleteMany({
        where: { productId: id }
      });

      // Delete the product
      await tx.product.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fix the "params should be awaited" error here too
    const safeId = params ? await Promise.resolve(params).then(p => p.id) : 'unknown';
    console.error(`Error deleting product with ID ${safeId}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
