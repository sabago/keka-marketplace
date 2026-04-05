-- Handle enum types properly
DO $$ BEGIN
    -- Check if ReminderFrequency needs updating (check if STANDARD exists)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'ReminderFrequency' AND e.enumlabel = 'STANDARD'
    ) THEN
        -- ReminderFrequency currently has DAILY,WEEKLY,etc but needs MINIMAL,STANDARD,FREQUENT
        -- Drop AgencyReminderFrequency if it exists (it was created with wrong values)
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencyReminderFrequency') THEN
            DROP TYPE "AgencyReminderFrequency";
        END IF;

        -- Rename current ReminderFrequency to AgencyReminderFrequency
        ALTER TYPE "ReminderFrequency" RENAME TO "AgencyReminderFrequency";

        -- Create new ReminderFrequency with correct values
        CREATE TYPE "ReminderFrequency" AS ENUM ('MINIMAL', 'STANDARD', 'FREQUENT');
    END IF;
END $$;

-- AlterTable: Add employeeId to CredentialReminder
ALTER TABLE "CredentialReminder" ADD COLUMN "employeeId" TEXT;

-- Backfill employeeId from EmployeeDocument
UPDATE "CredentialReminder" cr
SET "employeeId" = ed."employeeId"
FROM "EmployeeDocument" ed
WHERE cr."documentId" = ed.id;

-- Make employeeId NOT NULL
ALTER TABLE "CredentialReminder" ALTER COLUMN "employeeId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "CredentialReminder" ADD CONSTRAINT "CredentialReminder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index
CREATE INDEX "CredentialReminder_employeeId_sentAt_idx" ON "CredentialReminder"("employeeId", "sentAt");

-- CreateTable: NotificationPreferences
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailExpiringReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailExpiredReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailApprovalNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailRejectionNotifications" BOOLEAN NOT NULL DEFAULT true,
    "reminderFrequency" "ReminderFrequency" NOT NULL DEFAULT 'STANDARD',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weeklyDigestDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_employeeId_key" ON "NotificationPreferences"("employeeId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_employeeId_idx" ON "NotificationPreferences"("employeeId");

-- AddForeignKey
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update Agency.reminderFrequency to use new enum
-- First, create a temporary column
ALTER TABLE "Agency" ADD COLUMN "reminderFrequencyNew" "AgencyReminderFrequency" DEFAULT 'WEEKLY';

-- Drop the old column
ALTER TABLE "Agency" DROP COLUMN "reminderFrequency";

-- Rename the new column
ALTER TABLE "Agency" RENAME COLUMN "reminderFrequencyNew" TO "reminderFrequency";

-- Set default
ALTER TABLE "Agency" ALTER COLUMN "reminderFrequency" SET DEFAULT 'WEEKLY';
