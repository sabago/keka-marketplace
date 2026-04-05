-- AlterTable: Add missing fields to CredentialParsingJob
ALTER TABLE "CredentialParsingJob" ADD COLUMN "s3Key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CredentialParsingJob" ADD COLUMN "fileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CredentialParsingJob" ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CredentialParsingJob" ADD COLUMN "documentTypeName" TEXT;
ALTER TABLE "CredentialParsingJob" ADD COLUMN "metadata" JSONB;
ALTER TABLE "CredentialParsingJob" ADD COLUMN "retryAt" TIMESTAMP(3);

-- Backfill s3Key, fileName, and mimeType from EmployeeDocument
UPDATE "CredentialParsingJob" cpj
SET
  "s3Key" = ed."s3Key",
  "fileName" = ed."fileName",
  "mimeType" = ed."mimeType",
  "documentTypeName" = dt."name"
FROM "EmployeeDocument" ed
LEFT JOIN "DocumentType" dt ON ed."documentTypeId" = dt.id
WHERE cpj."documentId" = ed.id;

-- Remove default values (only needed for backfill)
ALTER TABLE "CredentialParsingJob" ALTER COLUMN "s3Key" DROP DEFAULT;
ALTER TABLE "CredentialParsingJob" ALTER COLUMN "fileName" DROP DEFAULT;
ALTER TABLE "CredentialParsingJob" ALTER COLUMN "mimeType" DROP DEFAULT;
