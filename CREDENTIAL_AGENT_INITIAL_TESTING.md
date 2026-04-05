# Credential Agent - Initial Testing Guide

**Last Updated**: March 2, 2026
**Status**: Testing Phase 1-3 Implementation
**Environment**: Localhost Development

---

## Overview

This guide provides step-by-step instructions for testing the Credential Tracking Agent functionality on your local development environment. The system is approximately **70% complete** with core features implemented and ready for testing.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Test Data Creation](#test-data-creation)
5. [Testing Scenarios](#testing-scenarios)
6. [API Testing with cURL](#api-testing-with-curl)
7. [Testing the AI Parsing Pipeline](#testing-the-ai-parsing-pipeline)
8. [Testing the Reminder System](#testing-the-reminder-system)
9. [Testing the Job Queue](#testing-the-job-queue)
10. [Troubleshooting](#troubleshooting)
11. [Known Issues](#known-issues)

---

## Prerequisites

### Required Software

- ✅ **Node.js**: v18+ or v20+ (recommended)
- ✅ **PostgreSQL**: v14+ (v16 recommended)
- ✅ **npm** or **pnpm**: Latest version
- ✅ **Git**: For cloning the repository

### Required Accounts/API Keys

For full functionality testing, you'll need:

1. **OpenAI API Key** (required for AI parsing)
   - Sign up at: https://platform.openai.com/
   - Minimum $5 credit recommended
   - Cost per test: ~$0.02 per document

2. **AWS Account** (required for S3 file storage)
   - S3 bucket for document storage
   - IAM credentials with S3 permissions

3. **AWS SES** (optional for email testing)
   - Verified sender email address
   - SMTP credentials
   - Note: Can skip email tests initially

4. **Upstash Redis** (optional for rate limiting)
   - Free tier available
   - Note: Rate limiting will be disabled without this

### Optional but Recommended

- **Postman** or **Insomnia**: For API testing
- **Prisma Studio**: For database inspection (`npx prisma studio`)
- **VSCode**: With Prisma extension

---

## Environment Setup

### Step 1: Clone the Repository

```bash
cd /Users/sandraabago/keka/marketplace
# If not already cloned, clone the repository
```

### Step 2: Install Dependencies

```bash
npm install
# or
pnpm install
```

### Step 3: Create Environment File

```bash
cp .env.example .env
```

### Step 4: Configure Environment Variables

Edit `.env` and set the following **MINIMUM REQUIRED** variables:

```bash
# =============================================================================
# MINIMUM CONFIGURATION FOR CREDENTIAL TESTING
# =============================================================================

# Database (REQUIRED)
DATABASE_URL="postgresql://sandraabago@localhost:5432/marketplace_dev?schema=public"

# Authentication (REQUIRED)
NEXTAUTH_SECRET="your-random-32-char-secret-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Encryption (REQUIRED for credential data)
ENCRYPTION_KEY="generate-64-hex-chars-with-node-crypto-randomBytes-32-toHex"

# OpenAI (REQUIRED for AI parsing)
OPENAI_API_KEY="sk-your-actual-openai-api-key"
OPENAI_MODEL="gpt-4-turbo"

# AWS S3 (REQUIRED for file storage)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket-name"

# AWS SES (OPTIONAL - for email testing)
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT="587"
SMTP_USER="your-ses-smtp-username"
SMTP_PASSWORD="your-ses-smtp-password"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
SMTP_FROM_NAME="Keka Testing"

# Cron Secret (OPTIONAL - for manual cron testing)
CRON_SECRET="generate-random-secret-for-cron-auth"

# Feature Flags
FEATURE_CREDENTIALS_ENABLED="true"
FEATURE_AUTO_PARSING_ENABLED="true"
NODE_ENV="development"
```

### Step 5: Generate Secrets

Use these commands to generate secure secrets:

```bash
# Generate NEXTAUTH_SECRET (base64, 32 bytes)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (hex, 64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE marketplace_dev;

# Exit psql
\q
```

### Step 2: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run all migrations (includes credential tracking schema)
npx prisma migrate deploy

# OR if in development, use:
npx prisma migrate dev
```

**Expected Output**:
```
✔ Generated Prisma Client
...
Applying migration: 20251202115557_add_document_tracking
Applying migration: 20251204025029_add_notification_preferences
Applying migration: 20251211_fix_credential_parsing_job_fields
✔ All migrations applied successfully
```

### Step 3: Verify Schema

```bash
# Open Prisma Studio to inspect database
npx prisma studio
```

Navigate to `http://localhost:5555` and verify these tables exist:
- ✅ `Agency`
- ✅ `User`
- ✅ `Employee`
- ✅ `DocumentType`
- ✅ `EmployeeDocument`
- ✅ `CredentialReminder`
- ✅ `CredentialParsingJob`
- ✅ `NotificationPreferences`
- ✅ `ComplianceSnapshot`

---

## Test Data Creation

### Option A: Using Prisma Studio (Easiest)

1. **Open Prisma Studio**:
   ```bash
   npx prisma studio
   ```

2. **Create Agency**:
   - Click `Agency` table → `Add record`
   - Fill in:
     - `name`: "Test Home Care Agency"
     - `status`: "APPROVED"
     - `credentialWarningDays`: 30
     - `autoReminderEnabled`: true
     - `reminderFrequency`: "STANDARD"
   - Save

3. **Create Platform Admin User**:
   - Click `User` table → `Add record`
   - Fill in:
     - `email`: "admin@test.com"
     - `name`: "Admin User"
     - `role`: "PLATFORM_ADMIN"
     - `password`: Leave blank (we'll set via API)
     - `agencyId`: Select the agency created above
   - Save

4. **Create Agency Admin User**:
   - Click `User` table → `Add record`
   - Fill in:
     - `email`: "agency@test.com"
     - `name`: "Agency Admin"
     - `role`: "AGENCY_ADMIN"
     - `agencyId`: Select the agency created above
   - Save

5. **Create Employee**:
   - Click `Employee` table → `Add record`
   - Fill in:
     - `firstName`: "John"
     - `lastName`: "Doe"
     - `email`: "john.doe@test.com"
     - `position`: "Home Health Aide"
     - `status`: "ACTIVE"
     - `agencyId`: Select the agency created above
   - Save

6. **Create Document Types** (credential templates):
   - Click `DocumentType` table → `Add record`
   - Create these types:

     **CPR Certification**:
     - `name`: "CPR Certification"
     - `description`: "Basic Life Support Certification"
     - `expirationDays`: 730 (2 years)
     - `reminderDays`: [30, 7]
     - `isRequired`: true
     - `isGlobal`: true
     - `isActive`: true

     **RN License**:
     - `name`: "RN License"
     - `description`: "Registered Nurse License"
     - `expirationDays`: 730
     - `reminderDays`: [30, 7]
     - `isRequired`: true
     - `isGlobal`: true

     **CNA Certification**:
     - `name`: "CNA Certification"
     - `description`: "Certified Nursing Assistant"
     - `expirationDays`: 730
     - `reminderDays`: [30, 14, 7]
     - `isRequired`: true
     - `isGlobal`: true

---

### Option B: Using SQL Script

Save this as `/tmp/test_data.sql`:

```sql
-- Create Test Agency
INSERT INTO "Agency" (id, name, status, "credentialWarningDays", "autoReminderEnabled", "reminderFrequency")
VALUES (
  'agency-test-001',
  'Test Home Care Agency',
  'APPROVED',
  30,
  true,
  'STANDARD'
);

-- Create Platform Admin User
INSERT INTO "User" (id, email, name, role, "agencyId")
VALUES (
  'user-admin-001',
  'admin@test.com',
  'Platform Admin',
  'PLATFORM_ADMIN',
  'agency-test-001'
);

-- Create Agency Admin User
INSERT INTO "User" (id, email, name, role, "agencyId")
VALUES (
  'user-agency-001',
  'agency@test.com',
  'Agency Admin',
  'AGENCY_ADMIN',
  'agency-test-001'
);

-- Create Test Employee
INSERT INTO "Employee" (id, "firstName", "lastName", email, position, status, "agencyId")
VALUES (
  'employee-001',
  'John',
  'Doe',
  'john.doe@test.com',
  'Home Health Aide',
  'ACTIVE',
  'agency-test-001'
);

-- Create Document Types
INSERT INTO "DocumentType" (id, name, description, "expirationDays", "reminderDays", "isRequired", "isGlobal", "isActive")
VALUES
  ('doctype-cpr', 'CPR Certification', 'Basic Life Support Certification', 730, ARRAY[30, 7], true, true, true),
  ('doctype-rn', 'RN License', 'Registered Nurse License', 730, ARRAY[30, 7], true, true, true),
  ('doctype-cna', 'CNA Certification', 'Certified Nursing Assistant', 730, ARRAY[30, 14, 7], true, true, true),
  ('doctype-hha', 'HHA Certification', 'Home Health Aide Certification', 730, ARRAY[30, 7], true, true, true);

-- Create Notification Preferences for Employee
INSERT INTO "NotificationPreferences" (id, "employeeId", "reminderFrequency", "emailEnabled", "smsEnabled")
VALUES (
  gen_random_uuid(),
  'employee-001',
  'STANDARD',
  true,
  false
);
```

Run the SQL:
```bash
psql $DATABASE_URL -f /tmp/test_data.sql
```

---

## Testing Scenarios

### Scenario 1: Employee Credential Upload

**Goal**: Test the full upload → parsing → review workflow

#### Step 1: Start Development Server

```bash
npm run dev
# Server should start on http://localhost:3000
```

#### Step 2: Authenticate as Employee

Since we're testing locally, you have two options:

**Option A: Use API directly** (skip auth for testing)

Create this test file: `/tmp/test_upload.sh`

```bash
#!/bin/bash

# Configuration
API_BASE="http://localhost:3000/api"
EMPLOYEE_ID="employee-001"
DOCUMENT_TYPE_ID="doctype-cpr"
TEST_PDF="/path/to/test/credential.pdf"

# Upload credential
curl -X POST "$API_BASE/employee/credentials/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$TEST_PDF" \
  -F "documentTypeId=$DOCUMENT_TYPE_ID" \
  -F "employeeId=$EMPLOYEE_ID" \
  -F "issueDate=2024-01-15" \
  -F "expirationDate=2026-01-15" \
  -F "notes=Test upload for CPR certification"
```

**Option B: Use Next.js UI** (requires setting up auth)

1. Navigate to `http://localhost:3000/auth/signin`
2. Sign in (or implement sign-in flow first)
3. Navigate to credentials page
4. Upload document via UI

#### Step 3: Verify Upload in Database

```bash
# Open Prisma Studio
npx prisma studio
```

Check:
- ✅ `EmployeeDocument` has new record
- ✅ `CredentialParsingJob` has new pending job
- ✅ File uploaded to S3 (check S3 console or via AWS CLI)

**Expected EmployeeDocument fields**:
- `status`: "PENDING_REVIEW"
- `reviewStatus`: "PENDING_REVIEW"
- `s3Key`: "credentials/{agencyId}/{employeeId}/{timestamp}-{filename}"
- `aiParsedData`: null (not yet parsed)
- `aiConfidence`: null
- `isCompliant`: false

**Expected CredentialParsingJob fields**:
- `status`: "PENDING"
- `attemptCount`: 0
- `priority`: 0

---

### Scenario 2: AI Parsing Pipeline

**Goal**: Test OCR + GPT-4 metadata extraction

#### Option A: Trigger via Cron Endpoint (Manual)

```bash
# Set CRON_SECRET in .env first
CRON_SECRET="your-cron-secret"

# Trigger parsing job processor
curl -X GET "http://localhost:3000/api/cron/process-parsing" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response**:
```json
{
  "success": true,
  "processed": 1,
  "successful": 1,
  "failed": 0,
  "jobs": [
    {
      "jobId": "job-uuid",
      "documentId": "doc-uuid",
      "status": "COMPLETED",
      "confidence": 0.89
    }
  ]
}
```

#### Option B: Test Parsing Directly (Bypass Queue)

Create test script: `/tmp/test_parsing.ts`

```typescript
import { parseCredentialFromBuffer } from '@/lib/credentialParser';
import fs from 'fs';

async function testParsing() {
  // Load test document
  const buffer = fs.readFileSync('/path/to/test/cpr-cert.pdf');

  // Parse
  const result = await parseCredentialFromBuffer(
    buffer,
    'application/pdf',
    'cpr-cert.pdf',
    { expectedType: 'CPR Certification' }
  );

  console.log('Parsing Result:', JSON.stringify(result, null, 2));
}

testParsing();
```

Run:
```bash
npx tsx /tmp/test_parsing.ts
```

**Expected Output**:
```json
{
  "success": true,
  "data": {
    "credentialType": "CPR Certification",
    "issuer": "American Red Cross",
    "licenseNumber": "CPR-2024-12345",
    "issuedAt": "2024-01-15",
    "expiresAt": "2026-01-15",
    "verificationUrl": null,
    "confidence": 0.89
  },
  "rawText": "BASIC LIFE SUPPORT CERTIFICATION...",
  "ocrMethod": "PDFParser",
  "parsingNotes": [
    "High confidence extraction",
    "All required fields found"
  ]
}
```

#### Step 3: Verify Database Updates

After parsing completes, check:

```sql
-- Check EmployeeDocument was updated
SELECT
  id,
  "fileName",
  status,
  "reviewStatus",
  "aiConfidence",
  "aiParsedData",
  issuer,
  "licenseNumber",
  "isCompliant"
FROM "EmployeeDocument"
WHERE id = 'your-document-id';
```

**Expected Results**:
- ✅ `aiConfidence`: 0.7 - 1.0 (if high confidence)
- ✅ `aiParsedData`: JSON with extracted fields
- ✅ `issuer`: Extracted issuer name
- ✅ `licenseNumber`: Extracted license number
- ✅ `reviewStatus`: "APPROVED" (if confidence ≥ 0.7) or "PENDING_REVIEW" (if < 0.7)
- ✅ `status`: "ACTIVE" (if approved and not expired)
- ✅ `isCompliant`: true (if approved and not expired)

---

### Scenario 3: Admin Review Workflow

**Goal**: Test admin reviewing pending credentials

#### Step 1: Get Pending Credentials

```bash
# As agency admin or platform admin
curl -X GET "http://localhost:3000/api/admin/credentials/pending?page=1&limit=10" \
  -H "Cookie: next-auth.session-token=your-session-token"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "credentials": [
      {
        "id": "doc-uuid",
        "fileName": "cpr-cert.pdf",
        "employee": {
          "firstName": "John",
          "lastName": "Doe"
        },
        "documentType": {
          "name": "CPR Certification"
        },
        "aiConfidence": 0.65,
        "aiParsedData": {
          "credentialType": "CPR Certification",
          "issuer": "Red Cross",
          "licenseNumber": "CPR-12345",
          "expiresAt": "2026-01-15"
        },
        "createdAt": "2024-03-02T10:30:00Z",
        "status": "PENDING_REVIEW"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### Step 2: Review and Approve Credential

```bash
# Approve credential
curl -X PATCH "http://localhost:3000/api/admin/credentials/{credential-id}/review" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-session-token" \
  -d '{
    "reviewStatus": "APPROVED",
    "reviewNotes": "Verified CPR certification - looks valid",
    "correctedData": {
      "issuer": "American Red Cross",
      "licenseNumber": "CPR-2024-12345"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "credential": {
    "id": "doc-uuid",
    "reviewStatus": "APPROVED",
    "reviewedBy": "user-admin-001",
    "reviewedAt": "2024-03-02T11:00:00Z",
    "reviewNotes": "Verified CPR certification - looks valid",
    "issuer": "American Red Cross",
    "licenseNumber": "CPR-2024-12345",
    "isCompliant": true
  }
}
```

#### Step 3: Reject Credential

```bash
# Reject credential (for testing rejection flow)
curl -X PATCH "http://localhost:3000/api/admin/credentials/{credential-id}/review" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=your-session-token" \
  -d '{
    "reviewStatus": "REJECTED",
    "reviewNotes": "Document is unclear - please re-scan and upload"
  }'
```

---

### Scenario 4: Employee Dashboard

**Goal**: Test employee viewing their credential status

```bash
# Get employee dashboard
curl -X GET "http://localhost:3000/api/employee/credentials/dashboard" \
  -H "Cookie: next-auth.session-token=employee-session-token"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 3,
      "compliant": 2,
      "pending": 1,
      "expiring": 0,
      "expired": 0,
      "compliancePercentage": 66.67
    },
    "credentialsNeedingAction": [
      {
        "id": "doc-uuid",
        "fileName": "cpr-cert.pdf",
        "documentType": {
          "name": "CPR Certification"
        },
        "status": "PENDING_REVIEW",
        "expirationDate": "2026-01-15",
        "daysUntilExpiration": 680,
        "reviewStatus": "PENDING_REVIEW",
        "isCompliant": false
      }
    ],
    "recentReminders": [],
    "upcomingExpirations": {
      "next30Days": 0,
      "next7Days": 0
    }
  }
}
```

---

### Scenario 5: Reminder System

**Goal**: Test automated reminder emails

#### Step 1: Create Expiring Credential

```sql
-- Create credential expiring in 7 days
INSERT INTO "EmployeeDocument" (
  id,
  "employeeId",
  "documentTypeId",
  "agencyId",
  "s3Key",
  "fileName",
  "fileSize",
  "mimeType",
  "expirationDate",
  status,
  "reviewStatus",
  "isCompliant",
  "uploadedBy"
)
VALUES (
  gen_random_uuid(),
  'employee-001',
  'doctype-cpr',
  'agency-test-001',
  'test/file.pdf',
  'expiring-cert.pdf',
  1024,
  'application/pdf',
  NOW() + INTERVAL '7 days',
  'EXPIRING_SOON',
  'APPROVED',
  true,
  'user-admin-001'
);
```

#### Step 2: Trigger Reminder Cron

```bash
# Manually trigger reminder processor
curl -X GET "http://localhost:3000/api/cron/process-reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response**:
```json
{
  "success": true,
  "checked": 1,
  "remindersSent": 1,
  "expiredNotificationsSent": 0,
  "errors": 0
}
```

#### Step 3: Verify Reminder Sent

```sql
-- Check CredentialReminder table
SELECT
  id,
  "documentId",
  "reminderType",
  "sentAt",
  "sentTo",
  "daysBeforeExpiry"
FROM "CredentialReminder"
ORDER BY "sentAt" DESC
LIMIT 5;
```

**Expected Result**:
- ✅ New reminder record created
- ✅ `reminderType`: "EXPIRING_SOON"
- ✅ `daysBeforeExpiry`: 7
- ✅ `sentTo`: ["john.doe@test.com"]
- ✅ Email sent (check logs or email inbox if SES configured)

#### Step 4: Check Email (If SES Configured)

If you configured AWS SES, check the employee's email inbox for:

**Subject**: "Credential Expiring Soon: CPR Certification"

**Body Preview**:
```
Hi John,

Your CPR Certification is expiring in 7 days (March 9, 2024).

To maintain compliance, please renew and upload your updated credential before the expiration date.

[Upload Credential Button]
```

---

### Scenario 6: Compliance Checking

**Goal**: Test compliance calculation and status updates

#### Test Compliance Helper Functions

Create test file: `/tmp/test_compliance.ts`

```typescript
import {
  isCredentialCompliant,
  getAgencyComplianceSummary,
  getEmployeeComplianceStatus
} from '@/lib/credentialHelpers';

async function testCompliance() {
  // Test 1: Check single credential compliance
  const credential = {
    status: 'ACTIVE',
    reviewStatus: 'APPROVED',
    expirationDate: new Date('2026-01-15')
  };

  const isCompliant = isCredentialCompliant(credential);
  console.log('Credential is compliant:', isCompliant);
  // Expected: true

  // Test 2: Get agency compliance summary
  const summary = await getAgencyComplianceSummary('agency-test-001');
  console.log('Agency Compliance:', JSON.stringify(summary, null, 2));
  // Expected: { total: 3, compliant: 2, pending: 1, ... }

  // Test 3: Get employee compliance status
  const employeeStatus = await getEmployeeComplianceStatus('employee-001');
  console.log('Employee Status:', JSON.stringify(employeeStatus, null, 2));
  // Expected: { total: 3, compliant: 2, isCompliant: false, missingRequired: [...] }
}

testCompliance();
```

Run:
```bash
npx tsx /tmp/test_compliance.ts
```

---

## API Testing with cURL

### Complete cURL Test Suite

Save as `/tmp/test_credential_apis.sh`:

```bash
#!/bin/bash

# Configuration
API_BASE="http://localhost:3000/api"
CRON_SECRET="your-cron-secret"
SESSION_TOKEN="your-session-token"  # Get from browser dev tools

echo "=== Testing Credential Agent APIs ==="

# Test 1: Upload Credential
echo -e "\n1. Testing credential upload..."
curl -X POST "$API_BASE/employee/credentials/upload" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -F "file=@/path/to/test-cpr-cert.pdf" \
  -F "documentTypeId=doctype-cpr" \
  -F "employeeId=employee-001" \
  -F "expirationDate=2026-01-15"

# Test 2: Get Employee Dashboard
echo -e "\n2. Testing employee dashboard..."
curl -X GET "$API_BASE/employee/credentials/dashboard" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN"

# Test 3: Get Pending Credentials (Admin)
echo -e "\n3. Testing admin pending queue..."
curl -X GET "$API_BASE/admin/credentials/pending?page=1&limit=10" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN"

# Test 4: Trigger Parsing Job
echo -e "\n4. Testing parsing job processor..."
curl -X GET "$API_BASE/cron/process-parsing" \
  -H "Authorization: Bearer $CRON_SECRET"

# Test 5: Trigger Reminders
echo -e "\n5. Testing reminder processor..."
curl -X GET "$API_BASE/cron/process-reminders" \
  -H "Authorization: Bearer $CRON_SECRET"

echo -e "\n=== Tests Complete ==="
```

Make executable and run:
```bash
chmod +x /tmp/test_credential_apis.sh
/tmp/test_credential_apis.sh
```

---

## Testing the AI Parsing Pipeline

### Test Documents

Create a folder with sample credential documents:

```bash
mkdir -p /tmp/test-credentials/
```

#### Sample 1: Text-Based PDF (Easy)

Create a simple CPR certificate PDF with clear text containing:
- Credential Type: "CPR Certification"
- Issuer: "American Red Cross"
- License Number: "CPR-2024-12345"
- Issue Date: "01/15/2024"
- Expiration Date: "01/15/2026"

#### Sample 2: Scanned Image (Medium)

Scan or take a photo of a real credential (with sensitive data redacted)

#### Sample 3: Complex Layout (Hard)

Multi-column document, table format, watermarks

### Test Parsing Accuracy

```bash
# Test all samples
for file in /tmp/test-credentials/*.pdf; do
  echo "Testing: $file"

  # Upload and trigger parsing
  curl -X POST "$API_BASE/employee/credentials/upload" \
    -F "file=@$file" \
    -F "documentTypeId=doctype-cpr" \
    -F "employeeId=employee-001"

  # Wait for parsing
  sleep 5

  # Trigger cron
  curl -X GET "$API_BASE/cron/process-parsing" \
    -H "Authorization: Bearer $CRON_SECRET"

  echo "---"
done
```

### Evaluate Results

```sql
-- Check parsing accuracy
SELECT
  "fileName",
  "aiConfidence",
  "aiParsedBy",
  "reviewStatus",
  "aiParsedData"->>'credentialType' as extracted_type,
  "aiParsedData"->>'issuer' as extracted_issuer,
  "aiParsedData"->>'licenseNumber' as extracted_license,
  "aiParsedData"->>'confidence' as extraction_confidence
FROM "EmployeeDocument"
WHERE "aiParsedData" IS NOT NULL
ORDER BY "createdAt" DESC;
```

**Success Criteria**:
- ✅ Confidence ≥ 0.7 for clear documents
- ✅ Correct credential type extracted
- ✅ Issuer name extracted (even if abbreviated)
- ✅ License number extracted (if present)
- ✅ Dates parsed correctly

---

## Testing the Reminder System

### Test Reminder Frequency Settings

```sql
-- Test MINIMAL frequency (only 7 days)
UPDATE "NotificationPreferences"
SET "reminderFrequency" = 'MINIMAL'
WHERE "employeeId" = 'employee-001';

-- Test STANDARD frequency (30 and 7 days)
UPDATE "NotificationPreferences"
SET "reminderFrequency" = 'STANDARD'
WHERE "employeeId" = 'employee-001';

-- Test FREQUENT frequency (30, 14, 7, 3 days)
UPDATE "NotificationPreferences"
SET "reminderFrequency" = 'FREQUENT'
WHERE "employeeId" = 'employee-001';
```

### Test Quiet Hours

```sql
-- Set quiet hours (no reminders between 10 PM - 8 AM)
UPDATE "NotificationPreferences"
SET
  "quietHoursEnabled" = true,
  "quietHoursStart" = '22:00',
  "quietHoursEnd" = '08:00'
WHERE "employeeId" = 'employee-001';
```

Trigger reminder during quiet hours:
```bash
# Current time is 11 PM
curl -X GET "$API_BASE/cron/process-reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected**: Reminder delayed until 8 AM next day

### Test Duplicate Prevention

```bash
# Send reminder
curl -X GET "$API_BASE/cron/process-reminders" \
  -H "Authorization: Bearer $CRON_SECRET"

# Immediately try again (should skip)
curl -X GET "$API_BASE/cron/process-reminders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected**: Second call returns 0 reminders sent (minimum 7-day gap enforced)

---

## Testing the Job Queue

### Test Job Lifecycle

```sql
-- 1. Create pending job
INSERT INTO "CredentialParsingJob" (
  id,
  "documentId",
  "agencyId",
  status,
  priority
)
VALUES (
  gen_random_uuid(),
  'some-document-id',
  'agency-test-001',
  'PENDING',
  0
);

-- 2. Check queue stats
SELECT status, COUNT(*)
FROM "CredentialParsingJob"
GROUP BY status;
```

### Test Retry Logic

```sql
-- Create failing job (document doesn't exist)
INSERT INTO "CredentialParsingJob" (
  id,
  "documentId",
  "agencyId",
  status,
  priority
)
VALUES (
  gen_random_uuid(),
  'non-existent-doc',
  'agency-test-001',
  'PENDING',
  0
);
```

Trigger processing 3 times:
```bash
# Attempt 1 (fails, retry scheduled)
curl -X GET "$API_BASE/cron/process-parsing" \
  -H "Authorization: Bearer $CRON_SECRET"

# Wait 60 seconds, attempt 2
sleep 60
curl -X GET "$API_BASE/cron/process-parsing" \
  -H "Authorization: Bearer $CRON_SECRET"

# Wait 5 minutes, attempt 3 (final)
sleep 300
curl -X GET "$API_BASE/cron/process-parsing" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected**: After 3 failed attempts, job status = "FAILED"

### Test Stale Job Cleanup

```sql
-- Create stale job (stuck in PROCESSING for 40 minutes)
INSERT INTO "CredentialParsingJob" (
  id,
  "documentId",
  "agencyId",
  status,
  "processingStartedAt"
)
VALUES (
  gen_random_uuid(),
  'some-doc',
  'agency-test-001',
  'PROCESSING',
  NOW() - INTERVAL '40 minutes'
);
```

Trigger processing:
```bash
curl -X GET "$API_BASE/cron/process-parsing" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected**: Stale job marked as FAILED

---

## Troubleshooting

### Issue 1: "OpenAI API key not found"

**Symptom**: Parsing jobs fail with error about missing API key

**Solution**:
```bash
# Verify .env file
cat .env | grep OPENAI_API_KEY

# If missing, add:
echo 'OPENAI_API_KEY="sk-your-actual-key"' >> .env

# Restart dev server
npm run dev
```

---

### Issue 2: S3 Upload Fails

**Symptom**: Upload endpoint returns 500 error, "Could not upload to S3"

**Solution**:
```bash
# Check S3 credentials
aws s3 ls s3://your-bucket-name --profile default

# If fails, reconfigure AWS CLI
aws configure

# Or set in .env
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket"
```

---

### Issue 3: Database Connection Error

**Symptom**: "Can't reach database server"

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# If not running, start it
brew services start postgresql@16  # macOS
# OR
sudo systemctl start postgresql     # Linux

# Verify connection string
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1;"
```

---

### Issue 4: Parsing Returns Low Confidence

**Symptom**: AI confidence scores consistently <0.5

**Possible Causes**:
1. Document quality is poor (blurry scan)
2. OCR failing (wrong MIME type)
3. Credential format not recognized by GPT-4

**Solution**:
```bash
# Test OCR directly
npx tsx -e "
import { extractTextFromFile } from './src/lib/ocr';
extractTextFromFile('s3-key', 'application/pdf').then(console.log);
"

# If OCR text is garbled, try:
# 1. Re-scan document at higher DPI (300+)
# 2. Use AWS Textract instead of Tesseract
# 3. Convert image to grayscale before upload
```

---

### Issue 5: Reminders Not Sending

**Symptom**: Cron runs but no emails sent

**Debug Checklist**:
```bash
# 1. Check SES credentials
aws ses verify-email-identity --email-address your-sender@domain.com

# 2. Check notification preferences
psql $DATABASE_URL -c "
SELECT * FROM \"NotificationPreferences\"
WHERE \"employeeId\" = 'employee-001';
"

# 3. Check credential expiration dates
psql $DATABASE_URL -c "
SELECT \"fileName\", \"expirationDate\", status
FROM \"EmployeeDocument\"
WHERE \"expirationDate\" BETWEEN NOW() AND NOW() + INTERVAL '30 days';
"

# 4. Check reminder history (duplicate prevention)
psql $DATABASE_URL -c "
SELECT * FROM \"CredentialReminder\"
ORDER BY \"sentAt\" DESC LIMIT 5;
"
```

---

### Issue 6: Cron Jobs Not Running

**Symptom**: Manual curl works but automatic cron doesn't trigger

**Note**: Vercel Cron only works in production deployment, not localhost.

**Local Alternative**:
```bash
# Use crontab for local testing
crontab -e

# Add entry (runs every minute):
* * * * * curl -X GET "http://localhost:3000/api/cron/process-parsing" -H "Authorization: Bearer $CRON_SECRET"
```

---

## Known Issues

### 1. AWS Textract Not Implemented
- **Status**: Placeholder exists, not functional
- **Impact**: Falls back to Tesseract for all images
- **Workaround**: Use clear, high-quality scans
- **Fix**: Implement `/src/lib/ocr.ts` AWSTextractProvider class

### 2. Webhook System Missing
- **Status**: Models exist in schema but no implementation
- **Impact**: Cannot send real-time events to external systems
- **Workaround**: Use polling APIs for now
- **Fix**: Implement Phase 5 webhook dispatcher

### 3. Export Features Not Built
- **Status**: No CSV/JSON/Excel export endpoints
- **Impact**: Cannot bulk export credential data
- **Workaround**: Use Prisma Studio or SQL queries
- **Fix**: Implement Phase 5 export endpoints

### 4. Agent Tools Not Implemented
- **Status**: Phase 4 not started
- **Impact**: Chatbot cannot answer credential queries
- **Workaround**: Use dashboard and APIs directly
- **Fix**: Implement Phase 4 agent tools

### 5. Compliance Dashboard UI Missing
- **Status**: Backend API exists, frontend not built
- **Impact**: Must use API directly or Prisma Studio
- **Workaround**: Use cURL or Postman
- **Fix**: Build React admin dashboard in Phase 3

---

## Next Steps After Testing

Once you've successfully tested the core features:

1. **Report Bugs**: Document any issues found during testing
2. **Evaluate Accuracy**: Collect parsing accuracy metrics (precision/recall)
3. **Performance Testing**: Upload 50+ documents simultaneously
4. **Security Review**: Test authentication, authorization, file upload validation
5. **Plan Phase 4**: Design agent tools based on testing insights
6. **Optimize Prompts**: Improve GPT-4 prompts based on low-confidence cases
7. **Add Textract**: Implement AWS Textract for problematic documents

---

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] Environment setup complete
- [ ] Database migrations run successfully
- [ ] Test data created (agency, users, employees, document types)
- [ ] Credential upload works (file → S3 → database)
- [ ] Parsing job enqueued correctly
- [ ] AI parsing extracts metadata (OCR + GPT-4)
- [ ] High-confidence documents auto-approved
- [ ] Low-confidence documents flagged for review
- [ ] Admin review workflow functional (approve/reject)
- [ ] Employee dashboard returns correct data
- [ ] Reminder system sends emails at correct thresholds
- [ ] Notification preferences respected
- [ ] Quiet hours work correctly
- [ ] Duplicate reminders prevented
- [ ] Job queue processes reliably
- [ ] Retry logic works for failed jobs
- [ ] Stale jobs cleaned up
- [ ] Compliance calculations accurate
- [ ] Status updates work correctly
- [ ] S3 file storage and retrieval working
- [ ] Email delivery functional (if SES configured)

---

## Support & Resources

**Documentation**:
- Main Architecture: `CREDENTIAL_AGENT_ARCHITECTURE.md`
- Implementation Plan: `CREDENTIAL_AGENT_IMPLEMENTATION_PLAN.md`
- Technical Overview: `CREDENTIAL_AGENT_OVERVIEW.md`

**Database Inspection**:
```bash
npx prisma studio  # Visual database browser
```

**Logs**:
```bash
# Development server logs
npm run dev

# API request logs (add to API routes)
console.log('[API] Request:', req.method, req.url);
```

**Test Files Location**:
- Service layer tests: `/src/lib/__tests__/`
- API integration tests: (not yet implemented)

---

**Document Version**: 1.0
**Last Updated**: March 2, 2026
**Tested By**: [Your Name]
**Test Environment**: macOS / PostgreSQL 16 / Node.js 20
