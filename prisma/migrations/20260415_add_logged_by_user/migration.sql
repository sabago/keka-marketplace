ALTER TABLE "public"."ReferralTracking" ADD COLUMN "loggedByUserId" TEXT;
ALTER TABLE "public"."FavoriteReferral" ADD COLUMN "savedByUserId" TEXT;

CREATE INDEX "ReferralTracking_loggedByUserId_idx" ON "public"."ReferralTracking"("loggedByUserId");
CREATE INDEX "FavoriteReferral_savedByUserId_idx" ON "public"."FavoriteReferral"("savedByUserId");

ALTER TABLE "public"."ReferralTracking" ADD CONSTRAINT "ReferralTracking_loggedByUserId_fkey"
  FOREIGN KEY ("loggedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."FavoriteReferral" ADD CONSTRAINT "FavoriteReferral_savedByUserId_fkey"
  FOREIGN KEY ("savedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
