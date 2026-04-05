# Chatbot Pricing Strategy Analysis
## Monetization Models for AI-Powered Referral Assistant

**Date**: November 19, 2025
**Context**: Chatbot costs ~$0.01-0.03 per query. Need pricing strategy that covers costs + generates profit.

---

## Option 1: Credit-Based System (Pay-As-You-Go) 💳

**How it works**: Agencies buy credits upfront, each query deducts credits

### Pricing Structure

**Credit Packages**:
```
Starter Pack:     50 credits  = $10  ($0.20 per query)
Professional:    250 credits  = $40  ($0.16 per query) - 20% savings
Business:        600 credits  = $80  ($0.13 per query) - 35% savings
Enterprise:    1,500 credits  = $150 ($0.10 per query) - 50% savings
```

**Cost Analysis**:
- Our cost: $0.02 per query (average)
- Revenue: $0.10-0.20 per query
- **Gross Margin: 80-90%** ✅

### Implementation Details

**Database Schema**:
```typescript
model Agency {
  id              String   @id @default(uuid())
  // ... other fields
  creditBalance   Int      @default(0)
  creditsUsed     Int      @default(0)
  creditsPurchased Int     @default(0)
}

model CreditTransaction {
  id              String   @id @default(uuid())
  agencyId        String
  agency          Agency   @relation(fields: [agencyId], references: [id])
  type            TransactionType  // PURCHASE, USAGE, REFUND, BONUS
  amount          Int              // Credits added or deducted
  balanceBefore   Int
  balanceAfter    Int
  description     String           // "Chatbot query" or "Purchased 250 credits"
  metadata        Json?            // Query details, purchase receipt, etc.
  createdAt       DateTime @default(now())
}

model ChatbotQuery {
  id              String   @id @default(uuid())
  agencyId        String
  agency          Agency   @relation(fields: [agencyId], references: [id])
  query           String
  response        String
  creditsUsed     Int      @default(1)
  tokensUsed      Int      // OpenAI tokens for cost tracking
  modelUsed       String   // "gpt-4-turbo", etc.
  responseTime    Int      // milliseconds
  userRating      Int?     // thumbs up/down
  createdAt       DateTime @default(now())
}
```

**Credit Deduction Logic**:
```typescript
async function askChatbot(agencyId: string, question: string) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId }
  });

  // Check if they have credits
  if (agency.creditBalance < 1) {
    throw new Error('Insufficient credits. Please purchase more.');
  }

  // Deduct credit BEFORE calling API (prevent abuse)
  await prisma.$transaction([
    // Deduct credit
    prisma.agency.update({
      where: { id: agencyId },
      data: {
        creditBalance: { decrement: 1 },
        creditsUsed: { increment: 1 }
      }
    }),
    // Log transaction
    prisma.creditTransaction.create({
      data: {
        agencyId,
        type: 'USAGE',
        amount: -1,
        balanceBefore: agency.creditBalance,
        balanceAfter: agency.creditBalance - 1,
        description: 'Chatbot query'
      }
    })
  ]);

  // Call OpenAI API
  const response = await generateChatbotResponse(question);

  // Log query
  await prisma.chatbotQuery.create({
    data: {
      agencyId,
      query: question,
      response: response.text,
      creditsUsed: 1,
      tokensUsed: response.usage.total_tokens,
      modelUsed: 'gpt-4-turbo',
      responseTime: response.latency
    }
  });

  return response;
}
```

**UI/UX**:
```
┌─────────────────────────────────────────────────────┐
│ 💬 Ask the AI Assistant                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Text input: "Which hospitals accept MassHealth?"] │
│                                                     │
│ Credits remaining: 47 / 250  [Buy More Credits]    │
│                                                     │
│ 💡 Tip: Each question uses 1 credit (~$0.16)       │
│                                                     │
│                               [Ask Question] button │
└─────────────────────────────────────────────────────┘
```

**Purchase Flow** (Stripe Checkout):
```typescript
// API endpoint: /api/credits/purchase
export async function POST(req: Request) {
  const { agencyId, packageId } = await req.json();

  const packages = {
    'starter': { credits: 50, price: 1000 },      // $10.00
    'pro': { credits: 250, price: 4000 },         // $40.00
    'business': { credits: 600, price: 8000 },    // $80.00
    'enterprise': { credits: 1500, price: 15000 } // $150.00
  };

  const pkg = packages[packageId];

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${pkg.credits} Chatbot Credits`,
          description: 'AI-powered referral assistant queries'
        },
        unit_amount: pkg.price
      },
      quantity: 1
    }],
    metadata: {
      agencyId,
      creditsToAdd: pkg.credits
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?credits_purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
  });

  return Response.json({ url: session.url });
}
```

**Webhook Handler** (Add credits after payment):
```typescript
// /api/webhooks/stripe
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { agencyId, creditsToAdd } = session.metadata;

    // Add credits to agency
    const agency = await prisma.agency.update({
      where: { id: agencyId },
      data: {
        creditBalance: { increment: parseInt(creditsToAdd) },
        creditsPurchased: { increment: parseInt(creditsToAdd) }
      }
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        agencyId,
        type: 'PURCHASE',
        amount: parseInt(creditsToAdd),
        balanceBefore: agency.creditBalance - parseInt(creditsToAdd),
        balanceAfter: agency.creditBalance,
        description: `Purchased ${creditsToAdd} credits`,
        metadata: { stripeSessionId: session.id }
      }
    });

    // Send confirmation email
    await sendEmail({
      to: agency.primaryContact.email,
      subject: 'Credits added to your Keka account',
      body: `You now have ${agency.creditBalance} chatbot credits available.`
    });
  }

  return Response.json({ received: true });
}
```

### Pros & Cons

**✅ Pros**:
- **Cost certainty**: Only pay for what you use
- **High margins**: 80-90% gross profit
- **No commitment**: Agencies can try without subscription
- **Flexibility**: Buy more when needed
- **Scalable**: Works for agencies of all sizes

**❌ Cons**:
- **Friction**: Users hesitate before each query ("Do I really need to ask this?")
- **Cognitive load**: Constantly thinking about credit balance
- **Lower engagement**: Usage anxiety reduces overall queries
- **Poor UX for power users**: Annoying to keep buying credits
- **Unpredictable revenue**: Can't forecast MRR easily

**Psychology**: Credits feel like a "loss" with every query → reduces usage → less value → higher churn

---

## Option 2: Subscription with Query Limits (Tiered Freemium) 🎯

**How it works**: Monthly subscription plans with included queries. Overage charges or blocks.

### Pricing Structure

```
Free Tier:
- 10 chatbot queries/month
- Basic directory access
- Save favorites
→ Goal: Hook users, convert to paid

Pro ($49/month):
- 100 chatbot queries/month (~3/day)
- Referral tracking & analytics
- AI recommendations
- Email digests
→ Goal: Individual agencies, occasional users

Business ($99/month):
- 500 chatbot queries/month (~17/day)
- Everything in Pro
- Intake process AI analysis
- Priority support
→ Goal: Active agencies, multiple staff

Enterprise ($299/month):
- Unlimited chatbot queries
- Everything in Business
- API access
- Custom reports
- Dedicated account manager
→ Goal: Large agencies, multi-location
```

**Overage Handling**:
```typescript
// Option A: Block after limit (freemium style)
if (queriesThisMonth >= plan.queryLimit) {
  return {
    error: "You've reached your monthly query limit. Upgrade to continue using the chatbot.",
    upgradeUrl: '/pricing'
  };
}

// Option B: Charge per overage (usage-based)
if (queriesThisMonth >= plan.queryLimit) {
  // Charge $0.50 per additional query
  await chargeOverage(agencyId, 0.50);
}
```

### Cost Analysis (Pro Plan Example)

**$49/month, 100 queries included**:
- Revenue: $49
- Cost: 100 queries × $0.02 = $2
- **Gross Margin: 96%** 🔥

**If they use all 100 queries**:
- Revenue per query: $0.49
- Cost per query: $0.02
- **24x markup on cost** ✅

**Even if they use 500 queries (5x over)**:
- Cost: 500 × $0.02 = $10
- **Gross Margin: 80%** (still great!)

### Implementation

**Database Schema**:
```typescript
model Agency {
  id                    String   @id @default(uuid())
  subscriptionPlan      PlanType @default(FREE)  // FREE, PRO, BUSINESS, ENTERPRISE
  subscriptionStatus    SubscriptionStatus       // ACTIVE, CANCELED, PAST_DUE
  stripeSubscriptionId  String?
  stripeCustomerId      String?

  // Usage tracking
  queriesThisMonth      Int      @default(0)
  queriesAllTime        Int      @default(0)
  billingPeriodStart    DateTime
  billingPeriodEnd      DateTime
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
}
```

**Query Limit Check**:
```typescript
const PLAN_LIMITS = {
  FREE: 10,
  PRO: 100,
  BUSINESS: 500,
  ENTERPRISE: 999999  // "unlimited"
};

async function checkQueryLimit(agencyId: string): Promise<boolean> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId }
  });

  const limit = PLAN_LIMITS[agency.subscriptionPlan];

  // Reset counter if new billing period
  if (new Date() > agency.billingPeriodEnd) {
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        queriesThisMonth: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: addMonths(new Date(), 1)
      }
    });
    return true;
  }

  return agency.queriesThisMonth < limit;
}
```

**UI with Usage Display**:
```
┌─────────────────────────────────────────────────────┐
│ Your Plan: Pro ($49/month)                          │
├─────────────────────────────────────────────────────┤
│ Chatbot queries: 47 / 100 used this month           │
│ [████████████░░░░░] 47%                             │
│                                                     │
│ Resets in 18 days                     [Upgrade]     │
└─────────────────────────────────────────────────────┘
```

**Upgrade Prompts**:
```typescript
// Show upgrade CTA when approaching limit
if (queriesThisMonth >= plan.queryLimit * 0.8) {
  showNotification({
    type: 'warning',
    message: `You've used 80% of your monthly queries. Upgrade to Business for 5x more queries.`,
    action: { label: 'Upgrade', url: '/pricing' }
  });
}

// Block at limit with upgrade option
if (queriesThisMonth >= plan.queryLimit) {
  return (
    <div className="text-center p-8">
      <h3>You've reached your monthly limit</h3>
      <p>You've used all {plan.queryLimit} queries for this month.</p>

      <div className="mt-4">
        <h4>Upgrade to continue:</h4>
        <PricingCards currentPlan="PRO" highlightPlan="BUSINESS" />
      </div>

      <p className="text-sm mt-4">
        Or wait {daysUntilReset} days for your queries to reset.
      </p>
    </div>
  );
}
```

### Pros & Cons

**✅ Pros**:
- **Predictable revenue**: MRR forecasting is easy
- **Better UX**: Users don't think about cost per query (within limits)
- **Higher engagement**: Use it freely until you hit limit
- **Upsell opportunity**: Easy to show value of upgrading
- **Industry standard**: SaaS model everyone understands
- **Very high margins**: 80-96% gross profit

**❌ Cons**:
- **Friction for free users**: Only 10 queries may feel too limiting
- **Waste for light users**: Pay $49 but only use 20 queries
- **Complex for heavy users**: Enterprise users may exceed 500 queries

**Psychology**: Subscription feels like "buying access" not "spending per use" → higher engagement

---

## Option 3: Hybrid Model (Best of Both Worlds) ⭐

**How it works**: Subscription plans with included queries + ability to buy credit top-ups

### Pricing Structure

```
Free:
- 10 queries/month included
- Can buy credit packs ($10 for 25 queries)

Pro ($49/month):
- 100 queries/month included
- Additional queries: $0.30 each (via credits)
- Or buy credit packs at discount: $15 for 100 queries

Business ($99/month):
- 500 queries/month included
- Additional queries: $0.20 each (via credits)

Enterprise ($299/month):
- 2,000 queries/month included
- Truly unlimited (no overage charges)
```

### How It Works

**Scenario 1: Within Limits**
- Agency has Pro plan (100 queries/month)
- They use 73 queries this month
- **Cost to them**: $49 (no additional charges)
- **They're happy**: Not wasting credits

**Scenario 2: Slightly Over**
- Agency has Pro plan (100 queries/month)
- They use 127 queries this month
- **Options**:
  - A) Auto-charge: $8.10 (27 queries × $0.30) billed to card
  - B) Buy credits: $15 for 100 credits (better value, used next month too)
- **They're happy**: Didn't get blocked, can choose payment method

**Scenario 3: Way Over**
- Agency consistently uses 300+ queries/month
- System suggests: "You've exceeded your limit 3 months in a row. Upgrade to Business and save $XX/month"
- **They upgrade**: Better value at $99/month for 500 queries

### Implementation

**Database Schema**:
```typescript
model Agency {
  id                    String   @id @default(uuid())

  // Subscription
  subscriptionPlan      PlanType @default(FREE)
  queriesThisMonth      Int      @default(0)

  // Credits (top-up balance)
  creditBalance         Int      @default(0)

  // Billing settings
  autoRecharge          Boolean  @default(false)
  autoRechargeThreshold Int?     // Recharge when credits drop below X
  autoRechargeAmount    Int?     // Buy X credits automatically
}
```

**Query Deduction Logic**:
```typescript
async function askChatbot(agencyId: string, question: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });

  const limit = PLAN_LIMITS[agency.subscriptionPlan];

  // Check if within monthly limit
  if (agency.queriesThisMonth < limit) {
    // Use included query
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        queriesThisMonth: { increment: 1 },
        queriesAllTime: { increment: 1 }
      }
    });
  }
  // Check if they have credits
  else if (agency.creditBalance > 0) {
    // Use credit
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        creditBalance: { decrement: 1 },
        queriesAllTime: { increment: 1 }
      }
    });

    // Auto-recharge if enabled and below threshold
    if (agency.autoRecharge &&
        agency.creditBalance - 1 <= agency.autoRechargeThreshold) {
      await purchaseCreditsAutomatically(agencyId, agency.autoRechargeAmount);
    }
  }
  // No credits and over limit
  else {
    throw new Error('QUERY_LIMIT_EXCEEDED');
  }

  // Generate response...
}
```

**UI for Overage**:
```
┌──────────────────────────────────────────────────────┐
│ ⚠️  You've used all 100 included queries this month   │
├──────────────────────────────────────────────────────┤
│ Choose how to continue:                              │
│                                                      │
│ Option 1: Buy Credit Top-Up                          │
│ • $15 for 100 queries ($0.15 each)                   │
│ • Credits never expire                               │
│ • Use across multiple months                         │
│ [Buy Credits]                                        │
│                                                      │
│ Option 2: Upgrade Your Plan                          │
│ • Business plan: 500 queries/month for $99           │
│ • Save $30/month vs buying credits                   │
│ • Includes advanced analytics                        │
│ [Upgrade to Business]                                │
│                                                      │
│ Option 3: Wait Until Next Month                      │
│ • Your queries reset in 12 days                      │
│ [I'll wait]                                          │
└──────────────────────────────────────────────────────┘
```

### Pros & Cons

**✅ Pros**:
- **Flexibility**: Works for both light and heavy users
- **No forced upgrades**: Can top up without changing plan
- **Better conversion**: Multiple paths to pay more
- **Reduces churn**: Don't lose users who hit limits
- **Revenue optimization**: Capture overage revenue without annoying users
- **High engagement**: Users feel empowered, not restricted

**❌ Cons**:
- **Complexity**: More complex to build and explain
- **Pricing confusion**: Some users may not understand the model
- **Support burden**: More questions about billing

**Psychology**: Feels generous ("multiple options") while maximizing revenue

---

## Option 4: Usage-Based Pricing (Pure Consumption) 📊

**How it works**: Like AWS or Vercel - pay only for what you use

### Pricing Structure

```
No monthly fee
Pay per query:
- First 100 queries/month: $0.50 each
- 101-500 queries: $0.30 each
- 501+ queries: $0.20 each

Prepaid credits (optional):
- Buy $50 credit → Get $60 worth (20% bonus)
- Buy $200 credit → Get $250 worth (25% bonus)
```

### Pros & Cons

**✅ Pros**:
- **Fair**: Only pay for actual usage
- **No commitment**: Great for trying the product
- **Scales naturally**: Heavy users automatically pay more

**❌ Cons**:
- **Unpredictable costs**: Agencies can't budget easily
- **Usage anxiety**: Fear of surprise bills
- **Low engagement**: Users hold back from asking questions
- **Not standard for SaaS**: Most users expect subscriptions

**Not Recommended**: This works for developers (AWS users) but not for agency staff who need predictability

---

## Competitive Benchmarking

**Similar AI Chat Products**:

| Product | Model | Price |
|---------|-------|-------|
| ChatGPT Plus | Subscription | $20/mo (unlimited) |
| Claude Pro | Subscription | $20/mo (unlimited) |
| Perplexity Pro | Subscription | $20/mo (unlimited) |
| Jasper AI | Subscription | $49/mo (unlimited) |
| Copy.ai | Freemium | $49/mo (unlimited) |

**Insight**: Most AI chat products use **unlimited subscription model** because:
1. Users hate counting queries
2. Encourages experimentation and discovery
3. Predictable pricing is more valuable than per-query savings

**But we're different**: Our chatbot is **domain-specific** (only referral info), not general-purpose

**Our advantage**: We can charge premium prices because we're solving a specific, valuable problem

---

## My Recommendation: Option 2 (Subscription) → Option 3 (Hybrid) 🎯

### Phase 1 (MVP Launch): Pure Subscription Model

Start with **Option 2** because:
1. **Simplest to build**: Just track queries per month, no credit system
2. **Standard SaaS model**: Agencies understand subscriptions
3. **Predictable revenue**: Easy to forecast MRR
4. **High engagement**: Users freely explore within limits
5. **Fast to ship**: Can launch in 2 weeks vs 4 weeks for hybrid

**Recommended Pricing for MVP**:
```
Free:           20 queries/month  (generous trial to hook users)
Pro:    $49/mo, 200 queries/month (enough for daily use)
Business: $99/mo, unlimited       (removes all friction)
```

**Why generous free tier?**:
- Need data to train recommendations → incentivize usage
- 20 queries = ~1 per weekday for a month (sufficient to evaluate)
- Can always reduce later if abused

### Phase 2 (After 3-6 Months): Add Hybrid Credits

Once you have traction, add **Option 3** (credits as top-up):
- Agencies love Pro plan but some need 250-300 queries
- They don't want to upgrade to $99/mo Business (overkill)
- Offer: "Buy 100 credit pack for $20" as middle ground
- **Result**: Capture extra $20-40/mo from power users without losing them

**Trigger for Phase 2**: When >20% of users hit their query limits monthly

---

## Recommended Implementation Plan

### Week 1-2: Core Subscription System

**1. Update Prisma Schema**:
```typescript
// Add to schema.prisma
enum PlanType {
  FREE
  PRO
  BUSINESS
}

model Agency {
  id                    String   @id @default(uuid())
  subscriptionPlan      PlanType @default(FREE)
  subscriptionStatus    SubscriptionStatus @default(ACTIVE)

  // Stripe
  stripeCustomerId      String?  @unique
  stripeSubscriptionId  String?  @unique

  // Usage tracking
  queriesThisMonth      Int      @default(0)
  queriesAllTime        Int      @default(0)
  billingPeriodStart    DateTime @default(now())
  billingPeriodEnd      DateTime

  // Track last reset (for debugging)
  lastQueryReset        DateTime?
}
```

**2. Create Pricing Page** (`/pricing`):
```tsx
// components/PricingPlans.tsx
export function PricingPlans({ currentPlan }: { currentPlan?: PlanType }) {
  const plans = [
    {
      name: 'Free',
      price: 0,
      queries: 20,
      features: [
        '20 AI chatbot queries/month',
        'Browse 125+ referral guides',
        'Search and filtering',
        'Save favorites',
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Pro',
      price: 49,
      queries: 200,
      features: [
        '200 AI chatbot queries/month',
        'Everything in Free',
        'Referral tracking & analytics',
        'AI-powered recommendations',
        'Email digests',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      highlighted: true
    },
    {
      name: 'Business',
      price: 99,
      queries: 'Unlimited',
      features: [
        'Unlimited AI chatbot queries',
        'Everything in Pro',
        'Intake process AI analysis',
        'Advanced analytics',
        'Custom reports',
        'Dedicated support'
      ],
      cta: 'Start Free Trial',
      highlighted: false
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {plans.map(plan => (
        <PricingCard
          key={plan.name}
          plan={plan}
          currentPlan={currentPlan}
        />
      ))}
    </div>
  );
}
```

**3. Stripe Subscription Setup**:
```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Create subscription checkout
export async function createSubscriptionCheckout(
  agencyId: string,
  priceId: string,
  trialDays: number = 14
) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId }
  });

  // Create or retrieve Stripe customer
  let customerId = agency.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: agency.primaryContact.email,
      metadata: { agencyId }
    });
    customerId = customer.id;

    await prisma.agency.update({
      where: { id: agencyId },
      data: { stripeCustomerId: customerId }
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,  // e.g., price_xxx for Pro plan
      quantity: 1
    }],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { agencyId }
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?subscription=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`
  });

  return session;
}
```

**4. Webhook Handler** (`/api/webhooks/stripe`):
```typescript
// Handle subscription lifecycle
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      const agencyId = subscription.metadata.agencyId;

      // Map Stripe price ID to our plan type
      const planMapping = {
        [process.env.STRIPE_PRO_PRICE_ID!]: 'PRO',
        [process.env.STRIPE_BUSINESS_PRICE_ID!]: 'BUSINESS'
      };

      await prisma.agency.update({
        where: { id: agencyId },
        data: {
          subscriptionPlan: planMapping[subscription.items.data[0].price.id],
          subscriptionStatus: subscription.status === 'active' ? 'ACTIVE' : 'PAST_DUE',
          stripeSubscriptionId: subscription.id,
          billingPeriodStart: new Date(subscription.current_period_start * 1000),
          billingPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });
      break;

    case 'customer.subscription.deleted':
      await prisma.agency.update({
        where: { stripeSubscriptionId: event.data.object.id },
        data: {
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'CANCELED'
        }
      });
      break;
  }

  return Response.json({ received: true });
}
```

**5. Query Limit Middleware**:
```typescript
// middleware/checkQueryLimit.ts
export async function checkQueryLimit(agencyId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
}> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId }
  });

  // Reset if new billing period
  if (new Date() > agency.billingPeriodEnd) {
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        queriesThisMonth: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: addMonths(new Date(), 1),
        lastQueryReset: new Date()
      }
    });

    return {
      allowed: true,
      remaining: PLAN_LIMITS[agency.subscriptionPlan],
      limit: PLAN_LIMITS[agency.subscriptionPlan],
      resetDate: addMonths(new Date(), 1)
    };
  }

  const limit = PLAN_LIMITS[agency.subscriptionPlan];
  const remaining = Math.max(0, limit - agency.queriesThisMonth);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetDate: agency.billingPeriodEnd
  };
}
```

**6. Update Chatbot API** (`/api/chatbot/query`):
```typescript
export async function POST(req: Request) {
  const { agencyId, question } = await req.json();

  // Check limit
  const limitCheck = await checkQueryLimit(agencyId);

  if (!limitCheck.allowed) {
    return Response.json({
      error: 'QUERY_LIMIT_EXCEEDED',
      message: `You've used all ${limitCheck.limit} queries for this month.`,
      resetDate: limitCheck.resetDate,
      upgradeUrl: '/pricing'
    }, { status: 429 });
  }

  // Generate response
  const response = await generateChatbotResponse(question);

  // Increment counter
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      queriesThisMonth: { increment: 1 },
      queriesAllTime: { increment: 1 }
    }
  });

  // Log query
  await prisma.chatbotQuery.create({
    data: {
      agencyId,
      query: question,
      response: response.text,
      tokensUsed: response.usage.total_tokens,
      modelUsed: 'gpt-4-turbo'
    }
  });

  return Response.json({
    answer: response.text,
    sources: response.sources,
    remaining: limitCheck.remaining - 1
  });
}
```

---

## Dashboard UI Examples

**Usage Widget**:
```tsx
// components/QueryUsageWidget.tsx
export function QueryUsageWidget({ agency }: { agency: Agency }) {
  const limit = PLAN_LIMITS[agency.subscriptionPlan];
  const used = agency.queriesThisMonth;
  const percentage = (used / limit) * 100;
  const daysUntilReset = differenceInDays(agency.billingPeriodEnd, new Date());

  // Color coding
  const getColor = () => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">AI Chatbot Queries</h3>
        {agency.subscriptionPlan === 'FREE' && (
          <Link href="/pricing" className="text-sm text-blue-600 hover:underline">
            Upgrade
          </Link>
        )}
      </div>

      <div className={`text-3xl font-bold ${getColor()}`}>
        {used} / {limit === 999999 ? '∞' : limit}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            percentage >= 90 ? 'bg-red-500' :
            percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-sm text-gray-600">
        <span>{limit - used} remaining</span>
        <span>Resets in {daysUntilReset} days</span>
      </div>

      {/* Warning if approaching limit */}
      {percentage >= 80 && agency.subscriptionPlan !== 'BUSINESS' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            You're approaching your monthly limit.
            <Link href="/pricing" className="font-medium underline ml-1">
              Upgrade to {agency.subscriptionPlan === 'FREE' ? 'Pro' : 'Business'}
            </Link>
            {' '}for {agency.subscriptionPlan === 'FREE' ? '10x' : 'unlimited'} queries.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Upgrade Modal** (shown when limit hit):
```tsx
// components/UpgradeModal.tsx
export function UpgradeModal({ currentPlan, onClose }: Props) {
  const recommendations = {
    FREE: 'Pro',
    PRO: 'Business'
  };

  const benefits = {
    Pro: [
      '200 queries/month (10x more)',
      'Referral tracking & analytics',
      'AI recommendations',
      'Email digests'
    ],
    Business: [
      'Unlimited queries (no limits!)',
      'Intake process AI',
      'Advanced analytics',
      'Priority support'
    ]
  };

  return (
    <Modal open onClose={onClose}>
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">
          You've reached your query limit
        </h2>

        <p className="text-gray-600 mb-6">
          You've used all your included queries for this month.
          Upgrade to continue using the AI assistant.
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-blue-900">
                Recommended: {recommendations[currentPlan]} Plan
              </h3>
              <ul className="mt-3 space-y-2">
                {benefits[recommendations[currentPlan]].map(benefit => (
                  <li key={benefit} className="flex items-center text-blue-800">
                    <CheckIcon className="w-5 h-5 mr-2" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">
                ${currentPlan === 'FREE' ? '49' : '99'}
                <span className="text-lg font-normal">/mo</span>
              </div>
              <button
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => window.location.href = '/pricing'}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Or wait {daysUntilReset} days for your queries to reset.
          </p>
          <button
            onClick={onClose}
            className="mt-2 text-blue-600 hover:underline"
          >
            I'll wait
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Environment Variables Needed

Add to `.env`:
```bash
# Stripe Subscription
STRIPE_PRO_PRICE_ID=price_xxx     # Create in Stripe Dashboard
STRIPE_BUSINESS_PRICE_ID=price_yyy
STRIPE_WEBHOOK_SECRET=whsec_xxx

# OpenAI
OPENAI_API_KEY=sk-xxx
```

---

## Monitoring & Optimization

**Key Metrics to Track**:
```typescript
// Admin analytics dashboard
SELECT
  subscriptionPlan,
  COUNT(*) as agencies,
  AVG(queriesThisMonth) as avg_queries,
  SUM(queriesThisMonth) as total_queries,
  SUM(CASE WHEN queriesThisMonth >= limit THEN 1 ELSE 0 END) as hit_limit_count
FROM Agency
WHERE subscriptionStatus = 'ACTIVE'
GROUP BY subscriptionPlan;
```

**Cost Analysis**:
```typescript
// Calculate actual costs vs revenue
const totalQueries = await prisma.chatbotQuery.count();
const totalTokens = await prisma.chatbotQuery.aggregate({
  _sum: { tokensUsed: true }
});

const estimatedCost = (totalTokens._sum.tokensUsed / 1000) * 0.01; // $0.01 per 1k tokens
const totalRevenue = await calculateMRR();

console.log(`
  Total Queries: ${totalQueries}
  Estimated Cost: $${estimatedCost}
  MRR: $${totalRevenue}
  Gross Margin: ${((totalRevenue - estimatedCost) / totalRevenue * 100).toFixed(1)}%
`);
```

---

## Summary: My Strong Recommendation 🎯

**Start with Subscription Model (Option 2)**:

✅ **Pricing**:
- Free: 20 queries/month
- Pro: $49/mo, 200 queries/month
- Business: $99/mo, unlimited queries

✅ **Why**:
- Fastest to build (2 weeks)
- Standard SaaS model (familiar to customers)
- Predictable revenue (MRR)
- High engagement (no query anxiety)
- 90%+ gross margins

✅ **Economics** (assuming 100 Pro customers):
- Revenue: $4,900/month
- Cost: ~$400/month (20k queries)
- **Profit: $4,500/month (92% margin)**

✅ **Phase 2** (after validation): Add credit top-ups for hybrid model

---

Want me to implement this subscription system? I can have it working in a few hours!

