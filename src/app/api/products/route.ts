import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFileToS3, getPublicUrl } from '@/lib/s3';

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

    // Search in title and description if provided
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
    } catch (uploadError) {
      console.error('S3 upload failed, using placeholder values:', uploadError);
      // Use placeholder values for development
      productFilePath = `placeholder/${productFile.name}`;
      thumbnailUrl = 'https://placehold.co/600x400/e2e8f0/1e293b?text=Product+Image';
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
    
    // Create product in database
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
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
