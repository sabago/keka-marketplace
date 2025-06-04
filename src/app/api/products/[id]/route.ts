import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFileToS3, getPublicUrl } from '@/lib/s3';
import crypto from 'crypto';

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
    
	// Fetch SEO tags using raw SQL
	let tagsResult: { id: string; tag: string; createdAt: Date }[] = [];
	try {
		tagsResult = await prisma.$queryRaw`
			SELECT id, tag, "createdAt"
			FROM "ProductTag"
			WHERE "productId" = ${id}
		` as { id: string; tag: string; createdAt: Date }[];
	} catch {
		console.log('SEO tags table not found, skipping tags fetch');
		// If the table doesn't exist yet, just return an empty array
	}

    // Return 404 if product not found
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch additional images using raw SQL
    const additionalImagesResult = await prisma.$queryRaw`
      SELECT id, "imageUrl", "order", "createdAt"
      FROM "ProductImage"
      WHERE "productId" = ${id}
      ORDER BY "order" ASC
    `;
    
    // Fetch video using raw SQL
    const videoResult = await prisma.$queryRaw`
      SELECT id, "videoUrl", "createdAt"
      FROM "ProductVideo"
      WHERE "productId" = ${id}
    `;

    // Calculate average rating
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const totalRating = product.reviews.reduce((sum: any, review: { rating: any; }) => sum + review.rating, 0);
    const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;

    // Return product with average rating, additional images, video, and SEO tags
    return NextResponse.json({
      ...product,
      averageRating,
      reviewCount: product.reviews.length,
      additionalImages: additionalImagesResult || [],
      video: videoResult && (videoResult as any[])[0] ? (videoResult as any[])[0] : null,
      tags: tagsResult || [],
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
    
    // Handle FormData instead of JSON
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    
    // Extract additional images and video
    const additionalImages = formData.getAll('additionalImages') as File[];
    const videoFile = formData.get('videoFile') as File;
    
    // Get existing product to preserve file paths if not updated
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Use existing paths if files are not updated
    const filePath = existingProduct.filePath;
    const thumbnail = existingProduct.thumbnail;
    
    // Get categories from form data
    const categoryEntries = formData.getAll('categories[]') as string[];
    const categories = categoryEntries.length > 0 ? categoryEntries : undefined;
    
    // Get SEO tags from form data
    const seoTagEntries = formData.getAll('seoTags[]') as string[];
    const seoTags = seoTagEntries.length > 0 ? seoTagEntries : undefined;

    // Process additional images if provided
    let additionalImageUrls: { imageUrl: string; order: number }[] = [];
    if (additionalImages.length > 0) {
      const maxAdditionalImages = 9;
      const imagesToProcess = additionalImages.slice(0, maxAdditionalImages);
      
      // Upload additional images
      const additionalImagePromises = imagesToProcess.map(async (imageFile, index) => {
        try {
          const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
          const imagePath = await uploadFileToS3(
            imageBuffer,
            imageFile.name,
            imageFile.type,
            'product-images'
          );
          return {
            imageUrl: getPublicUrl(imagePath),
            order: index
          };
        } catch (error) {
          console.error(`Error uploading additional image ${index}:`, error);
          // Return a placeholder for development
          return {
            imageUrl: `https://placehold.co/600x400/e2e8f0/1e293b?text=Additional+Image+${index + 1}`,
            order: index
          };
        }
      });
      
      additionalImageUrls = await Promise.all(additionalImagePromises);
    }
    
    // Process video if provided
    let videoUrl = '';
    if (videoFile) {
      try {
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        const videoPath = await uploadFileToS3(
          videoBuffer,
          videoFile.name,
          videoFile.type,
          'product-videos'
        );
        videoUrl = getPublicUrl(videoPath);
      } catch (error) {
        console.error('Error uploading video:', error);
        // Use a placeholder for development
        videoUrl = 'https://example.com/placeholder-video.mp4';
      }
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
    
    // Update SEO tags if provided
    if (seoTags && seoTags.length > 0) {
      // Delete existing tags
      await prisma.$executeRaw`DELETE FROM "ProductTag" WHERE "productId" = ${id}`;
      
      // Create new tags
      for (const tag of seoTags) {
        await prisma.$executeRaw`
          INSERT INTO "ProductTag" ("id", "productId", "tag", "createdAt")
          VALUES (${crypto.randomUUID()}, ${id}, ${tag}, ${new Date()})
        `;
      }
    }
    
    // Update additional images if provided
    if (additionalImageUrls.length > 0) {
      // Delete existing images
      await prisma.$executeRaw`DELETE FROM "ProductImage" WHERE "productId" = ${id}`;
      
      // Create new images
      for (let i = 0; i < additionalImageUrls.length; i++) {
        await prisma.$executeRaw`
          INSERT INTO "ProductImage" ("id", "productId", "imageUrl", "order", "createdAt")
          VALUES (${crypto.randomUUID()}, ${id}, ${additionalImageUrls[i].imageUrl}, ${additionalImageUrls[i].order}, ${new Date()})
        `;
      }
    }
    
    // Update video if provided
    if (videoUrl) {
      // Delete existing video
      await prisma.$executeRaw`DELETE FROM "ProductVideo" WHERE "productId" = ${id}`;
      
      // Create new video
      await prisma.$executeRaw`
        INSERT INTO "ProductVideo" ("id", "productId", "videoUrl", "createdAt")
        VALUES (${crypto.randomUUID()}, ${id}, ${videoUrl}, ${new Date()})
      `;
    }

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

    // Use raw SQL queries to delete related records first
    // Delete related ProductImage records
    await prisma.$executeRaw`DELETE FROM "ProductImage" WHERE "productId" = ${id}`;
    
    // Delete related ProductVideo records
    await prisma.$executeRaw`DELETE FROM "ProductVideo" WHERE "productId" = ${id}`;
    
    // Delete related ProductTag records
    await prisma.$executeRaw`DELETE FROM "ProductTag" WHERE "productId" = ${id}`;
    
    // Use a transaction to delete other related records
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
