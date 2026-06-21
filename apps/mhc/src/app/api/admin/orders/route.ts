import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/orders - Get all orders
export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status') || undefined;
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where = status ? { status: status.toUpperCase() } : {};
    
    // Get orders with related data
    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                title: true,
              },
            },
          },
        },
        downloads: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });
    
    // Get total count for pagination
    const totalCount = await prisma.order.count({ where });
    
    return NextResponse.json({
      orders,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
