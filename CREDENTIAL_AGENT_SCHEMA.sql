-- Credential Agent Database Schema Extensions
-- This file documents the schema changes needed for the credential tracking feature

-- ============================================================================
-- 1. EXTEND EXISTING MODELS
-- ============================================================================

-- Extend EmployeeDocument model with credential-specific fields
-- Note: This is Prisma schema notation, not raw SQL. Actual migration will be generated.

/*
model EmployeeDocument {
  // ... EXISTING FIELDS (keep all) ...
  id              String   @id @default(uuid())
  employeeId      String
  documentTypeId  String
  s3Key           String
  fileName        String
  fileSize        Int
  mimeType        String
  issueDate       DateTime?
  expirationDate  DateTime?
  status          DocumentStatus @default(ACTIVE)
  uploadedBy      String
  notes           String?  @db.Text
  lastReminderSent DateTime?
  remindersSent   Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // NEW: Credential-specific metadata
  issuer            String?              // "American Red Cross", "MA Board of Nursing"
  licenseNumber     String?              // "RN123456", "CPR-2024-001"
  verificationUrl   String?              // URL to verify credential online

  // NEW: AI parsing metadata
  aiParsedData      Json?                // Raw LLM extraction output
  aiConfidence      Float?               // 0.0-1.0 confidence score
  aiParsedAt        DateTime?
  aiParsedBy        String?              // Model name (e.g., "gpt-4-turbo")

  // NEW: Review workflow
  reviewStatus      ReviewStatus         @default(PENDING_UPLOAD)
  reviewedBy        String?              // Admin user ID who reviewed
  reviewedAt        DateTime?
  reviewNotes       String?   @db.Text

  // NEW: Compliance tracking
  isCompliant       Boolean              @default(false)
  complianceCheckedAt DateTime?

  // Relations
  employee          Employee         @relation(...)
  documentType      DocumentType     @relation(...)
  reminders         CredentialReminder[]

  @@index([employeeId, status])
  @@index([status, expirationDate])
  @@index([reviewStatus])
  @@index([agencyId, status])  // For compliance queries
}

enum ReviewStatus {
  PENDING_UPLOAD     // Slot created, no document yet
  PENDING_REVIEW     // Document uploaded, needs admin review
  APPROVED           // Admin verified
  REJECTED           // Document rejected (quality/authenticity issues)
  NEEDS_CORRECTION   // Needs employee to re-upload
}

// EXTEND existing DocumentStatus enum
enum DocumentStatus {
  ACTIVE             // Valid and current
  EXPIRING_SOON      // Within warning window (30 days default)
  EXPIRED            // Past expiration date
  MISSING            // Required but not uploaded
  ARCHIVED           // Superseded by newer version
  PENDING_REVIEW     // Uploaded but not yet approved
}
*/

-- ============================================================================
-- 2. NEW MODELS
-- ============================================================================

-- 2.1 CredentialReminder - Track reminder history
/*
model CredentialReminder {
  id                String   @id @default(uuid())

  // Relations
  documentId        String
  document          EmployeeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  agencyId          String
  agency            Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  // Reminder details
  reminderType      ReminderType     // EXPIRING_SOON, EXPIRED, MISSING
  sentAt            DateTime         @default(now())
  sentTo            String[]         // Email addresses that received the reminder
  channel           NotificationChannel // EMAIL, SMS, IN_APP

  // Context
  daysBeforeExpiry  Int?             // How many days before expiration
  templateUsed      String?          // Email template identifier
  metadata          Json?            // Additional context

  @@index([documentId, sentAt])
  @@index([agencyId, sentAt])
  @@index([reminderType, sentAt])
}

enum ReminderType {
  EXPIRING_SOON    // Credential expiring soon
  EXPIRED          // Credential expired
  MISSING          // Required credential not uploaded
  RENEWAL_DUE      // Time to renew
  FOLLOW_UP        // Follow-up on previous reminder
}

enum NotificationChannel {
  EMAIL
  SMS
  IN_APP
  WEBHOOK
}
*/

-- 2.2 ComplianceSnapshot - Historical compliance tracking
/*
model ComplianceSnapshot {
  id                String   @id @default(uuid())

  // Relations
  agencyId          String
  agency            Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  // Snapshot metadata
  snapshotDate      DateTime @default(now())
  period            String?  // "2024-Q1", "2024-03", etc.

  // Aggregated statistics
  totalEmployees    Int
  activeEmployees   Int

  totalCredentials  Int
  validCredentials  Int
  expiringCredentials Int      // Within warning window
  expiredCredentials Int
  missingCredentials Int
  pendingReviewCredentials Int

  complianceRate    Float    // Percentage (0-100)

  // Breakdowns (stored as JSON for flexibility)
  byCredentialType  Json     // { "CPR": { valid: 10, expiring: 2, expired: 1 }, ... }
  byDepartment      Json?    // { "Nursing": { complianceRate: 95.5, ... }, ... }
  byEmployee        Json?    // Array of employee compliance records

  // Metadata
  createdBy         String?  // User who generated report
  notes             String?  @db.Text

  @@index([agencyId, snapshotDate])
  @@index([snapshotDate])
}
*/

-- 2.3 WebhookSubscription - Outbound webhook configuration
/*
model WebhookSubscription {
  id          String   @id @default(uuid())

  // Relations
  agencyId    String
  agency      Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  // Webhook configuration
  url         String              // Endpoint to POST to
  events      String[]            // ["credential.updated", "credential.expiring", ...]
  secret      String              // For HMAC signature verification
  isActive    Boolean  @default(true)

  // Tracking
  lastTriggeredAt DateTime?
  successCount    Int      @default(0)
  failureCount    Int      @default(0)
  lastError       String?  @db.Text

  // Metadata
  name        String?             // "BambooHR Integration"
  description String?  @db.Text
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  deliveries  WebhookDelivery[]

  @@index([agencyId, isActive])
}
*/

-- 2.4 WebhookDelivery - Webhook delivery log
/*
model WebhookDelivery {
  id            String   @id @default(uuid())

  // Relations
  subscriptionId String
  subscription  WebhookSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  // Delivery details
  event         String   // Event type (e.g., "credential.updated")
  payload       Json     // Data sent

  // Response tracking
  responseCode  Int?     // HTTP status code
  responseBody  String?  @db.Text
  responseTime  Int?     // Milliseconds

  // Timing
  attemptedAt   DateTime @default(now())
  succeededAt   DateTime?
  failedAt      DateTime?

  // Error handling
  error         String?  @db.Text
  retryCount    Int      @default(0)
  nextRetryAt   DateTime?

  @@index([subscriptionId, attemptedAt])
  @@index([event, attemptedAt])
  @@index([nextRetryAt])  // For retry processing
}
*/

-- 2.5 ApiKey - API key management for integrations
/*
model ApiKey {
  id          String   @id @default(uuid())

  // Relations
  agencyId    String
  agency      Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  // Key details
  name        String              // "BambooHR Integration", "Payroll Sync"
  key         String   @unique    // Hashed key (bcrypt)
  keyPrefix   String              // First 8 chars for identification (e.g., "ak_live_12345678")

  // Permissions
  permissions String[]            // ["read:credentials", "write:credentials", ...]
  scopes      String[]            // ["agency:123"]

  // Tracking
  lastUsedAt  DateTime?
  usageCount  Int      @default(0)

  // Lifecycle
  expiresAt   DateTime?
  createdBy   String              // User ID who created
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
  revokedBy   String?

  @@index([agencyId])
  @@index([keyPrefix])
  @@index([expiresAt])
}
*/

-- 2.6 CredentialParsingJob - Background job queue
/*
model CredentialParsingJob {
  id            String   @id @default(uuid())

  // Relations
  documentId    String   @unique
  document      EmployeeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  agencyId      String
  agency        Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)

  // Job details
  status        JobStatus        @default(PENDING)
  priority      Int              @default(0)  // Higher = more urgent

  // Processing
  attemptCount  Int              @default(0)
  maxAttempts   Int              @default(3)
  processingStartedAt DateTime?
  processingCompletedAt DateTime?

  // Error handling
  error         String?  @db.Text
  lastError     String?  @db.Text

  // Result
  result        Json?            // Parsed data

  // Timing
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status, priority])
  @@index([agencyId, status])
  @@index([createdAt])
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
*/

-- 2.7 Extend Agency model
/*
model Agency {
  // ... EXISTING FIELDS (keep all) ...

  // NEW: Compliance settings
  credentialWarningDays Int              @default(30)  // Days before expiry to warn
  autoReminderEnabled   Boolean          @default(true)
  reminderFrequency     ReminderFrequency @default(WEEKLY)

  // NEW: Relations
  credentialReminders   CredentialReminder[]
  complianceSnapshots   ComplianceSnapshot[]
  webhookSubscriptions  WebhookSubscription[]
  apiKeys               ApiKey[]
  parsingJobs           CredentialParsingJob[]
}

enum ReminderFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  CUSTOM
}
*/

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Key indexes to add (Prisma notation):
/*
@@index([employeeId, status])           // Employee's credentials by status
@@index([status, expirationDate])       // Expiring credentials queries
@@index([reviewStatus])                 // Review workflow queries
@@index([agencyId, status])             // Agency compliance queries
@@index([documentTypeId, status])       // Credential type queries
@@index([expirationDate])               // Date-based queries
@@index([isCompliant])                  // Compliance filtering
*/

-- ============================================================================
-- 4. SAMPLE QUERIES
-- ============================================================================

-- Find all expiring credentials in next 30 days for an agency
/*
SELECT
  e.firstName,
  e.lastName,
  dt.name as credentialType,
  ed.expirationDate,
  ed.status,
  ed.issuer,
  ed.licenseNumber
FROM "EmployeeDocument" ed
JOIN "Employee" e ON e.id = ed.employeeId
JOIN "DocumentType" dt ON dt.id = ed.documentTypeId
WHERE
  e.agencyId = 'agency-uuid'
  AND ed.status IN ('ACTIVE', 'EXPIRING_SOON')
  AND ed.expirationDate BETWEEN NOW() AND (NOW() + INTERVAL '30 days')
  AND e.status = 'ACTIVE'
ORDER BY ed.expirationDate ASC;
*/

-- Calculate compliance rate for an agency
/*
WITH credential_stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as valid,
    COUNT(*) FILTER (WHERE status = 'EXPIRING_SOON') as expiring,
    COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired,
    COUNT(*) FILTER (WHERE status = 'MISSING') as missing
  FROM "EmployeeDocument" ed
  JOIN "Employee" e ON e.id = ed.employeeId
  WHERE
    e.agencyId = 'agency-uuid'
    AND e.status = 'ACTIVE'
)
SELECT
  *,
  ROUND((valid::numeric / NULLIF(total, 0)) * 100, 2) as compliance_rate
FROM credential_stats;
*/

-- Find employees with expired credentials
/*
SELECT DISTINCT
  e.id,
  e.firstName,
  e.lastName,
  e.department,
  e.position,
  COUNT(*) FILTER (WHERE ed.status = 'EXPIRED') as expired_count,
  array_agg(dt.name) FILTER (WHERE ed.status = 'EXPIRED') as expired_types
FROM "Employee" e
JOIN "EmployeeDocument" ed ON ed.employeeId = e.id
JOIN "DocumentType" dt ON dt.id = ed.documentTypeId
WHERE
  e.agencyId = 'agency-uuid'
  AND e.status = 'ACTIVE'
  AND ed.status = 'EXPIRED'
GROUP BY e.id, e.firstName, e.lastName, e.department, e.position
ORDER BY expired_count DESC;
*/

-- Get reminder history for a credential
/*
SELECT
  cr.reminderType,
  cr.sentAt,
  cr.sentTo,
  cr.channel,
  cr.daysBeforeExpiry
FROM "CredentialReminder" cr
WHERE cr.documentId = 'document-uuid'
ORDER BY cr.sentAt DESC;
*/

-- ============================================================================
-- 5. MIGRATION STRATEGY
-- ============================================================================

/*
Step 1: Add nullable columns to EmployeeDocument
  - All new fields are nullable for backward compatibility
  - Existing records won't break

Step 2: Create new tables
  - CredentialReminder
  - ComplianceSnapshot
  - WebhookSubscription
  - WebhookDelivery
  - ApiKey
  - CredentialParsingJob

Step 3: Add indexes
  - Optimize query performance

Step 4: Backfill data (optional)
  - Set reviewStatus = APPROVED for existing docs
  - Calculate isCompliant based on expirationDate
  - Create initial compliance snapshot

Step 5: Deploy code
  - Feature flag controlled rollout
  - Monitor for issues
*/

-- ============================================================================
-- 6. ROLLBACK PLAN
-- ============================================================================

/*
If issues occur:
1. Disable feature via FEATURE_CREDENTIALS_ENABLED=false
2. New columns are nullable - existing data unaffected
3. Drop new tables if needed (no foreign key dependencies from existing tables)
4. Restore from backup if data corruption occurs
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
