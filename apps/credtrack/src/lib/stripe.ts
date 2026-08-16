import Stripe from 'stripe';

export const STRIPE_PRICES = {
  GROWTH:     process.env.CT_STRIPE_PRICE_GROWTH_MONTHLY ?? '',
  ENTERPRISE: process.env.CT_STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
} as const;

export type StripePricePlan = keyof typeof STRIPE_PRICES;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.CT_STRIPE_SECRET_KEY) {
      throw new Error('CT_STRIPE_SECRET_KEY is required');
    }
    _stripe = new Stripe(process.env.CT_STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

// Keep named export for backwards compat — lazily initialized
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});
