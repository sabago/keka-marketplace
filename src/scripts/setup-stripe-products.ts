/**
 * Stripe Product Setup Script
 *
 * This script creates subscription products and prices in Stripe for the Keka marketplace.
 * Run this once to set up your Stripe account with the necessary subscription tiers.
 *
 * Usage:
 *   npx tsx src/scripts/setup-stripe-products.ts
 *
 * Make sure STRIPE_SECRET_KEY is set in your environment before running.
 */

import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Subscription product definitions
const PRODUCTS = [
  {
    name: 'PRO',
    description: 'Professional plan for growing agencies - 200 queries per month',
    price: 4900, // $49.00 in cents
    queryLimit: 200,
    features: [
      '200 AI queries per month',
      'Access to knowledge base',
      'Email support',
      'Basic analytics',
    ],
  },
  {
    name: 'BUSINESS',
    description: 'Business plan for established agencies - unlimited queries',
    price: 9900, // $99.00 in cents
    queryLimit: -1, // unlimited
    features: [
      'Unlimited AI queries',
      'Priority email support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
    ],
  },
  {
    name: 'ENTERPRISE',
    description: 'Enterprise plan with white-glove support - unlimited queries',
    price: 29900, // $299.00 in cents
    queryLimit: -1, // unlimited
    features: [
      'Unlimited AI queries',
      'Dedicated account manager',
      'White-glove onboarding',
      'Custom training',
      'Priority API access',
      'SLA guarantees',
      'Custom contracts',
    ],
  },
];

async function setupStripeProducts() {
  console.log('🚀 Starting Stripe product setup...\n');

  const results: Array<{
    tier: string;
    productId: string;
    priceId: string;
    price: string;
  }> = [];

  for (const productDef of PRODUCTS) {
    try {
      console.log(`📦 Creating product: ${productDef.name}...`);

      // Create the product
      const product = await stripe.products.create({
        name: `Keka ${productDef.name} Plan`,
        description: productDef.description,
        metadata: {
          tier: productDef.name,
          queryLimit: productDef.queryLimit.toString(),
          features: JSON.stringify(productDef.features),
        },
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create the recurring price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: productDef.price,
        currency: 'usd',
        recurring: {
          interval: 'month',
          usage_type: 'licensed', // Fixed price, not usage-based
        },
        metadata: {
          tier: productDef.name,
          queryLimit: productDef.queryLimit.toString(),
        },
      });

      console.log(`   ✅ Price created: ${price.id}`);
      console.log(
        `   💰 Amount: $${(productDef.price / 100).toFixed(2)}/month\n`
      );

      results.push({
        tier: productDef.name,
        productId: product.id,
        priceId: price.id,
        price: `$${(productDef.price / 100).toFixed(2)}`,
      });
    } catch (error) {
      console.error(`   ❌ Error creating ${productDef.name}:`, error);
      throw error;
    }
  }

  // Output summary and environment variables
  console.log('✅ All products created successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  results.forEach((result) => {
    console.log(`${result.tier} Plan:`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  Price ID:   ${result.priceId}`);
    console.log(`  Price:      ${result.price}/month\n`);
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔧 ENVIRONMENT VARIABLES');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Add these to your .env file:\n');

  results.forEach((result) => {
    console.log(`STRIPE_PRICE_${result.tier}=${result.priceId}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎯 NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('1. Copy the environment variables above to your .env file');
  console.log('2. Configure your Stripe webhook endpoint in the Stripe Dashboard');
  console.log('3. Add STRIPE_WEBHOOK_SECRET to your .env file');
  console.log('4. Test the subscription flow in Stripe test mode');
  console.log('5. Update your frontend to display these plans\n');

  return results;
}

// Run the setup
if (require.main === module) {
  setupStripeProducts()
    .then(() => {
      console.log('✨ Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupStripeProducts };
