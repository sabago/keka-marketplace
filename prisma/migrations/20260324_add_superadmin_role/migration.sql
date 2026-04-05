-- AlterEnum
-- Add SUPERADMIN value to UserRole enum
-- PostgreSQL requires creating a new enum, updating the column, then renaming

ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';
