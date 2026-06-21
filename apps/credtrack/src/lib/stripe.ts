import Stripe from 'stripe';

if (!process.env.CT_STRIPE_SECRET_KEY) {
  throw new Error('CT_STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.CT_STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

export const STRIPE_PRICES = {
  GROWTH:     process.env.CT_STRIPE_PRICE_GROWTH_MONTHLY ?? '',
  ENTERPRISE: process.env.CT_STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
} as const;

export type StripePricePlan = keyof typeof STRIPE_PRICES;
