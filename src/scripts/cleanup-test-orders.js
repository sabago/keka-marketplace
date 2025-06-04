const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupTestOrders() {
  console.log('🧹 Starting cleanup of test Stripe orders...');
  
  try {
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
      
      // Count items before deletion
      const totalOrderItems = testOrders.reduce((sum, order) => sum + order.orderItems.length, 0);
      const totalDownloads = testOrders.reduce((sum, order) => sum + order.downloads.length, 0);

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

    return result;

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupTestOrders()
    .then((result) => {
      console.log('\n🎉 Test order cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestOrders };
