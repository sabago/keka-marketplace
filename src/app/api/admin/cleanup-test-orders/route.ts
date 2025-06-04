import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of test Stripe orders via API...');
    
    // Start a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Find all test orders (Stripe payment IDs starting with 'cs_test_')
      const testOrders = await tx.order.findMany({
        where: {
          stripePaymentId: {
            startsWith: 'cs_test_'
          }
        },
        include: {
          orderItems: true,
          downloads: true
        }
      });

      console.log(`📊 Found ${testOrders.length} test orders to delete`);

      if (testOrders.length === 0) {
        return {
          deletedOrders: 0,
          deletedOrderItems: 0,
          deletedDownloads: 0
        };
      }

      // Get order IDs for batch deletion
      const orderIds = testOrders.map(order => order.id);

      // Delete related downloads first
      const deletedDownloads = await tx.download.deleteMany({
        where: {
          orderId: {
            in: orderIds
          }
        }
      });

      // Delete related order items
      const deletedOrderItems = await tx.orderItem.deleteMany({
        where: {
          orderId: {
            in: orderIds
          }
        }
      });

      // Finally, delete the orders themselves
      const deletedOrders = await tx.order.deleteMany({
        where: {
          id: {
            in: orderIds
          }
        }
      });

      return {
        deletedOrders: deletedOrders.count,
        deletedOrderItems: deletedOrderItems.count,
        deletedDownloads: deletedDownloads.count
      };
    });

    console.log('✅ Cleanup completed successfully!');
    console.log(`📈 Results:`);
    console.log(`   - Orders deleted: ${result.deletedOrders}`);
    console.log(`   - Order items deleted: ${result.deletedOrderItems}`);
    console.log(`   - Downloads deleted: ${result.deletedDownloads}`);

    return NextResponse.json({
      success: true,
      message: 'Test orders cleaned up successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to cleanup test orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
