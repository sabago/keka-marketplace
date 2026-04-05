# Prisma Schema Migration Guide

## Summary

The Prisma schema has been successfully updated with new subscription platform models for agency and user management.

## Changes Made

### 1. Updated Models

#### Agency Model (Updated)
- Changed `name` → `agencyName`
- Changed `slug` and `email` → `licenseNumber` (unique identifier)
- Changed `planType` → `subscriptionPlan`
- Removed: `slug`, `email`, `phone`, `address`, `city`, `state`, `zipCode`, `trialEndsAt`, etc.
- Added comprehensive fields:
  - Usage tracking: `queriesThisMonth`, `queriesAllTime`, `billingPeriodStart`, `billingPeriodEnd`, `lastQueryReset`
  - Profile: `serviceArea`, `primaryContactName`, `primaryContactRole`, `primaryContactEmail`, `primaryContactPhone`
  - Operational: `intakeMethod`, `avgReferralsPerMonth`, `timeToProcessReferral`, `staffHandlingIntake`, `painPoints`, `preferredChannels`, `specializations`
  - Consent: `consentToAnalytics`, `consentToProcessRecs`

#### User Model (Updated)
- Added `password` field for credentials-based auth
- Removed relations: `chatbotQueries`, `eventLogs`, `favoriteReferrals`
- Simplified to NextAuth-compatible structure

#### ChatbotQuery Model (Updated)
- Changed `question` → `query`
- Removed `user` relation and `userId`
- Added: `tokensUsed`, `modelUsed`, `sourcesReturned` (Json)
- Removed: `resultsReturned`, `wasHelpful`, `feedbackComment`, `sessionId`, `ipAddress`, `userAgent`

#### EventLog Model (Updated)
- Removed `user` relation and `userId`
- Changed `metadata` → `eventData`
- Changed `ipAddress` → `ipHash`
- Removed `pageUrl`

#### ReferralTracking Model (Updated)
- Completely restructured for better referral source tracking
- Added: `referralSourceSlug`, `submissionDate`, `submissionMethod`, `patientType`, `statusUpdatedAt`, `accepted`, `patientStarted`
- Removed: `patientName`, `referralSource`, `targetAgency`, `acceptedAt`, `declinedAt`, `declineReason`, `patientStartedAt`

#### FavoriteReferral Model (Updated)
- Changed from user-based to agency-based
- Removed `userId` and `user` relation
- Added `agencyId` and `agency` relation
- Changed `itemType` and `itemId` → `articleSlug`
- Added `notes` field

#### CreditTransaction Model (Updated)
- Removed `balanceAfter` field
- Changed `relatedQueryId` → `relatedEntityId`
- Removed transaction type index

### 2. Files Created

- `/Users/sandraabago/keka/marketplace/src/scripts/seed-agencies.ts` - Seed script with 2 test agencies
- `/Users/sandraabago/keka/marketplace/prisma-migrate.sh` - Helper script for Node.js v16 compatibility
- `/Users/sandraabago/keka/marketplace/MIGRATION_GUIDE.md` - This guide

## Running Migrations

### Prerequisites

**IMPORTANT**: Your current environment uses Node.js v16.19.0, which requires the `--experimental-wasm-reftypes` flag to run Prisma.

### Option 1: Using the Helper Script

```bash
cd /Users/sandraabago/keka/marketplace
./prisma-migrate.sh migrate dev --name add_subscription_platform
./prisma-migrate.sh generate
```

### Option 2: Direct Node Command

```bash
cd /Users/sandraabago/keka/marketplace
node --experimental-wasm-reftypes ./node_modules/.bin/prisma migrate dev --name add_subscription_platform
node --experimental-wasm-reftypes ./node_modules/.bin/prisma generate
```

### Option 3: Upgrade Node.js (Recommended)

Upgrade to Node.js v18.17.0 or v20+ to avoid compatibility issues:

```bash
# Using nvm
nvm install 20
nvm use 20

# Then run normally
npx prisma migrate dev --name add_subscription_platform
npx prisma generate
```

## Database Connection Issue

The current `.env` file uses Railway's internal URL (`postgres.railway.internal`), which is **not accessible from local development**.

### To Run Migrations

You need to either:

1. **Update DATABASE_URL** with a publicly accessible Railway connection string
2. **Run migrations in Railway's environment** (recommended for production)
3. **Use a local PostgreSQL instance** for development

### Getting Railway Public URL

1. Go to your Railway dashboard
2. Click on your PostgreSQL service
3. Copy the **PUBLIC** connection string (not the internal one)
4. Update `.env` with this public URL

## Seeding the Database

After running migrations successfully:

```bash
# Using ts-node
npx ts-node src/scripts/seed-agencies.ts

# Or compile and run
npx tsx src/scripts/seed-agencies.ts
```

The seed script creates:
- **Agency 1**: Sunshine Home Health Agency (Free plan, 2 users)
- **Agency 2**: Metro Care Services (Pro plan, 3 users)
- Sample chatbot queries for both agencies

## Validation

The schema has been validated successfully:

```bash
./prisma-migrate.sh validate
# Output: The schema at prisma/schema.prisma is valid 🚀
```

Prisma Client has been generated successfully with the new schema.

## Next Steps

1. **Update DATABASE_URL** in `.env` to use a publicly accessible connection string
2. **Run the migration**: `./prisma-migrate.sh migrate dev --name add_subscription_platform`
3. **Generate Prisma Client** (already done): `./prisma-migrate.sh generate`
4. **Seed test data**: `npx tsx src/scripts/seed-agencies.ts`
5. **Update application code** to use the new schema fields
6. **Test thoroughly** before deploying to production

## Schema Status

✅ Schema validated successfully
✅ Prisma Client generated
⚠️ Migration pending (requires valid DATABASE_URL)
✅ Seed script created and ready
