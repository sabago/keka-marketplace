import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/analytics - Get analytics data
export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '30days';
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date | null = new Date();
    
    switch (timeframe) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = null; // No start date filter for "all"
        break;
      case '30days':
      default:
        startDate.setDate(now.getDate() - 30);
        break;
    }
    
    // Format dates for database queries
    const startDateStr = startDate ? startDate.toISOString() : null;
    const endDateStr = now.toISOString();
    
    // Build where clause for date filtering
    const dateFilter = startDateStr ? {
      gte: startDateStr,
      lte: endDateStr,
    } : {
      lte: endDateStr,
    };

    // Get total orders and revenue
    const orderStats = await prisma.order.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
      where: {
        createdAt: dateFilter,
        status: 'PAID',
      },
    });
    
    // Get total customers (unique email addresses)
    const customersCount = await prisma.order.groupBy({
      by: ['customerEmail'],
      where: {
        createdAt: dateFilter,
        status: 'PAID',
      },
      _count: {
        customerEmail: true,
      },
    });
    
    // Get total downloads
    const downloadsCount = await prisma.download.aggregate({
      _sum: {
        downloadCount: true,
      },
      where: {
        createdAt: dateFilter,
      },
    });
    
    // Get daily sales data
    const dailySales = startDateStr ? await getDailySalesData(startDateStr, endDateStr) : [];
    
    // Get top products
    const topProducts = startDateStr ? await getTopProducts(startDateStr, endDateStr) : await getTopProductsAll();
    
    // Calculate average order value
    const totalOrders = orderStats._count.id || 0;
    // Convert Decimal to number for accurate calculations
    const totalRevenue = Number(orderStats._sum.totalAmount) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Estimate conversion rate (assuming 100 visitors per order as a placeholder)
    // In a real app, you would track actual visitors
    const estimatedVisitors = totalOrders * 100;
    const conversionRate = estimatedVisitors > 0 ? totalOrders / estimatedVisitors : 0;
    
    return NextResponse.json({
      totalOrders,
      totalRevenue,
      totalCustomers: customersCount.length,
      totalDownloads: downloadsCount._sum.downloadCount || 0,
      averageOrderValue,
      conversionRate,
      dailySales,
      topProducts,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper function to get daily sales data
async function getDailySalesData(startDate: string, endDate: string) {
  // Get all orders in the date range
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'PAID',
    },
    select: {
      createdAt: true,
      totalAmount: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  
  // Group orders by day
  const dailyData: Record<string, { date: string; orders: number; revenue: number }> = {};
  
  // Create a date range array to ensure all days are included
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateRange: string[] = [];
  
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dateStr = day.toISOString().split('T')[0];
    dateRange.push(dateStr);
    dailyData[dateStr] = {
      date: dateStr,
      orders: 0,
      revenue: 0,
    };
  }
  
  // Populate the data
  orders.forEach((order: { createdAt: Date; totalAmount: unknown }) => {
    const dateStr = order.createdAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].orders += 1;
      // Convert Decimal to number for accurate calculations
      dailyData[dateStr].revenue += Number(order.totalAmount);
    }
  });
  
  // Convert to array and sort by date
  return Object.values(dailyData).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// Helper function to get top products
async function getTopProducts(startDate: string, endDate: string) {
  // Get all order items in the date range
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'PAID',
      },
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  
  // Group by product and calculate sales and revenue
  const productMap: Record<string, { id: string; title: string; sales: number; revenue: number }> = {};
  
  orderItems.forEach((item: { productId: string; price: unknown; product: { title: string } }) => {
    const productId = item.productId;
    if (!productMap[productId]) {
      productMap[productId] = {
        id: productId,
        title: item.product.title,
        sales: 0,
        revenue: 0,
      };
    }
    
    productMap[productId].sales += 1;
    // Convert Decimal to number for accurate calculations
    productMap[productId].revenue += Number(item.price);
  });
  
  // Convert to array and sort by revenue
  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10); // Top 10 products
}

// Helper function to get top products for all time
async function getTopProductsAll() {
  // Get all order items
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        status: 'PAID',
      },
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  
  // Group by product and calculate sales and revenue
  const productMap: Record<string, { id: string; title: string; sales: number; revenue: number }> = {};
  
  orderItems.forEach((item: { productId: string; price: unknown; product: { title: string } }) => {
    const productId = item.productId;
    if (!productMap[productId]) {
      productMap[productId] = {
        id: productId,
        title: item.product.title,
        sales: 0,
        revenue: 0,
      };
    }
    
    productMap[productId].sales += 1;
    // Convert Decimal to number for accurate calculations
    productMap[productId].revenue += Number(item.price);
  });
  
  // Convert to array and sort by revenue
  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10); // Top 10 products
}
