-- Migration: credtrack_standalone
-- Adds sourceApp discriminator to Agency and creates CredTrackSubscription table.
-- All changes are purely additive — zero breaking changes to existing MHC data.

-- 1. Add sourceApp column to Agency (existing rows default to 'MHC')
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "sourceApp" TEXT NOT NULL DEFAULT 'MHC';
CREATE INDEX IF NOT EXISTS "Agency_sourceApp_idx" ON "Agency"("sourceApp");

-- 2. Create CredTrackSubscription table for standalone CredTrack billing
CREATE TABLE IF NOT EXISTS "CredTrackSubscription" (
    "id"                   TEXT NOT NULL,
    "agencyId"             TEXT NOT NULL,
    "plan"                 TEXT NOT NULL DEFAULT 'STARTER',
    "status"               TEXT NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId"     TEXT,
    "stripeSubscriptionId" TEXT,
    "aiParseUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "billingPeriodEnd"     TIMESTAMP(3) NOT NULL,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredTrackSubscription_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "CredTrackSubscription_agencyId_key" ON "CredTrackSubscription"("agencyId");
CREATE UNIQUE INDEX IF NOT EXISTS "CredTrackSubscription_stripeCustomerId_key" ON "CredTrackSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "CredTrackSubscription_stripeSubscriptionId_key" ON "CredTrackSubscription"("stripeSubscriptionId");

-- Indexes
CREATE INDEX IF NOT EXISTS "CredTrackSubscription_agencyId_idx" ON "CredTrackSubscription"("agencyId");
CREATE INDEX IF NOT EXISTS "CredTrackSubscription_stripeCustomerId_idx" ON "CredTrackSubscription"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "CredTrackSubscription_status_idx" ON "CredTrackSubscription"("status");

-- Foreign key
ALTER TABLE "CredTrackSubscription" ADD CONSTRAINT "CredTrackSubscription_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
