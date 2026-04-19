-- Add composite index for fast credential history + gap detection queries.
-- No data movement — index only.
CREATE INDEX IF NOT EXISTS "EmployeeDocument_staffMemberId_documentTypeId_status_idx"
  ON "EmployeeDocument" ("employeeId", "documentTypeId", "status");
