import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFileToS3, getPublicUrl } from '@/lib/s3';
import crypto from 'crypto';

// GET /api/products - Get all products
export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');
    const orderBy = searchParams.get('orderBy') as 'createdAt' | 'title' | 'price' || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') as 'asc' | 'desc' || 'desc';

    // Build query filters
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const where: any = {};

    // Filter by category if provided
    if (categoryId) {
      where.categories = {
        some: {
          categoryId,
        },
      };
    }

    // Search in title, description, and categories if provided
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          categories: {
            some: {
              category: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                }
              }
            }
          }
        }
      ];
    }

    // Get products with count
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: {
          [orderBy]: orderDirection,
        },
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
          },
          orderItems: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate average rating and sales count for each product
    const productsWithRatingAndSales = products.map((product: { reviews: any[]; orderItems: any[]; }) => {
      const totalRating = product.reviews.reduce((sum: any, review: { rating: any; }) => sum + review.rating, 0);
      const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;
      const sales = product.orderItems.length;

      return {
        ...product,
        averageRating,
        reviewCount: product.reviews.length,
        sales,
      };
    });

    return NextResponse.json({
      products: productsWithRatingAndSales,
      total,
      hasMore: skip + take < total,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: Request) {
  try {
    // Parse the FormData
    const formData = await request.formData();
    
    // Extract form fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const productFile = formData.get('productFile') as File;
    const thumbnailFile = formData.get('thumbnailFile') as File;
    
    // Extract additional images and video
    const additionalImages = formData.getAll('additionalImages') as File[];
    const videoFile = formData.get('videoFile') as File;
    
    // Extract categories
    const categoriesArray = formData.getAll('categories[]') as string[];
    
    // Validate required fields
    if (!title || !description || isNaN(price) || !productFile || !thumbnailFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    let productFilePath = '';
    let thumbnailUrl = '';
    let additionalImageUrls: string[] = [];
    let videoUrl = '';
    
    try {
      // Convert files to buffers for S3 upload
      const productBuffer = Buffer.from(await productFile.arrayBuffer());
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      
      // Upload files to S3
      productFilePath = await uploadFileToS3(
        productBuffer,
        productFile.name,
        productFile.type,
        'products'
      );
      
      const thumbnailPath = await uploadFileToS3(
        thumbnailBuffer,
        thumbnailFile.name,
        thumbnailFile.type,
        'thumbnails'
      );
      
      // Get public URL for thumbnail
      thumbnailUrl = getPublicUrl(thumbnailPath);
      
      // Process additional images (up to 9)
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
      
      const processedImages = await Promise.all(additionalImagePromises);
      additionalImageUrls = processedImages.map(img => img.imageUrl);
      
      // Process video if provided
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
    } catch (uploadError) {
      console.error('S3 upload failed, using placeholder values:', uploadError);
      // Use placeholder values for development
      productFilePath = `placeholder/${productFile.name}`;
      thumbnailUrl = 'https://placehold.co/600x400/e2e8f0/1e293b?text=Product+Image';
      
      // Create placeholder additional images
      additionalImageUrls = Array(Math.min(additionalImages.length, 9))
        .fill(0)
        .map((_, index) => `https://placehold.co/600x400/e2e8f0/1e293b?text=Additional+Image+${index + 1}`);
      
      // Create placeholder video if a video file was provided
      if (videoFile) {
        videoUrl = 'https://example.com/placeholder-video.mp4';
      }
    }
    
    // Check if categories exist and create them if they don't
    const categoryPromises = categoriesArray.map(async (categoryId: string) => {
      // Get the category name and slug from our mock data
      let categoryName = "Unknown";
      let categorySlug = "unknown";
      
      // Map category IDs to names based on healthcare categories
      if (categoryId === "1") {
        categoryName = "Clinical Forms & Templates";
        categorySlug = "clinical-forms-templates";
      } else if (categoryId === "2") {
        categoryName = "Courses & Training Materials";
        categorySlug = "courses-training-materials";
      } else if (categoryId === "3") {
        categoryName = "Compliance & Accreditation Tools";
        categorySlug = "compliance-accreditation-tools";
      } else if (categoryId === "4") {
        categoryName = "Staffing & HR Resources";
        categorySlug = "staffing-hr-resources";
      } else if (categoryId === "5") {
        categoryName = "Medical Equipment & Supplies";
        categorySlug = "medical-equipment-supplies";
      } else if (categoryId === "6") {
        categoryName = "Vendor Services";
        categorySlug = "vendor-services";
      } else if (categoryId === "7") {
        categoryName = "Marketing & Business Growth";
        categorySlug = "marketing-business-growth";
      } else if (categoryId === "8") {
        categoryName = "Downloadables & Digital Tools";
        categorySlug = "downloadables-digital-tools";
      }
      
      try {
        // Try to find the category by ID first
        let existingCategory = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        
        // If not found by ID, try to find by slug
        if (!existingCategory) {
          existingCategory = await prisma.category.findUnique({
            where: { slug: categorySlug },
          });
          
          // If found by slug but has a different ID, we'll use that category
          if (existingCategory) {
            return existingCategory;
          }
          
          // If not found at all, create a new category
          return await prisma.category.create({
            data: {
              id: categoryId,
              name: categoryName,
              slug: categorySlug,
            },
          });
        }
        
        return existingCategory;
      } catch (error) {
        console.error(`Error handling category ${categoryId}:`, error);
        
        // If there was an error, try to find the category by slug as a fallback
        const fallbackCategory = await prisma.category.findUnique({
          where: { slug: categorySlug },
        });
        
        if (fallbackCategory) {
          return fallbackCategory;
        }
        
        // If we can't find or create the category, throw the error
        throw error;
      }
    });
    
    // Wait for all categories to be created or found and get their IDs
    const resolvedCategories = await Promise.all(categoryPromises);
    
    // Get SEO tags from form data
    const seoTagEntries = formData.getAll('seoTags[]') as string[];
    const seoTags = seoTagEntries.length > 0 ? seoTagEntries : [];
    
    // Create the main product
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        filePath: productFilePath,
        thumbnail: thumbnailUrl,
        categories: {
          create: resolvedCategories.map((category) => ({
            category: {
              connect: { id: category.id },
            },
          })),
        },
      },
    });
    
    // Create additional images if any using raw SQL queries
    if (additionalImageUrls.length > 0) {
      for (let i = 0; i < additionalImageUrls.length; i++) {
        await prisma.$executeRaw`
          INSERT INTO "ProductImage" ("id", "productId", "imageUrl", "order", "createdAt")
          VALUES (${crypto.randomUUID()}, ${product.id}, ${additionalImageUrls[i]}, ${i}, ${new Date()})
        `;
      }
    }
    
    // Create video if provided using raw SQL query
    if (videoUrl) {
      await prisma.$executeRaw`
        INSERT INTO "ProductVideo" ("id", "productId", "videoUrl", "createdAt")
        VALUES (${crypto.randomUUID()}, ${product.id}, ${videoUrl}, ${new Date()})
      `;
    }
    
    // Create SEO tags if provided
    if (seoTags.length > 0) {
      // Limit to 13 tags
      const tagsToCreate = seoTags.slice(0, 13);
      
      try {
        for (const tag of tagsToCreate) {
          await prisma.$executeRaw`
            INSERT INTO "ProductTag" ("id", "productId", "tag", "createdAt")
            VALUES (${crypto.randomUUID()}, ${product.id}, ${tag}, ${new Date()})
          `;
        }
      } catch {
        console.log('SEO tags table not found, skipping tag creation');
        // If the table doesn't exist yet, just continue without creating tags
      }
    }
    
    // Return the created product
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
