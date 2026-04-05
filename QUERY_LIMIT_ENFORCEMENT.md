# Query Limit Enforcement - Multi-User Agency Architecture

## Overview

The query limit system is designed to enforce quotas at the **agency level**, not per individual user. All staff members within an agency share the same monthly query quota.

## How It Works

### 1. Agency-Level Tracking

Each `Agency` record in the database tracks:
- `queriesThisMonth` - Current month's query count
- `queriesAllTime` - Total lifetime queries
- `subscriptionPlan` - FREE, PRO, BUSINESS, or ENTERPRISE
- `billingPeriodStart` / `billingPeriodEnd` - Current billing cycle

### 2. Query Limits by Plan

Located in `src/lib/subscriptionHelpers.ts`:

```typescript
const QUERY_LIMITS = {
  FREE: 20,
  PRO: 200,
  BUSINESS: -1,     // Unlimited
  ENTERPRISE: -1,   // Unlimited
};
```

### 3. Enforcement Flow

When any user makes a chatbot query (`POST /api/chatbot/query`):

```
1. Authenticate user → Get their agencyId
2. Check agency's queriesThisMonth vs plan limit
3. If limit exceeded → Return 429 error
4. Check cache for duplicate query
5. If cached → Return without counting
6. If not cached → Process query
7. Increment agency.queriesThisMonth
8. Log query to database
9. Cache result for future requests
```

### 4. Multi-User Scenario Example

**Scenario:** Small agency with PRO plan (200 queries/month) and 5 staff members

```
User A (AGENCY_ADMIN): Makes 50 queries
User B (AGENCY_USER): Makes 75 queries
User C (AGENCY_USER): Makes 30 queries
User D (AGENCY_USER): Makes 40 queries
User E (AGENCY_USER): Tries to make query #196

✅ User E's first 4 queries succeed (196-199)
❌ User E's 5th query fails: "Query limit exceeded"

All users are now blocked until:
- Next billing period starts, OR
- Agency upgrades to higher plan
```

### 5. Smart Caching

Duplicate queries don't count against the limit:

```
User A asks: "What is home health care?"
→ Counts as 1 query, cached for 24 hours

User B asks: "What is home health care?"
→ Returns cached result, counts as 0 queries

User C asks: "What is home health care?"
→ Returns cached result, counts as 0 queries
```

### 6. Concurrency Protection

The system uses database-level atomic operations to prevent race conditions:

```typescript
// Atomic increment - safe for concurrent requests
await prisma.agency.update({
  where: { id: agencyId },
  data: {
    queriesThisMonth: { increment: 1 },
    queriesAllTime: { increment: 1 },
  },
});
```

Even if 10 users make queries simultaneously, the counter increments correctly.

## Implementation Files

### Core Logic
- **`src/app/api/chatbot/query/route.ts`**
  - Main chatbot endpoint
  - Handles authentication, limit checking, and query processing

- **`src/lib/chatbotAuth.ts`**
  - `requireChatbotAuth()` - Authenticate user and get agencyId
  - `checkQueryLimit()` - Check if agency has quota remaining
  - `incrementQueryCount()` - Atomically increment agency counters
  - `logChatbotQuery()` - Log query details to database

- **`src/lib/subscriptionHelpers.ts`**
  - `getQueryLimit()` - Get limit for a plan type
  - `getSubscriptionStatus()` - Get agency's subscription details

### Middleware
- **`src/middleware.ts`**
  - Rate limiting: 50 requests/hour per IP for chatbot API
  - Agency-level rate limiting: 100 requests/hour per agency

## Monthly Reset

Query counters reset at the start of each billing period:

```typescript
// Function: resetMonthlyQueryCounts()
// Should be run as cron job on billing period start
await prisma.agency.updateMany({
  data: {
    queriesThisMonth: 0,
    lastQueryReset: new Date(),
  },
});
```

**Recommended:** Set up a cron job or scheduled task to call this function:
- For subscription-based: Reset on individual agency's billing period start
- For calendar-based: Reset all agencies on 1st of each month

## Upgrade Handling

When an agency upgrades their plan:

1. Stripe webhook fires (`customer.subscription.updated`)
2. Update agency record with new plan
3. Immediately apply new query limit
4. Existing `queriesThisMonth` carries over
5. New limit takes effect for next query

**Example:**
```
Agency on PRO (200/month) has used 180 queries
Upgrades to BUSINESS (unlimited)
→ Immediately can make unlimited queries
```

## Error Responses

### 429 - Quota Exceeded
```json
{
  "error": "Query limit exceeded",
  "message": "You have reached your monthly query limit of 200 queries.",
  "remaining": 0,
  "limit": 200,
  "plan": "PRO",
  "upgradeRequired": true
}
```

### 401 - Not Authenticated
```json
{
  "error": "Authentication required. Please sign in to use the AI chatbot."
}
```

### 403 - No Agency Association
```json
{
  "error": "Agency association required"
}
```

## Dashboard Display

The agency dashboard (`/agency` and `/agency/subscription`) shows:

- **Query Usage**: `X / Y queries used` with progress bar
- **Color-coded warnings**:
  - Green: < 70% used
  - Yellow: 70-89% used
  - Red: ≥ 90% used
- **Unlimited indicator**: Shows "Unlimited" for BUSINESS/ENTERPRISE

## Testing Multi-User Scenarios

### Test Case 1: Multiple Users Sharing Quota
```bash
# User 1 makes 100 queries
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/chatbot/query \
    -H "Authorization: Bearer USER1_TOKEN" \
    -d '{"query": "test query '$i'"}'
done

# User 2 makes 100 queries
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/chatbot/query \
    -H "Authorization: Bearer USER2_TOKEN" \
    -d '{"query": "test query '$i'"}'
done

# User 3 tries to query (should fail if limit is 200)
curl -X POST http://localhost:3000/api/chatbot/query \
  -H "Authorization: Bearer USER3_TOKEN" \
  -d '{"query": "this should fail"}'
```

### Test Case 2: Cache Effectiveness
```bash
# First user asks question (counts as 1)
curl -X POST http://localhost:3000/api/chatbot/query \
  -H "Authorization: Bearer USER1_TOKEN" \
  -d '{"query": "What is home health care?"}'

# Second user asks same question (counts as 0, cached)
curl -X POST http://localhost:3000/api/chatbot/query \
  -H "Authorization: Bearer USER2_TOKEN" \
  -d '{"query": "What is home health care?"}'
```

## Security Considerations

1. **Rate Limiting**: IP-based rate limiting prevents abuse
2. **Authentication**: All queries require valid NextAuth session
3. **Agency Association**: Users must belong to an approved agency
4. **Atomic Updates**: Prevents race conditions in concurrent scenarios
5. **Audit Trail**: All queries logged to `ChatbotQuery` table

## Monitoring & Analytics

Track query usage patterns:

```sql
-- Top queries across all agencies
SELECT query, COUNT(*) as count
FROM "ChatbotQuery"
GROUP BY query
ORDER BY count DESC
LIMIT 20;

-- Agency usage statistics
SELECT
  a."agencyName",
  a."subscriptionPlan",
  a."queriesThisMonth",
  a."queriesAllTime"
FROM "Agency" a
ORDER BY "queriesThisMonth" DESC;

-- Agencies approaching their limit
SELECT
  a."agencyName",
  a."queriesThisMonth",
  (CASE
    WHEN a."subscriptionPlan" = 'FREE' THEN 20
    WHEN a."subscriptionPlan" = 'PRO' THEN 200
    ELSE -1
  END) as limit
FROM "Agency" a
WHERE
  (a."subscriptionPlan" = 'FREE' AND a."queriesThisMonth" >= 16) OR
  (a."subscriptionPlan" = 'PRO' AND a."queriesThisMonth" >= 160);
```

## Future Enhancements

Potential improvements:

1. **Per-User Analytics**: Track which staff members use queries most
2. **Query Rollover**: Allow unused queries to roll over to next month
3. **Burst Credits**: Allow temporary quota increase for special occasions
4. **Email Alerts**: Notify admins at 80%, 90%, 100% usage
5. **Query Queue**: Queue queries when limit reached, process on next billing cycle
6. **Usage Reports**: Generate monthly reports for agency admins
