# Stripe Subscription System Implementation

## Overview

This document describes the complete Stripe subscription system implementation for the Keka marketplace platform.

## Architecture

### Components Implemented

1. **Stripe Product Setup Script** (`/src/scripts/setup-stripe-products.ts`)
2. **Subscription Helpers** (`/src/lib/subscriptionHelpers.ts`)
3. **API Endpoints**:
   - `/api/subscription/create-checkout` - Create checkout session
   - `/api/subscription/portal` - Access billing portal
   - `/api/subscription/cancel` - Cancel subscription
   - `/api/subscription/change-plan` - Upgrade/downgrade plan
4. **Enhanced Webhook Handler** (`/src/app/api/webhook/route.ts`)

---

## Subscription Tiers

| Plan | Price | Query Limit | Features |
|------|-------|-------------|----------|
| **FREE** | $0/month | 20 queries/month | Basic access, email support |
| **PRO** | $49/month | 200 queries/month | AI queries, knowledge base, analytics |
| **BUSINESS** | $99/month | Unlimited | Priority support, API access, integrations |
| **ENTERPRISE** | $299/month | Unlimited | White-glove service, SLA, custom contracts |

---

## Setup Instructions

### 1. Run the Product Setup Script

First, create your subscription products in Stripe:

```bash
cd /Users/sandraabago/keka/marketplace
npx tsx src/scripts/setup-stripe-products.ts
```

This will:
- Create 3 products in Stripe (PRO, BUSINESS, ENTERPRISE)
- Create recurring monthly prices for each
- Output Price IDs for your `.env` file

### 2. Configure Environment Variables

Add the generated Price IDs to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Subscription Price IDs (from setup script)
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_BUSINESS=price_yyy
STRIPE_PRICE_ENTERPRISE=price_zzz

# Application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Configure Webhook Endpoint

In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks):

1. Click "Add endpoint"
2. Set URL: `https://yourdomain.com/api/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

---

## API Endpoints

### Create Checkout Session

**POST** `/api/subscription/create-checkout`

Creates a Stripe Checkout session for subscription purchase.

**Request Body:**
```json
{
  "priceId": "price_xxx",
  "agencyId": "uuid"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Usage Example:**
```typescript
const response = await fetch('/api/subscription/create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: process.env.STRIPE_PRICE_PRO,
    agencyId: 'agency-uuid-here'
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Checkout
```

---

### Access Billing Portal

**POST** `/api/subscription/portal`

Creates a Stripe billing portal session for managing subscriptions.

**Request Body:**
```json
{
  "agencyId": "uuid"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Usage Example:**
```typescript
const response = await fetch('/api/subscription/portal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agencyId: 'agency-uuid-here' })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe Portal
```

---

### Cancel Subscription

**POST** `/api/subscription/cancel`

Cancels a subscription at the end of the billing period.

**Request Body:**
```json
{
  "agencyId": "uuid",
  "immediate": false // Optional: cancel immediately
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will be canceled at the end of the billing period",
  "cancelAt": "2025-12-19T00:00:00Z",
  "currentPeriodEnd": "2025-12-19T00:00:00Z"
}
```

---

### Change Plan

**POST** `/api/subscription/change-plan`

Updates subscription to a new plan (upgrade or downgrade).

**Request Body:**
```json
{
  "agencyId": "uuid",
  "newPriceId": "price_yyy"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully upgraded to BUSINESS plan",
  "isUpgrade": true,
  "newPlan": "BUSINESS",
  "effectiveDate": "2025-11-19T00:00:00Z",
  "nextBillingDate": "2025-12-19T00:00:00Z"
}
```

---

## Subscription Helper Functions

Located in `/src/lib/subscriptionHelpers.ts`:

### Query Limit Enforcement

```typescript
import { enforceQueryLimit, incrementQueryCount } from '@/lib/subscriptionHelpers';

// Before processing an AI query
try {
  await enforceQueryLimit(agencyId);

  // Process the query...

  // After successful query
  await incrementQueryCount(agencyId);
} catch (error) {
  if (error.code === 'QUERY_LIMIT_REACHED') {
    // Show upgrade prompt
    return { error: 'Query limit reached. Please upgrade your plan.' };
  }
}
```

### Get Subscription Status

```typescript
import { getSubscriptionStatus } from '@/lib/subscriptionHelpers';

const status = await getSubscriptionStatus(agencyId);

console.log(status);
// {
//   id: 'agency-uuid',
//   subscriptionPlan: 'PRO',
//   subscriptionStatus: 'ACTIVE',
//   queriesThisMonth: 45,
//   queryLimit: 200,
//   queriesRemaining: 155,
//   hasUnlimitedQueries: false,
//   isActive: true
// }
```

### Check and Reset Billing Period

```typescript
import { checkAndResetBillingPeriod } from '@/lib/subscriptionHelpers';

// Check if billing period has ended
const wasReset = await checkAndResetBillingPeriod(agencyId);

if (wasReset) {
  console.log('Billing period reset, query count is now 0');
}
```

---

## Webhook Events

The webhook handler (`/src/app/api/webhook/route.ts`) processes these events:

### customer.subscription.created

- Sets initial plan type and status
- Creates billing period dates
- Resets query count

### customer.subscription.updated

- Updates plan type if changed
- Updates subscription status
- Updates billing period dates

### customer.subscription.deleted

- Downgrades agency to FREE plan
- Resets subscription ID
- Maintains query tracking

### invoice.payment_succeeded

- Marks subscription as ACTIVE
- Resets query count for new billing period
- Updates billing period dates

### invoice.payment_failed

- Marks subscription as PAST_DUE
- Prevents new queries until payment succeeds
- TODO: Send email notification

---

## Query Limits

Enforced in `/src/lib/subscriptionHelpers.ts`:

| Plan | Monthly Limit |
|------|---------------|
| FREE | 20 |
| PRO | 200 |
| BUSINESS | Unlimited (-1) |
| ENTERPRISE | Unlimited (-1) |

### Limit Enforcement Flow

1. User attempts AI query
2. `enforceQueryLimit(agencyId)` is called
3. Checks:
   - Is subscription active?
   - Has unlimited queries OR within limit?
4. If checks pass, query proceeds
5. After successful query, `incrementQueryCount(agencyId)` is called
6. Query count updated in database

---

## Error Handling

The system uses a custom `SubscriptionError` class:

```typescript
class SubscriptionError extends Error {
  constructor(message: string, code: string);
}
```

**Error Codes:**
- `QUERY_LIMIT_REACHED` - Monthly query limit exceeded
- `SUBSCRIPTION_INACTIVE` - Subscription not active (canceled, past due)
- `AGENCY_NOT_FOUND` - Agency doesn't exist
- `UPGRADE_REQUIRED` - Feature requires higher plan

**Example Error Handling:**
```typescript
try {
  await enforceQueryLimit(agencyId);
} catch (error) {
  if (error instanceof SubscriptionError) {
    switch (error.code) {
      case 'QUERY_LIMIT_REACHED':
        return { error: error.message, upgradeUrl: '/pricing' };
      case 'SUBSCRIPTION_INACTIVE':
        return { error: error.message, billingUrl: '/billing' };
      default:
        return { error: error.message };
    }
  }
  throw error;
}
```

---

## Testing Scenarios

### 1. New Subscription Flow

```bash
# User clicks "Upgrade to PRO"
POST /api/subscription/create-checkout
{
  "priceId": "price_pro",
  "agencyId": "test-agency-id"
}

# Stripe redirects to checkout
# User completes payment
# Webhook receives customer.subscription.created
# Agency updated: plan=PRO, status=ACTIVE
```

### 2. Query Limit Enforcement

```typescript
// Agency on FREE plan (20 queries/month)
const agency = await getSubscriptionStatus('agency-id');
// queriesThisMonth: 19, queryLimit: 20

// 20th query - succeeds
await enforceQueryLimit('agency-id');
await incrementQueryCount('agency-id');

// 21st query - fails
await enforceQueryLimit('agency-id');
// ❌ Throws SubscriptionError: QUERY_LIMIT_REACHED
```

### 3. Billing Period Reset

```bash
# Invoice payment succeeds on Dec 1
Webhook: invoice.payment_succeeded

# resetQueryCount() is called
# Agency updated:
# - queriesThisMonth: 0
# - billingPeriodStart: Dec 1
# - billingPeriodEnd: Jan 1
```

### 4. Upgrade Flow

```bash
# User on PRO wants to upgrade to BUSINESS
POST /api/subscription/change-plan
{
  "agencyId": "agency-id",
  "newPriceId": "price_business"
}

# Stripe updates subscription with proration
# Webhook receives customer.subscription.updated
# Agency updated: plan=BUSINESS, queryLimit=unlimited
```

### 5. Cancellation Flow

```bash
# User clicks "Cancel Subscription"
POST /api/subscription/cancel
{
  "agencyId": "agency-id"
}

# Subscription marked for cancellation at period end
# Agency still has access until period ends
# On period end, webhook receives customer.subscription.deleted
# Agency downgraded to FREE plan
```

---

## Database Schema

The implementation uses the existing Prisma schema with these models:

```prisma
model Agency {
  // Subscription fields
  subscriptionPlan      PlanType             @default(FREE)
  subscriptionStatus    SubscriptionStatus   @default(ACTIVE)
  stripeCustomerId      String?              @unique
  stripeSubscriptionId  String?              @unique

  // Usage tracking
  queriesThisMonth      Int                  @default(0)
  queriesAllTime        Int                  @default(0)
  billingPeriodStart    DateTime             @default(now())
  billingPeriodEnd      DateTime
  lastQueryReset        DateTime?
}

enum PlanType {
  FREE
  PRO
  BUSINESS
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  TRIAL
  INCOMPLETE
}
```

---

## Frontend Integration

### Pricing Page Example

```typescript
// components/PricingPlans.tsx
import { useState } from 'react';

export function PricingPlans({ agencyId }: { agencyId: string }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, agencyId }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-grid">
      <PricingCard
        title="PRO"
        price="$49"
        features={['200 queries/month', 'Email support', 'Analytics']}
        onSubscribe={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO)}
        loading={loading}
      />
      {/* More pricing cards... */}
    </div>
  );
}
```

### Subscription Management Page

```typescript
// app/dashboard/subscription/page.tsx
export default async function SubscriptionPage() {
  const session = await getServerSession();
  const agency = await getAgency(session.user.id);
  const status = await getSubscriptionStatus(agency.id);

  return (
    <div>
      <h1>Subscription</h1>
      <div className="current-plan">
        <h2>{status.subscriptionPlan} Plan</h2>
        <p>Status: {status.subscriptionStatus}</p>
        <p>{status.queriesThisMonth} / {status.queryLimit} queries used</p>
      </div>

      <ManageBillingButton agencyId={agency.id} />
      <UpgradePlanButton agencyId={agency.id} currentPlan={status.subscriptionPlan} />
    </div>
  );
}
```

---

## Security Considerations

1. **Webhook Signature Verification**: All webhooks verify Stripe signatures
2. **Agency ID Validation**: All endpoints validate agency ownership
3. **Price ID Validation**: Only allowed price IDs are accepted
4. **Idempotency**: Webhook handlers check for duplicate processing

---

## Monitoring and Analytics

### Key Metrics to Track

1. **Subscription Metrics**:
   - Active subscriptions by plan
   - Monthly recurring revenue (MRR)
   - Churn rate
   - Upgrade/downgrade rates

2. **Usage Metrics**:
   - Average queries per plan
   - Users hitting limits
   - Time to limit exhaustion

3. **Conversion Metrics**:
   - Free to paid conversion rate
   - Trial conversion rate
   - Upgrade prompt effectiveness

### Logging

All webhook events are logged with:
- Event type
- Agency ID
- Plan changes
- Status updates
- Error details

---

## Future Enhancements

1. **Email Notifications**:
   - Welcome emails on subscription
   - Payment failure alerts
   - Usage threshold warnings (75%, 90% of limit)
   - Renewal reminders

2. **Usage Analytics Dashboard**:
   - Real-time query usage graphs
   - Projection to limit
   - Historical trends

3. **Add-ons**:
   - Purchase additional query packs
   - One-time feature unlocks

4. **Annual Billing**:
   - Discounted annual plans
   - Save 20% with annual billing

5. **Custom Enterprise Plans**:
   - Custom pricing
   - Volume discounts
   - Custom contract terms

---

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify webhook secret in `.env`
3. Check Stripe Dashboard webhook logs
4. Ensure events are selected in Stripe

### Query Limit Not Resetting

1. Check `invoice.payment_succeeded` webhook is configured
2. Verify billing period dates in database
3. Check webhook logs for errors

### Subscription Status Not Updating

1. Verify webhook events are being received
2. Check agency ID in subscription metadata
3. Review webhook handler logs

---

## Support

For issues or questions:
1. Check Stripe Dashboard logs
2. Review application logs
3. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`

---

## Summary

The subscription system is fully integrated with:
- ✅ Stripe product setup script
- ✅ 4 subscription API endpoints
- ✅ Enhanced webhook handler with 5 subscription events
- ✅ Query limit enforcement
- ✅ Automatic billing period resets
- ✅ Upgrade/downgrade support with prorations
- ✅ Billing portal access

All components are production-ready and follow Stripe best practices.
