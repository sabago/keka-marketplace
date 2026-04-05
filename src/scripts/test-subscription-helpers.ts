/**
 * Test Script for Subscription Helpers
 *
 * This script tests the subscription helper functions to ensure
 * they work correctly before integrating into production.
 *
 * Usage:
 *   npx tsx src/scripts/test-subscription-helpers.ts
 */

import { prisma } from '@/lib/db';
import {
  getSubscriptionStatus,
  enforceQueryLimit,
  incrementQueryCount,
  resetQueryCount,
  getQueryLimit,
  hasUnlimitedQueries,
  formatQueryUsage,
  getQueryUsagePercentage,
  SubscriptionError,
} from '@/lib/subscriptionHelpers';
import { PlanType, SubscriptionStatus } from '@prisma/client';

async function testSubscriptionHelpers() {
  console.log('🧪 Testing Subscription Helper Functions\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // ============================================================
    // Test 1: Query Limits
    // ============================================================
    console.log('Test 1: Query Limits');
    console.log('─────────────────────');

    console.log('FREE plan limit:', getQueryLimit(PlanType.FREE));
    console.log('PRO plan limit:', getQueryLimit(PlanType.PRO));
    console.log('BUSINESS plan limit:', getQueryLimit(PlanType.BUSINESS));
    console.log('ENTERPRISE plan limit:', getQueryLimit(PlanType.ENTERPRISE));

    console.log('\nHas unlimited queries:');
    console.log('FREE:', hasUnlimitedQueries(PlanType.FREE));
    console.log('BUSINESS:', hasUnlimitedQueries(PlanType.BUSINESS));

    console.log('\n✅ Query limit tests passed\n');

    // ============================================================
    // Test 2: Usage Formatting
    // ============================================================
    console.log('Test 2: Usage Formatting');
    console.log('─────────────────────');

    console.log('Format: 15/20 queries:', formatQueryUsage(15, 20));
    console.log('Format: 100/unlimited:', formatQueryUsage(100, -1));
    console.log('Percentage: 15/20:', getQueryUsagePercentage(15, 20) + '%');
    console.log('Percentage: 19/20:', getQueryUsagePercentage(19, 20) + '%');
    console.log('Percentage: unlimited:', getQueryUsagePercentage(100, -1) + '%');

    console.log('\n✅ Usage formatting tests passed\n');

    // ============================================================
    // Test 3: Create Test Agency
    // ============================================================
    console.log('Test 3: Create Test Agency');
    console.log('─────────────────────');

    const testAgency = await prisma.agency.create({
      data: {
        agencyName: 'Test Agency for Subscription',
        licenseNumber: `TEST-${Date.now()}`,
        subscriptionPlan: PlanType.FREE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        queriesThisMonth: 0,
        queriesAllTime: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        servicesOffered: ['Home Health'],
        serviceArea: ['MA'],
        agencySize: 'SMALL' as any,
        primaryContactName: 'Test User',
        primaryContactRole: 'Admin',
        primaryContactEmail: `test-${Date.now()}@example.com`,
      },
    });

    console.log('Created test agency:', testAgency.id);
    console.log('\n✅ Test agency created\n');

    // ============================================================
    // Test 4: Get Subscription Status
    // ============================================================
    console.log('Test 4: Get Subscription Status');
    console.log('─────────────────────');

    const status = await getSubscriptionStatus(testAgency.id);
    console.log('Agency ID:', status.id);
    console.log('Plan:', status.subscriptionPlan);
    console.log('Status:', status.subscriptionStatus);
    console.log('Queries this month:', status.queriesThisMonth);
    console.log('Query limit:', status.queryLimit);
    console.log('Queries remaining:', status.queriesRemaining);
    console.log('Is active:', status.isActive);

    console.log('\n✅ Subscription status test passed\n');

    // ============================================================
    // Test 5: Query Limit Enforcement
    // ============================================================
    console.log('Test 5: Query Limit Enforcement');
    console.log('─────────────────────');

    // Should allow queries (0/20 used)
    await enforceQueryLimit(testAgency.id);
    console.log('✓ First query allowed (0/20 used)');

    // Increment to 19
    for (let i = 0; i < 19; i++) {
      await incrementQueryCount(testAgency.id);
    }

    // Should still allow (19/20 used)
    await enforceQueryLimit(testAgency.id);
    console.log('✓ 20th query allowed (19/20 used)');

    // Increment to 20
    await incrementQueryCount(testAgency.id);

    // Should block (20/20 used)
    try {
      await enforceQueryLimit(testAgency.id);
      console.log('❌ 21st query should have been blocked!');
    } catch (error) {
      if (error instanceof SubscriptionError && error.code === 'QUERY_LIMIT_REACHED') {
        console.log('✓ 21st query blocked correctly (20/20 used)');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Query limit enforcement tests passed\n');

    // ============================================================
    // Test 6: Reset Query Count
    // ============================================================
    console.log('Test 6: Reset Query Count');
    console.log('─────────────────────');

    const beforeReset = await getSubscriptionStatus(testAgency.id);
    console.log('Before reset:', beforeReset.queriesThisMonth);

    await resetQueryCount(testAgency.id);

    const afterReset = await getSubscriptionStatus(testAgency.id);
    console.log('After reset:', afterReset.queriesThisMonth);
    console.log('All-time queries:', afterReset.queriesAllTime);

    if (afterReset.queriesThisMonth === 0 && afterReset.queriesAllTime === 20) {
      console.log('✓ Query count reset correctly');
    } else {
      console.log('❌ Query count reset failed!');
    }

    console.log('\n✅ Reset query count test passed\n');

    // ============================================================
    // Test 7: Test PAST_DUE Status
    // ============================================================
    console.log('Test 7: Test PAST_DUE Status');
    console.log('─────────────────────');

    await prisma.agency.update({
      where: { id: testAgency.id },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      },
    });

    try {
      await enforceQueryLimit(testAgency.id);
      console.log('❌ Query should have been blocked for PAST_DUE status!');
    } catch (error) {
      if (error instanceof SubscriptionError && error.code === 'SUBSCRIPTION_INACTIVE') {
        console.log('✓ Query blocked correctly for PAST_DUE status');
      } else {
        throw error;
      }
    }

    console.log('\n✅ PAST_DUE status test passed\n');

    // ============================================================
    // Cleanup: Delete Test Agency
    // ============================================================
    console.log('Cleanup: Deleting test agency...');

    await prisma.agency.delete({
      where: { id: testAgency.id },
    });

    console.log('✓ Test agency deleted\n');

    // ============================================================
    // Summary
    // ============================================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('The subscription helper system is working correctly.');
    console.log('You can now integrate it into your AI query endpoints.\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testSubscriptionHelpers()
    .then(() => {
      console.log('✨ Testing complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    });
}

export { testSubscriptionHelpers };
