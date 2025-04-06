import { PrismaClient } from '@prisma/client';
import { getConnectionString } from './dbConfig';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Get the database connection string
const connectionString = getConnectionString();

// If we're in a production environment, log the connection string (without password)
if (process.env.NODE_ENV === 'production') {
  const sanitizedUrl = connectionString.replace(/\/\/[^:]+:[^@]+@/, '//[REDACTED]:[REDACTED]@');
  console.log('Using database connection:', sanitizedUrl);
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper functions for common database operations

/**
 * Get all products with optional filtering and pagination
 */
export async function getProducts({
  categoryId,
  search,
  skip = 0,
  take = 10,
  orderBy = 'createdAt',
  orderDirection = 'desc',
}: {
  categoryId?: string;
  search?: string;
  skip?: number;
  take?: number;
  orderBy?: 'createdAt' | 'title' | 'price';
  orderDirection?: 'asc' | 'desc';
} = {}) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const where: Record<string, any> = {};

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
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            },
          },
        },
        reviews: {
          where: {
            approved: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Calculate average rating for each product
  const productsWithRating = products.map((product: { reviews: any[]; }) => {
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;

    return {
      ...product,
      averageRating,
      reviewCount: product.reviews.length,
    };
  });

  return {
    products: productsWithRating,
    total,
    hasMore: skip + take < total,
  };
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          },
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

  if (!product) return null;

  // Calculate average rating
  const totalRating = product.reviews.reduce((sum: any, review: { rating: any; }) => sum + review.rating, 0);
  const averageRating = product.reviews.length > 0 ? totalRating / product.reviews.length : 0;

  return {
    ...product,
    averageRating,
    reviewCount: product.reviews.length,
  };
}

/**
 * Get all categories
 */
export async function getCategories() {
  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

/**
 * Create a new order
 */
export async function createOrder({
  customerEmail,
  totalAmount,
  stripePaymentId,
  items,
}: {
  customerEmail: string;
  totalAmount: number;
  stripePaymentId: string;
  items: { productId: string; price: number }[];
}) {
  return prisma.order.create({
    data: {
      customerEmail,
      totalAmount,
      stripePaymentId,
      status: 'PENDING',
      orderItems: {
        create: items.map((item) => ({
          productId: item.productId,
          price: item.price,
        })),
      },
    },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
}

/**
 * Create download tokens for an order
 */
export async function createDownloadTokens(orderId: string) {
  // Get order with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) throw new Error('Order not found');

  // Create download tokens for each product
  const downloadPromises = order.orderItems.map((item: { productId: any; }) => {
    // Generate a random token
    const token = Buffer.from(Math.random().toString(36)).toString('hex');

    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return prisma.download.create({
      data: {
        orderId,
        productId: item.productId,
        downloadToken: token,
        downloadCount: 0,
        expiresAt,
      },
    });
  });

  return Promise.all(downloadPromises);
}

/**
 * Get download by token
 */
export async function getDownloadByToken(token: string) {
  return prisma.download.findUnique({
    where: { downloadToken: token },
    include: {
      product: true,
    },
  });
}

/**
 * Update download count
 */
export async function incrementDownloadCount(id: string) {
  return prisma.download.update({
    where: { id },
    data: {
      downloadCount: {
        increment: 1,
      },
    },
  });
}
