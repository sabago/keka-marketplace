-- Migration: credential_file_and_doc_category
-- Adds DocumentCategory enum, CredentialPageRole enum, expands DocumentType
-- with multi-file config columns, creates CredentialFile table, and
-- backfills one CredentialFile row per existing StaffCredential.
--
-- StaffCredential.s3Key is NOT dropped — kept for backward compatibility.
-- It will be removed in a follow-up migration once all paths use CredentialFile.
--
-- Run: npx prisma migrate dev --name credential_file_and_doc_category
-- (Prisma generates the DDL diff automatically from schema changes;
--  the partial index and backfill INSERT below must be manually appended.)

-- 1. New enum: DocumentCategory
CREATE TYPE "DocumentCategory" AS ENUM (
  'LICENSE',
  'BACKGROUND_CHECK',
  'TRAINING',
  'HR',
  'ID',
  'INSURANCE',
  'VACCINATION',
  'COMPETENCY',
  'OTHER'
);

-- 2. New enum: CredentialPageRole
CREATE TYPE "CredentialPageRole" AS ENUM (
  'FRONT',
  'BACK',
  'SINGLE',
  'PAGE'
);

-- 3. New columns on DocumentType
ALTER TABLE "DocumentType"
  ADD COLUMN "category"           "DocumentCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "requiresFrontBack"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowsMultiPage"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "minFiles"           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxFiles"           INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "recheckCadenceDays" INTEGER,
  ADD COLUMN "aiParsingEnabled"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "customFields"       JSONB;

-- Supporting index for category queries
CREATE INDEX "DocumentType_category_idx" ON "DocumentType"("category");

-- 4. Partial unique index: prevents name collision within an agency.
--    Global types (agencyId IS NULL) are excluded — Postgres NULLs are not
--    equal, so multiple global types with the same name would be allowed by
--    a standard unique constraint. This partial index covers only agency-owned
--    types where agencyId IS NOT NULL.
CREATE UNIQUE INDEX "DocumentType_agencyId_name_key"
  ON "DocumentType" ("agencyId", "name")
  WHERE "agencyId" IS NOT NULL;

-- 5. CredentialFile table
CREATE TABLE "CredentialFile" (
  "id"           TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "s3Key"        TEXT NOT NULL,
  "fileName"     TEXT NOT NULL,
  "fileSize"     INTEGER NOT NULL,
  "mimeType"     TEXT NOT NULL,
  "pageRole"     "CredentialPageRole" NOT NULL DEFAULT 'SINGLE',
  "pageNumber"   INTEGER,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "uploadedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CredentialFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CredentialFile_credentialId_fkey"
    FOREIGN KEY ("credentialId")
    REFERENCES "EmployeeDocument"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CredentialFile_credentialId_idx" ON "CredentialFile"("credentialId");

-- 6. Backfill: one CredentialFile row per existing StaffCredential with an s3Key.
--    Uses gen_random_uuid() (native in Postgres 14+, or available in Postgres 13
--    via pgcrypto). If gen_random_uuid() is unavailable, run:
--      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--    and replace gen_random_uuid() with uuid_generate_v4().
INSERT INTO "CredentialFile"
  ("id", "credentialId", "s3Key", "fileName", "fileSize", "mimeType",
   "pageRole", "sortOrder", "uploadedAt")
SELECT
  gen_random_uuid()::text,
  id,
  "s3Key",
  "fileName",
  "fileSize",
  "mimeType",
  'SINGLE'::"CredentialPageRole",
  0,
  "createdAt"
FROM "EmployeeDocument"
WHERE "s3Key" IS NOT NULL AND "s3Key" <> '';
