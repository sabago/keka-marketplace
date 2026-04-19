CREATE TABLE "public"."ReferralStatusHistory" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ReferralStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferralStatusHistory_referralId_idx" ON "public"."ReferralStatusHistory"("referralId");

ALTER TABLE "public"."ReferralStatusHistory" ADD CONSTRAINT "ReferralStatusHistory_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."ReferralTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create an initial SUBMITTED entry for all existing referrals
INSERT INTO "public"."ReferralStatusHistory" ("id", "referralId", "status", "changedAt")
SELECT gen_random_uuid()::text, "id", 'SUBMITTED'::"ReferralStatus", "createdAt"
FROM "public"."ReferralTracking";
