import Stripe from 'stripe';
import { getSettings } from './serverSettings';

// Define Product type based on our Prisma schema
type Product = {
  id: string;
  title: string;
  description: string;
  price: number | bigint | string;
  thumbnail: string;
};

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Create a Stripe checkout session for the given products
 * @param products Array of products to checkout
 * @param customerEmail Customer email address
 * @returns Stripe checkout session
 */
export async function createCheckoutSession(
  products: (Product & { quantity: number })[],
  customerEmail?: string
): Promise<Stripe.Checkout.Session> {
  // Get settings to use the correct currency
  const settings = await getSettings();
  const currency = settings.currency.toLowerCase();
  
  // Create line items for Stripe checkout
  const lineItems = products.map((product) => ({
    price_data: {
      currency: currency,
      product_data: {
        name: product.title,
        description: product.description,
        images: [product.thumbnail],
      },
      unit_amount: Math.round(Number(product.price) * 100), // Convert to cents
    },
    quantity: product.quantity,
  }));

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    customer_email: customerEmail,
    metadata: {
      productIds: products.map((p) => p.id).join(','),
    },
  });

  return session;
}

/**
 * Retrieve a Stripe checkout session
 * @param sessionId Stripe checkout session ID
 * @returns Stripe checkout session
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Verify a Stripe webhook signature
 * @param payload Request body as a string
 * @param signature Stripe signature from request headers
 * @returns Event if signature is valid, throws error otherwise
 */
export function constructWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
}
