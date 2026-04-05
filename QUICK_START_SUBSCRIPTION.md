# Quick Start: Stripe Subscription System

## 5-Minute Setup Guide

### Step 1: Create Stripe Products (2 minutes)

```bash
cd /Users/sandraabago/keka/marketplace
npx tsx src/scripts/setup-stripe-products.ts
```

**Expected Output:**
```
🚀 Starting Stripe product setup...

✅ All products created successfully!

🔧 ENVIRONMENT VARIABLES
Add these to your .env file:

STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_BUSINESS=price_yyy
STRIPE_PRICE_ENTERPRISE=price_zzz
```

### Step 2: Update .env File (1 minute)

Add to your `.env`:

```env
# Copy from Step 1 output
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_BUSINESS=price_yyy
STRIPE_PRICE_ENTERPRISE=price_zzz

# Already configured (verify these exist)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 3: Configure Webhook (2 minutes)

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/webhook`
4. Select events:
   - ✅ customer.subscription.created
   - ✅ customer.subscription.updated
   - ✅ customer.subscription.deleted
   - ✅ invoice.payment_succeeded
   - ✅ invoice.payment_failed
5. Copy webhook secret → update `STRIPE_WEBHOOK_SECRET` in `.env`

### Step 4: Test (Optional)

```bash
# Test subscription helpers
npx tsx src/scripts/test-subscription-helpers.ts

# Test webhook locally (separate terminal)
stripe listen --forward-to localhost:3000/api/webhook
```

---

## Usage Examples

### 1. Create Checkout Session

```typescript
// pages/pricing.tsx
const handleSubscribe = async (plan: 'PRO' | 'BUSINESS' | 'ENTERPRISE') => {
  const priceId = {
    PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    BUSINESS: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS,
    ENTERPRISE: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
  }[plan];

  const response = await fetch('/api/subscription/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, agencyId: currentAgency.id }),
  });

  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe
};
```

### 2. Enforce Query Limits

```typescript
// app/api/ai/query/route.ts
import { enforceQueryLimit, incrementQueryCount } from '@/lib/subscriptionHelpers';

export async function POST(request: Request) {
  const { agencyId, query } = await request.json();

  // Check limit BEFORE processing
  try {
    await enforceQueryLimit(agencyId);
  } catch (error) {
    if (error.code === 'QUERY_LIMIT_REACHED') {
      return NextResponse.json(
        { error: error.message, upgradeUrl: '/pricing' },
        { status: 429 }
      );
    }
  }

  // Process query...
  const result = await processAIQuery(query);

  // Increment AFTER success
  await incrementQueryCount(agencyId);

  return NextResponse.json(result);
}
```

### 3. Show Subscription Status

```typescript
// app/dashboard/page.tsx
import { getSubscriptionStatus } from '@/lib/subscriptionHelpers';

export default async function Dashboard() {
  const status = await getSubscriptionStatus(currentAgency.id);

  return (
    <div>
      <h2>{status.subscriptionPlan} Plan</h2>
      <p>{status.queriesThisMonth} / {status.queryLimit} queries used</p>
      {status.queriesRemaining < 5 && (
        <Alert>Running low on queries! <Link href="/pricing">Upgrade</Link></Alert>
      )}
    </div>
  );
}
```

### 4. Billing Portal

```typescript
// components/ManageBillingButton.tsx
const handleManageBilling = async () => {
  const response = await fetch('/api/subscription/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agencyId: currentAgency.id }),
  });

  const { url } = await response.json();
  window.location.href = url;
};
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscription/create-checkout` | POST | Start subscription |
| `/api/subscription/portal` | POST | Manage billing |
| `/api/subscription/cancel` | POST | Cancel subscription |
| `/api/subscription/change-plan` | POST | Upgrade/downgrade |

---

## Query Limits

| Plan | Monthly Limit | Price |
|------|---------------|-------|
| FREE | 20 | $0 |
| PRO | 200 | $49 |
| BUSINESS | Unlimited | $99 |
| ENTERPRISE | Unlimited | $299 |

---

## Webhook Events Handled

- ✅ `customer.subscription.created` - New subscription
- ✅ `customer.subscription.updated` - Plan change
- ✅ `customer.subscription.deleted` - Cancellation
- ✅ `invoice.payment_succeeded` - Reset query count
- ✅ `invoice.payment_failed` - Mark past due

---

## Error Codes

```typescript
// Query limit reached
{ error: "Query limit reached", code: "QUERY_LIMIT_REACHED", status: 429 }

// Subscription inactive
{ error: "Subscription is PAST_DUE", code: "SUBSCRIPTION_INACTIVE", status: 402 }

// Agency not found
{ error: "Agency not found", code: "AGENCY_NOT_FOUND", status: 404 }
```

---

## Testing Checklist

- [ ] Run setup script successfully
- [ ] Environment variables configured
- [ ] Webhook endpoint configured in Stripe
- [ ] Test checkout flow (use Stripe test cards)
- [ ] Verify query limit enforcement
- [ ] Test plan upgrade
- [ ] Test subscription cancellation
- [ ] Confirm webhook events are received

**Stripe Test Card:** `4242 4242 4242 4242` (any future date, any CVC)

---

## Need Help?

- **Full Documentation:** See `SUBSCRIPTION_IMPLEMENTATION.md`
- **Implementation Summary:** See `SUBSCRIPTION_SUMMARY.md`
- **Code Examples:** See `/src/app/api/ai/query/route.example.ts`
- **Test Suite:** Run `npx tsx src/scripts/test-subscription-helpers.ts`

---

## Production Deployment

Before going live:

1. **Switch to Production Stripe Keys:**
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_... (production webhook)
   ```

2. **Run setup script in production:**
   ```bash
   NODE_ENV=production npx tsx src/scripts/setup-stripe-products.ts
   ```

3. **Update environment variables** with production price IDs

4. **Configure production webhook** at `https://yourdomain.com/api/webhook`

5. **Test end-to-end** with real payment flow

---

## That's It! 🎉

Your subscription system is ready to use. Start by integrating query limit enforcement into your AI endpoints.

**Questions?** Check the full documentation in `SUBSCRIPTION_IMPLEMENTATION.md`
