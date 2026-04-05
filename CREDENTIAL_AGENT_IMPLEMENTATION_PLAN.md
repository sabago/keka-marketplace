# Credential Agent: Phased Implementation Plan

## Overview

This document provides a step-by-step implementation checklist for the AI-powered credential tracking feature. Follow phases sequentially, completing all tasks in each phase before moving to the next.

---

## Phase 1: Foundation (Week 1)

**Goal:** Extend data model and implement basic CRUD operations

### 1.1 Database Schema
- [ ] Review existing `EmployeeDocument` and `DocumentType` models
- [ ] Add new fields to `EmployeeDocument` in `prisma/schema.prisma`:
  - [ ] `issuer`, `licenseNumber`, `verificationUrl`
  - [ ] `aiParsedData`, `aiConfidence`, `aiParsedAt`, `aiParsedBy`
  - [ ] `reviewStatus`, `reviewedBy`, `reviewedAt`, `reviewNotes`
  - [ ] `isCompliant`, `complianceCheckedAt`
- [ ] Create new models:
  - [ ] `CredentialReminder`
  - [ ] `ComplianceSnapshot`
  - [ ] `CredentialParsingJob`
- [ ] Add enums: `ReviewStatus`, `ReminderType`, `NotificationChannel`, `JobStatus`
- [ ] Extend `Agency` model with compliance settings
- [ ] Add indexes for performance
- [ ] Generate migration: `npx prisma migrate dev --name add_credential_fields`
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Verify schema: `npx prisma studio` and inspect tables

### 1.2 Service Layer
- [ ] Create `/src/lib/credentialHelpers.ts`:
  - [ ] `calculateCredentialStatus(expirationDate, warningDays)` - Determine ACTIVE/EXPIRING_SOON/EXPIRED
  - [ ] `isCredentialCompliant(credential)` - Check compliance status
  - [ ] `getCredentialsByStatus(agencyId, status)` - Filter by status
  - [ ] `getEmployeeComplianceStatus(employeeId)` - Employee's overall compliance
  - [ ] `shouldSendReminder(credential, reminderDays)` - Check if reminder needed
- [ ] Create `/src/lib/credentialValidation.ts`:
  - [ ] `UploadCredentialSchema` - Zod schema for upload
  - [ ] `UpdateCredentialSchema` - Zod schema for updates
  - [ ] `ReviewCredentialSchema` - Zod schema for review
  - [ ] `SearchCredentialsSchema` - Zod schema for search filters
- [ ] Extend `/src/lib/documentHelpers.ts`:
  - [ ] Add credential-specific helper functions
  - [ ] Reuse existing file storage patterns

### 1.3 Employee APIs
- [ ] Create `/src/app/api/employee/credentials/route.ts`:
  - [ ] `GET` - List current user's credentials
    - [ ] Authenticate with `requireAuth()`
    - [ ] Filter by employeeId linked to user
    - [ ] Return credentials with status, expiry dates
    - [ ] Include summary counts
  - [ ] `POST` - Upload new credential
    - [ ] Validate file (type, size)
    - [ ] Upload to S3 using existing pattern
    - [ ] Create `EmployeeDocument` record
    - [ ] Set `reviewStatus = PENDING_REVIEW`
    - [ ] Return credential ID and status
- [ ] Create `/src/app/api/employee/credentials/[id]/route.ts`:
  - [ ] `GET` - Get single credential details
    - [ ] Verify ownership (user can only view their own)
    - [ ] Generate presigned download URL
    - [ ] Return credential with metadata
  - [ ] `PATCH` - Update credential metadata
    - [ ] Allow notes, issueDate, expirationDate updates
    - [ ] Recalculate status
    - [ ] Log audit event

### 1.4 Testing
- [ ] Write unit tests for `credentialHelpers.ts`
- [ ] Write unit tests for validation schemas
- [ ] Write integration tests for employee APIs:
  - [ ] Upload credential flow
  - [ ] List credentials
  - [ ] Get credential details
  - [ ] Update credential
- [ ] Create seed data for testing:
  - [ ] Sample agencies
  - [ ] Sample employees
  - [ ] Sample credential types
  - [ ] Sample credentials in various states
- [ ] Run tests: `npm test`

### 1.5 Documentation
- [ ] Document new API endpoints
- [ ] Add JSDoc comments to service functions
- [ ] Create example requests/responses

**Phase 1 Acceptance Criteria:**
- ✅ Schema migration applied successfully
- ✅ Employees can upload credentials
- ✅ Employees can view their credentials
- ✅ Status calculation works correctly
- ✅ All tests passing

---

## Phase 2: AI Parsing Pipeline (Week 2)

**Goal:** Implement intelligent document extraction

### 2.1 OCR Integration
- [ ] Create `/src/lib/ocr.ts`:
  - [ ] Define `OCRProvider` interface
  - [ ] Implement `AWSTextractProvider`:
    - [ ] Configure AWS Textract client
    - [ ] Implement `extractText(s3Key)` method
    - [ ] Handle form data extraction
    - [ ] Parse dates and key-value pairs
  - [ ] Implement `TesseractProvider` (fallback):
    - [ ] Install `tesseract.js` package
    - [ ] Implement basic text extraction
    - [ ] Handle image preprocessing
  - [ ] Create factory function `getOCRProvider(type)`
  - [ ] Add error handling and retries
- [ ] Install dependencies:
  - [ ] `npm install @aws-sdk/client-textract`
  - [ ] `npm install tesseract.js`
  - [ ] `npm install pdf-parse`
- [ ] Add environment variables:
  - [ ] `OCR_PROVIDER=aws`
  - [ ] `AWS_TEXTRACT_REGION=us-east-1`

### 2.2 LLM Extraction
- [ ] Create `/src/lib/credentialParser.ts`:
  - [ ] `extractTextFromDocument(s3Key, mimeType)`:
    - [ ] Route to OCR for images
    - [ ] Use pdf-parse for PDFs
    - [ ] Return raw text
  - [ ] `extractCredentialMetadata(text, expectedType?)`:
    - [ ] Build system prompt for credential extraction
    - [ ] Call OpenAI GPT-4 with structured output
    - [ ] Parse JSON response
    - [ ] Calculate confidence score
    - [ ] Validate extracted dates
  - [ ] `parseCredentialDocument(s3Key, mimeType, options?)`:
    - [ ] Orchestrate: extract text → parse with LLM
    - [ ] Return `ParsedCredential` object
  - [ ] `shouldRequireReview(parsed, threshold)`:
    - [ ] Check confidence against threshold (default 0.7)
    - [ ] Flag missing required fields
- [ ] Create system prompts:
  - [ ] Credential extraction prompt
  - [ ] Date normalization prompt
  - [ ] Type classification prompt
- [ ] Add tests with sample documents:
  - [ ] CPR certificate
  - [ ] RN license
  - [ ] CNA certification
  - [ ] Various formats (image, PDF)

### 2.3 Job Queue System
- [ ] Create `/src/lib/jobQueue.ts`:
  - [ ] `enqueueParsingJob(documentId, priority?)` - Add job to queue
  - [ ] `getNextJob()` - Fetch next pending job
  - [ ] `markJobProcessing(jobId)` - Update status
  - [ ] `markJobCompleted(jobId, result)` - Mark success
  - [ ] `markJobFailed(jobId, error)` - Handle failure
  - [ ] `requeueFailedJob(jobId)` - Retry logic
- [ ] Create `/src/app/api/cron/process-parsing-jobs/route.ts`:
  - [ ] `GET` - Process job queue
  - [ ] Fetch pending jobs (limit 10)
  - [ ] For each job:
    - [ ] Download document from S3
    - [ ] Call `parseCredentialDocument()`
    - [ ] Update `EmployeeDocument` with parsed data
    - [ ] Set `reviewStatus` based on confidence
    - [ ] Mark job completed/failed
  - [ ] Handle errors gracefully
  - [ ] Return processing summary
- [ ] Configure Vercel Cron (in `vercel.json`):
  ```json
  {
    "crons": [{
      "path": "/api/cron/process-parsing-jobs",
      "schedule": "* * * * *"
    }]
  }
  ```
- [ ] Add job monitoring:
  - [ ] Log job start/end
  - [ ] Track processing time
  - [ ] Alert on high failure rate

### 2.4 Integration with Upload
- [ ] Update upload handler to enqueue parsing:
  ```typescript
  // After creating EmployeeDocument
  await enqueueParsingJob(documentId, priority: 1);
  ```
- [ ] Add status endpoint for real-time updates:
  - [ ] `/api/employee/credentials/[id]/parse-status`
  - [ ] Return: parsing status, confidence, parsed data
- [ ] Implement webhooks/SSE for real-time notifications (optional)

### 2.5 Testing
- [ ] Test OCR with 20+ sample documents:
  - [ ] Various credential types
  - [ ] Different image qualities
  - [ ] Handwritten vs. printed
- [ ] Test LLM extraction accuracy:
  - [ ] Measure precision/recall per field
  - [ ] Iterate on prompts to improve accuracy
  - [ ] Target: >85% field extraction accuracy
- [ ] Test job queue:
  - [ ] Enqueue 100 jobs, verify all processed
  - [ ] Test failure and retry logic
  - [ ] Test concurrent processing
- [ ] Load test parsing pipeline:
  - [ ] 50 documents in parallel
  - [ ] Monitor performance and errors

**Phase 2 Acceptance Criteria:**
- ✅ OCR extracts text from images and PDFs
- ✅ LLM parses credentials with >85% accuracy
- ✅ Job queue processes reliably
- ✅ Parsed data saves to database
- ✅ Low confidence documents flagged for review

---

## Phase 3: Admin Features (Week 3)

**Goal:** Compliance dashboard and management tools

### 3.1 Admin APIs - Dashboard
- [ ] Create `/src/app/api/admin/credentials/dashboard/route.ts`:
  - [ ] `GET` - Compliance overview
  - [ ] Authenticate with `requireAgencyAdmin()`
  - [ ] Query parameters:
    - [ ] `fromDate`, `toDate` - Date range
    - [ ] `department` - Filter by department
  - [ ] Calculate and return:
    - [ ] Total credentials, by status (valid, expiring, expired, missing)
    - [ ] Compliance rate (%)
    - [ ] Breakdown by credential type
    - [ ] Breakdown by department
    - [ ] Recently uploaded (last 7 days)
    - [ ] Action items (pending reviews, expired)
  - [ ] Cache results (Redis, 5 min TTL)

### 3.2 Admin APIs - Search & Filter
- [ ] Create `/src/app/api/admin/credentials/search/route.ts`:
  - [ ] `GET` - Advanced search
  - [ ] Query parameters:
    - [ ] `status` - Filter by status
    - [ ] `credentialType` - Filter by type
    - [ ] `employeeName` - Search by name
    - [ ] `department` - Filter by department
    - [ ] `expiringBefore` - Date filter
    - [ ] `reviewStatus` - Filter by review status
    - [ ] `page`, `limit` - Pagination
  - [ ] Build dynamic Prisma query
  - [ ] Return paginated results with metadata
  - [ ] Include employee and credential type details

### 3.3 Admin APIs - Review Workflow
- [ ] Create `/src/app/api/admin/credentials/[id]/review/route.ts`:
  - [ ] `PATCH` - Review credential
  - [ ] Validate request body:
    - [ ] `reviewStatus` - APPROVED | REJECTED | NEEDS_CORRECTION
    - [ ] `reviewNotes` - Optional notes
    - [ ] `correctedData` - Manual corrections (issuer, licenseNumber, dates)
  - [ ] Update credential:
    - [ ] Set review status
    - [ ] Apply corrections if provided
    - [ ] Set `reviewedBy`, `reviewedAt`
    - [ ] Recalculate `isCompliant`
  - [ ] Send notification to employee (if rejected)
  - [ ] Log audit event
  - [ ] Return updated credential

### 3.4 Admin APIs - Reminders
- [ ] Create `/src/app/api/admin/credentials/[id]/remind/route.ts`:
  - [ ] `POST` - Send single reminder
  - [ ] Validate request: `channel` (email | sms)
  - [ ] Generate reminder email
  - [ ] Send via AWS SES
  - [ ] Create `CredentialReminder` record
  - [ ] Return confirmation
- [ ] Create `/src/app/api/admin/credentials/bulk-remind/route.ts`:
  - [ ] `POST` - Bulk reminder
  - [ ] Validate filters (status, credentialType, department)
  - [ ] Query matching credentials
  - [ ] For each credential:
    - [ ] Check if reminder already sent recently
    - [ ] Generate and send email
    - [ ] Create reminder record
  - [ ] Return summary (sent, skipped, failed)

### 3.5 Admin APIs - Export
- [ ] Create `/src/lib/credentialExport.ts`:
  - [ ] `exportToCSV(credentials, fields)` - Generate CSV
  - [ ] `exportToJSON(credentials)` - Generate JSON
  - [ ] `exportToExcel(credentials)` - Generate Excel (optional)
- [ ] Create `/src/app/api/admin/credentials/export/route.ts`:
  - [ ] `POST` - Generate export
  - [ ] Validate filters and format
  - [ ] Query credentials
  - [ ] Generate file in requested format
  - [ ] Upload to S3 (temp folder)
  - [ ] Return presigned download URL (30 min expiry)
- [ ] Install `xlsx` package for Excel export

### 3.6 Compliance Reporting
- [ ] Create `/src/lib/complianceReporting.ts`:
  - [ ] `generateComplianceSnapshot(agencyId)`:
    - [ ] Query all credentials for agency
    - [ ] Calculate aggregate statistics
    - [ ] Break down by credential type
    - [ ] Break down by department
    - [ ] Create `ComplianceSnapshot` record
    - [ ] Return snapshot
  - [ ] `getComplianceTrend(agencyId, months)`:
    - [ ] Fetch historical snapshots
    - [ ] Calculate month-over-month changes
    - [ ] Return trend data
- [ ] Create cron job for weekly snapshots:
  - [ ] `/src/app/api/cron/generate-snapshots/route.ts`
  - [ ] Run every Sunday at midnight
  - [ ] Generate snapshot for each agency

### 3.7 Email Templates
- [ ] Extend `/src/lib/email.ts`:
  - [ ] `sendCredentialExpiringEmail(employee, credential, daysUntil)`:
    - [ ] HTML template with credential details
    - [ ] Call-to-action to upload renewal
  - [ ] `sendCredentialExpiredEmail(employee, credential)`:
    - [ ] Urgent notice template
    - [ ] Instructions for renewal
  - [ ] `sendCredentialRejectedEmail(employee, credential, reason)`:
    - [ ] Explain rejection reason
    - [ ] Instructions to re-upload
  - [ ] `sendComplianceAlertEmail(admin, agency, summary)`:
    - [ ] Weekly compliance summary for admins
    - [ ] List of action items
- [ ] Test email templates in development

### 3.8 Testing
- [ ] Test dashboard calculations with various scenarios
- [ ] Test search with complex filter combinations
- [ ] Test review workflow:
  - [ ] Approve credential
  - [ ] Reject with corrections
  - [ ] Mark as needs correction
- [ ] Test reminder sending:
  - [ ] Single reminder
  - [ ] Bulk reminders (50+ recipients)
  - [ ] Duplicate prevention
- [ ] Test export:
  - [ ] CSV with 1000+ records
  - [ ] JSON export
  - [ ] Excel with multiple sheets
- [ ] Integration tests for compliance reporting

**Phase 3 Acceptance Criteria:**
- ✅ Dashboard shows accurate compliance data
- ✅ Search/filter returns correct results
- ✅ Review workflow updates credentials
- ✅ Reminders send successfully
- ✅ Export generates downloadable files
- ✅ Email templates render correctly

---

## Phase 4: Agent Tools (Week 4)

**Goal:** Enable conversational AI to query and manage credentials

### 4.1 Tool Definitions
- [ ] Create `/src/lib/agentTools/credentialTools.ts`:
  - [ ] Define tool schemas for function calling:
    - [ ] `search_credentials` - Search with filters
    - [ ] `get_employee_credentials` - Get one employee's credentials
    - [ ] `get_compliance_summary` - Agency-wide stats
    - [ ] `send_credential_reminders` - Trigger reminders
    - [ ] `create_credential_requirement` - Create missing credential slot
    - [ ] `update_credential` - Manual metadata update
  - [ ] Export as JSON schema array
  - [ ] Include descriptions, parameters, examples

### 4.2 Tool Handlers
- [ ] Create `/src/lib/agentTools/credentialToolHandlers.ts`:
  - [ ] Implement handlers for each tool:
    - [ ] `searchCredentials(params, context)`:
      - [ ] Validate params
      - [ ] Build Prisma query
      - [ ] Return formatted results
    - [ ] `getEmployeeCredentials(params, context)`:
      - [ ] Verify employee exists and user has access
      - [ ] Query credentials
      - [ ] Return with summary
    - [ ] `getComplianceSummary(params, context)`:
      - [ ] Calculate real-time statistics
      - [ ] Return breakdown by type, department
    - [ ] `sendCredentialReminders(params, context)`:
      - [ ] Query credentials matching filters
      - [ ] Send reminders
      - [ ] Return summary
    - [ ] `createCredentialRequirement(params, context)`:
      - [ ] Create empty credential slot
      - [ ] Set status to MISSING
      - [ ] Notify employee
    - [ ] `updateCredential(params, context)`:
      - [ ] Apply updates
      - [ ] Recalculate status
      - [ ] Log audit event
  - [ ] `executeCredentialTool(toolName, params, context)`:
    - [ ] Route to appropriate handler
    - [ ] Enforce auth/RBAC
    - [ ] Handle errors gracefully
    - [ ] Return LLM-friendly responses

### 4.3 Agent API Endpoint
- [ ] Create `/src/app/api/agent/credentials/route.ts`:
  - [ ] `POST` - Execute agent tool
  - [ ] Authenticate with `requireAgency()`
  - [ ] Parse request: `{ toolName, parameters }`
  - [ ] Call `executeCredentialTool()`
  - [ ] Log for audit trail
  - [ ] Return: `{ success: true, result: {...} }`
  - [ ] Rate limit: 30 calls per minute per agency
- [ ] Add input validation
- [ ] Add output sanitization (no sensitive data leakage)

### 4.4 Chatbot Integration
- [ ] Extend existing chatbot (`/src/components/AIChatbot.tsx` or backend):
  - [ ] Add credential tools to tool list
  - [ ] Implement tool calling loop:
    - [ ] Send message with tools to LLM
    - [ ] If tool use requested, execute via agent API
    - [ ] Return tool result to LLM
    - [ ] Continue conversation
  - [ ] Handle multi-turn conversations
  - [ ] Store conversation history
- [ ] Add credential-specific system prompts:
  - [ ] "You are a compliance assistant..."
  - [ ] Guidelines for when to use each tool
  - [ ] Privacy/security guidelines

### 4.5 Example Conversations
- [ ] Document example interactions:
  - [ ] "Who is non-compliant this month?"
    - [ ] Uses `search_credentials` with status=expired
    - [ ] Returns list with employee names
  - [ ] "Show all CPR certifications expiring in 30 days"
    - [ ] Uses `search_credentials` with credentialType and date filter
    - [ ] Returns formatted list
  - [ ] "Send reminders to all CNAs with expired credentials"
    - [ ] Uses `search_credentials` to find CNAs
    - [ ] Uses `send_credential_reminders`
    - [ ] Confirms action taken
  - [ ] "What's our current compliance rate?"
    - [ ] Uses `get_compliance_summary`
    - [ ] Returns percentage and breakdown

### 4.6 Testing
- [ ] Unit tests for each tool handler
- [ ] Integration tests for agent API:
  - [ ] Execute each tool via API
  - [ ] Verify correct results
  - [ ] Test error handling
- [ ] Test with actual LLM (Claude/GPT-4):
  - [ ] Claude function calling
  - [ ] GPT-4 function calling
  - [ ] Verify natural language understanding
- [ ] Test multi-turn conversations
- [ ] Test auth and rate limiting

**Phase 4 Acceptance Criteria:**
- ✅ 6 agent tools functional
- ✅ Tools return correct data
- ✅ Agent API endpoint working
- ✅ Chatbot can answer credential questions
- ✅ Tool execution logged in audit trail
- ✅ Example conversations documented

---

## Phase 5: Integration & Export (Week 5)

**Goal:** Enable HR system compatibility

### 5.1 Export APIs
- [ ] Create `/src/app/api/integrations/credentials/export.csv/route.ts`:
  - [ ] `GET` - CSV export for integrations
  - [ ] Authenticate with API key (new auth method)
  - [ ] Query parameters: status, updatedSince, includeArchived
  - [ ] Generate CSV with standard schema
  - [ ] Set Content-Type: text/csv
  - [ ] Return file stream
- [ ] Create `/src/app/api/integrations/credentials/export.json/route.ts`:
  - [ ] `GET` - JSON export
  - [ ] Same filters as CSV
  - [ ] Return structured JSON array
  - [ ] Include metadata (generatedAt, totalRecords)
- [ ] Create `/src/app/api/integrations/credentials/employees/[employeeId]/route.ts`:
  - [ ] `GET` - Single employee's credentials
  - [ ] Useful for real-time sync
  - [ ] Return employee details + credentials

### 5.2 API Key Authentication
- [ ] Add `ApiKey` model to schema (if not already done in Phase 1)
- [ ] Create `/src/lib/apiKeyAuth.ts`:
  - [ ] `generateApiKey(agencyId, name, permissions)`:
    - [ ] Generate random key (32 bytes)
    - [ ] Create prefix (e.g., "ak_live_12345678")
    - [ ] Hash full key with bcrypt
    - [ ] Store hashed key + prefix in database
    - [ ] Return plaintext key (only once!)
  - [ ] `validateApiKey(keyString)`:
    - [ ] Extract prefix
    - [ ] Look up key by prefix
    - [ ] Verify hash
    - [ ] Check expiration
    - [ ] Update lastUsedAt
    - [ ] Return agency + permissions
  - [ ] `requireApiKey(request, requiredPermissions)`:
    - [ ] Extract key from Authorization header
    - [ ] Validate key
    - [ ] Check permissions
    - [ ] Return agency context
- [ ] Create admin UI for API key management:
  - [ ] `/src/app/api/admin/api-keys/route.ts`
  - [ ] `GET` - List keys for agency
  - [ ] `POST` - Create new key
  - [ ] `DELETE /[id]` - Revoke key

### 5.3 Webhook System - Models & Infrastructure
- [ ] Add `WebhookSubscription` and `WebhookDelivery` models (if not in Phase 1)
- [ ] Create `/src/lib/webhooks.ts`:
  - [ ] `registerWebhook(agencyId, url, events, secret)`:
    - [ ] Create WebhookSubscription
    - [ ] Validate URL (must be HTTPS)
    - [ ] Generate signing secret if not provided
  - [ ] `dispatchWebhook(event, data, agencyId)`:
    - [ ] Find active subscriptions for this event + agency
    - [ ] For each subscription:
      - [ ] Build payload
      - [ ] Sign with HMAC-SHA256
      - [ ] POST to webhook URL
      - [ ] Record WebhookDelivery
      - [ ] Handle success/failure
  - [ ] `retryFailedWebhooks()`:
    - [ ] Find failed deliveries with `nextRetryAt <= now`
    - [ ] Retry with exponential backoff
    - [ ] Max 3 retries
  - [ ] `verifyWebhookSignature(payload, signature, secret)`:
    - [ ] Helper for webhook receivers
    - [ ] Verify HMAC signature

### 5.4 Webhook System - Event Triggers
- [ ] Identify trigger points in code:
  - [ ] `credential.created` - After upload
  - [ ] `credential.updated` - After update
  - [ ] `credential.approved` - After review approval
  - [ ] `credential.rejected` - After review rejection
  - [ ] `credential.expiring` - Daily check (7 days before)
  - [ ] `credential.expired` - Daily check
- [ ] Implement `dispatchWebhook()` calls:
  ```typescript
  // Example in upload handler
  await dispatchWebhook('credential.created', {
    credentialId: credential.id,
    employeeId: employee.id,
    credentialType: type.name,
    status: credential.status,
  }, agencyId);
  ```
- [ ] Create cron job for time-based events:
  - [ ] `/src/app/api/cron/webhook-events/route.ts`
  - [ ] Check for expiring/expired credentials
  - [ ] Dispatch webhooks

### 5.5 Admin UI for Webhooks
- [ ] Create `/src/app/api/admin/webhooks/route.ts`:
  - [ ] `GET` - List webhooks for agency
  - [ ] `POST` - Create webhook subscription
  - [ ] `PATCH /[id]` - Update (enable/disable, change URL)
  - [ ] `DELETE /[id]` - Delete subscription
- [ ] Create `/src/app/api/admin/webhooks/[id]/deliveries/route.ts`:
  - [ ] `GET` - View delivery log
  - [ ] Show: timestamp, status, response, error
- [ ] Create `/src/app/api/admin/webhooks/[id]/test/route.ts`:
  - [ ] `POST` - Send test webhook
  - [ ] Useful for integration testing

### 5.6 Field Mapping Configuration
- [ ] Add `hrSystemConfig` to Agency model:
  ```prisma
  hrSystemConfig Json? // { provider: "bamboohr", fieldMappings: {...} }
  ```
- [ ] Create `/src/lib/fieldMappings.ts`:
  - [ ] Define standard field mappings for common systems:
    - [ ] BambooHR
    - [ ] Gusto
    - [ ] Paychex
    - [ ] ADP
  - [ ] `applyFieldMapping(credentials, mapping)`:
    - [ ] Transform field names based on mapping
    - [ ] Handle date format conversions
    - [ ] Return mapped data
- [ ] Create admin UI to configure mapping:
  - [ ] `/src/app/api/admin/settings/hr-system/route.ts`
  - [ ] Select provider
  - [ ] Customize field mappings
  - [ ] Test with sample export

### 5.7 Documentation
- [ ] Create `/docs/integrations/hr-systems.md`:
  - [ ] Overview of integration capabilities
  - [ ] Authentication (API keys)
  - [ ] Export endpoints reference
  - [ ] Webhook events reference
  - [ ] Field mapping guide
  - [ ] Examples for each system:
    - [ ] BambooHR
    - [ ] Gusto
    - [ ] Paychex
    - [ ] Generic CSV
- [ ] Create OpenAPI spec:
  - [ ] Generate from code comments
  - [ ] Host at `/api/docs`

### 5.8 Testing
- [ ] Test API key auth:
  - [ ] Generate key
  - [ ] Make authenticated request
  - [ ] Test invalid key rejection
  - [ ] Test permission enforcement
- [ ] Test export endpoints:
  - [ ] CSV with 1000+ records
  - [ ] JSON export
  - [ ] Filter by date range
  - [ ] Verify field mappings
- [ ] Test webhook system:
  - [ ] Register webhook
  - [ ] Trigger event
  - [ ] Verify delivery
  - [ ] Test retry logic
  - [ ] Test signature verification
- [ ] Test with actual HR systems (if possible):
  - [ ] BambooHR sandbox
  - [ ] Gusto developer account

**Phase 5 Acceptance Criteria:**
- ✅ API key authentication working
- ✅ Export APIs return correct data
- ✅ Webhook deliveries succeed
- ✅ Field mappings configurable
- ✅ Integration documentation complete
- ✅ OpenAPI spec available

---

## Phase 6: Background Jobs & Polish (Week 6)

**Goal:** Production readiness and automation

### 6.1 Automated Reminders
- [ ] Create `/src/lib/reminderScheduler.ts`:
  - [ ] `findCredentialsNeedingReminders(agencyId?)`:
    - [ ] Query credentials where:
      - [ ] Status = EXPIRING_SOON or EXPIRED
      - [ ] expirationDate in next N days (based on agency settings)
      - [ ] lastReminderSent is null or >7 days ago
    - [ ] Return list of credentials
  - [ ] `sendScheduledReminders()`:
    - [ ] Find all agencies with autoReminderEnabled = true
    - [ ] For each agency:
      - [ ] Find credentials needing reminders
      - [ ] Send emails
      - [ ] Create CredentialReminder records
      - [ ] Update lastReminderSent
    - [ ] Return summary
- [ ] Create `/src/app/api/cron/send-reminders/route.ts`:
  - [ ] `GET` - Cron job handler
  - [ ] Call `sendScheduledReminders()`
  - [ ] Log results
  - [ ] Alert on failures
- [ ] Configure cron schedule:
  ```json
  {
    "path": "/api/cron/send-reminders",
    "schedule": "0 9 * * *"  // Daily at 9am
  }
  ```
- [ ] Test reminder logic:
  - [ ] Create test credentials expiring at various dates
  - [ ] Run cron job
  - [ ] Verify correct reminders sent
  - [ ] Verify duplicates prevented

### 6.2 Compliance Snapshots
- [ ] Schedule weekly snapshot generation:
  ```json
  {
    "path": "/api/cron/generate-snapshots",
    "schedule": "0 0 * * 0"  // Sunday at midnight
  }
  ```
- [ ] Implement trend analysis:
  - [ ] Compare current snapshot to previous
  - [ ] Calculate changes (improvement/decline)
  - [ ] Highlight areas of concern
- [ ] Send weekly compliance report to admins:
  - [ ] Generate snapshot
  - [ ] Build HTML report
  - [ ] Email to all agency admins
  - [ ] Include action items

### 6.3 Performance Optimization
- [ ] Add database indexes (if not already done):
  - [ ] Review slow query log
  - [ ] Identify missing indexes
  - [ ] Add composite indexes for common queries
- [ ] Optimize complex queries:
  - [ ] Dashboard queries (aggregate stats)
  - [ ] Search queries (multiple filters)
  - [ ] Use materialized views if needed
- [ ] Implement caching:
  - [ ] Dashboard data (Redis, 5 min TTL)
  - [ ] Compliance summaries (10 min TTL)
  - [ ] Credential type lookups (1 hour TTL)
  - [ ] Invalidate cache on updates
- [ ] Add pagination everywhere:
  - [ ] Search results
  - [ ] Employee lists
  - [ ] Credential lists
  - [ ] Audit logs
- [ ] Run load tests:
  - [ ] 100 concurrent users
  - [ ] 1000 credentials per agency
  - [ ] Measure response times
  - [ ] Identify bottlenecks
- [ ] Optimize file uploads:
  - [ ] Use direct S3 uploads (presigned POST)
  - [ ] Compress images before upload
  - [ ] Validate files client-side

### 6.4 Security Hardening
- [ ] Audit all endpoints for RBAC:
  - [ ] Employee can only access their own data
  - [ ] Agency admin can access agency data
  - [ ] Platform admin can access all
  - [ ] Add tests for unauthorized access attempts
- [ ] Add rate limiting:
  - [ ] Use existing Redis-based rate limiter
  - [ ] Apply to sensitive endpoints:
    - [ ] Upload: 10/min per user
    - [ ] Export: 5/hour per agency
    - [ ] Agent tools: 30/min per agency
    - [ ] Search: 100/min per agency
- [ ] Implement CSRF protection:
  - [ ] Use existing CSRF middleware
  - [ ] Apply to all mutation endpoints
- [ ] Encrypt sensitive data:
  - [ ] Consider encrypting `licenseNumber` at rest
  - [ ] Use existing encryption library
  - [ ] Add decryption in query layer
- [ ] Security audit:
  - [ ] Review for SQL injection (Prisma should prevent)
  - [ ] Review for XSS (sanitize inputs)
  - [ ] Review for IDOR (check ownership)
  - [ ] Review for SSRF (validate URLs)
  - [ ] Review for sensitive data exposure
- [ ] Penetration testing:
  - [ ] Test auth bypass attempts
  - [ ] Test privilege escalation
  - [ ] Test file upload vulnerabilities
  - [ ] Test API abuse

### 6.5 Monitoring & Alerting
- [ ] Implement application metrics:
  - [ ] Track parsing success/failure rate
  - [ ] Track API response times
  - [ ] Track error rates
  - [ ] Track job queue depth
- [ ] Set up alerts:
  - [ ] Parsing failure rate >20%
  - [ ] Agency compliance rate <80%
  - [ ] Job queue backlog >500
  - [ ] API error rate >5%
  - [ ] S3 upload failures
  - [ ] Email delivery failures
- [ ] Implement health check endpoint:
  - [ ] `/api/health`
  - [ ] Check database connectivity
  - [ ] Check S3 connectivity
  - [ ] Check OpenAI API
  - [ ] Check Redis
  - [ ] Return status + details

### 6.6 Documentation
- [ ] Complete API reference:
  - [ ] OpenAPI/Swagger spec
  - [ ] Request/response examples
  - [ ] Error codes
  - [ ] Rate limits
- [ ] Create admin user manual:
  - [ ] Setting up credential types
  - [ ] Reviewing documents
  - [ ] Generating reports
  - [ ] Configuring integrations
  - [ ] Troubleshooting common issues
- [ ] Create employee user guide:
  - [ ] How to upload credentials
  - [ ] Understanding credential status
  - [ ] Responding to reminders
  - [ ] Renewing credentials
- [ ] Create developer guide:
  - [ ] Architecture overview
  - [ ] Setting up development environment
  - [ ] Running tests
  - [ ] Deployment process
  - [ ] Contributing guidelines
- [ ] Document ADRs (Architecture Decision Records):
  - [ ] Why extend EmployeeDocument
  - [ ] OCR provider selection
  - [ ] Job queue strategy
  - [ ] Agent tool patterns
- [ ] Create runbook:
  - [ ] Common troubleshooting scenarios
  - [ ] Manual parsing retry
  - [ ] Reminder job debugging
  - [ ] Database maintenance
  - [ ] Rollback procedures

### 6.7 Testing & Quality Assurance
- [ ] Achieve >90% test coverage for business logic
- [ ] Run full integration test suite
- [ ] Run E2E tests for critical flows:
  - [ ] Employee uploads → parsing → admin review → approved
  - [ ] Credential expiring → reminder sent → renewed
  - [ ] Admin searches → exports → downloads
- [ ] Perform accessibility audit (if UI components added)
- [ ] Cross-browser testing (if UI components added)
- [ ] Mobile responsive testing (if UI components added)
- [ ] Review code for:
  - [ ] Proper error handling
  - [ ] Consistent logging
  - [ ] Clear comments
  - [ ] Type safety
  - [ ] No console.log() in production code

### 6.8 Deployment Preparation
- [ ] Review environment variables:
  - [ ] Ensure all required vars documented
  - [ ] Verify production values set
- [ ] Database migration plan:
  - [ ] Review all migrations
  - [ ] Test migration on staging
  - [ ] Prepare rollback scripts
- [ ] Feature flag configuration:
  - [ ] `FEATURE_CREDENTIALS_ENABLED=true`
  - [ ] Gradual rollout plan
- [ ] Monitoring setup:
  - [ ] Configure error tracking (Sentry, etc.)
  - [ ] Configure APM (New Relic, Datadog, etc.)
  - [ ] Configure log aggregation
- [ ] Backup strategy:
  - [ ] Verify database backups enabled
  - [ ] Test restore procedure
  - [ ] Document backup retention policy

**Phase 6 Acceptance Criteria:**
- ✅ Automated reminders running daily
- ✅ Compliance snapshots generated weekly
- ✅ Performance benchmarks met (<2s dashboard load)
- ✅ Security audit passed (no critical issues)
- ✅ >90% test coverage
- ✅ Documentation complete
- ✅ Ready for production deployment

---

## Post-Launch: Monitoring & Iteration

### Week 7-8: Launch & Stabilization
- [ ] Deploy to production with feature flag
- [ ] Enable for pilot agencies (5-10)
- [ ] Monitor metrics daily:
  - [ ] Error rates
  - [ ] Parsing accuracy
  - [ ] User adoption
  - [ ] Performance
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Iterate on UX pain points

### Week 9-10: Full Rollout
- [ ] Enable for all agencies
- [ ] Announce feature via email/blog
- [ ] Create tutorial videos
- [ ] Host webinar for admins
- [ ] Monitor support ticket volume
- [ ] Build FAQ based on common questions

### Ongoing: Maintenance & Enhancement
- [ ] Monthly review of parsing accuracy
- [ ] Quarterly security audits
- [ ] Iterate on LLM prompts to improve extraction
- [ ] Add new credential types as requested
- [ ] Build integrations with specific HR systems (BambooHR, Gusto)
- [ ] Implement Phase 7+ features (mobile app, verification, etc.)

---

## Success Metrics

Track these KPIs to measure success:

### Operational Metrics
- **Parsing Accuracy:** >85% field extraction accuracy
- **Processing Time:** <30 seconds per document
- **Manual Review Rate:** <20% of uploads
- **Reminder Delivery Rate:** >98%
- **System Uptime:** >99.5%

### User Metrics
- **Adoption Rate:** >70% of agencies using within 3 months
- **Upload Volume:** Average 20+ credentials uploaded per agency/month
- **Time Savings:** 70% reduction in manual tracking time
- **User Satisfaction:** >4.5/5 star rating

### Compliance Metrics
- **Compliance Rate Improvement:** +25% average across agencies
- **Expired Credentials:** <5% of active employee credentials
- **Time to Renewal:** <7 days from reminder to upload

### Business Metrics
- **Feature Revenue Impact:** Track if credential feature drives subscriptions
- **Support Ticket Rate:** <5% of users file tickets
- **Integration Adoption:** >20% of agencies enable HR system integration within 6 months

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| OCR accuracy too low | Multi-provider fallback, continuous prompt engineering |
| LLM hallucination | Confidence thresholds, mandatory admin review for low confidence |
| Job queue overwhelm | Rate limiting, monitoring, auto-scaling |
| Performance degradation | Caching, indexes, query optimization |

### Business Risks
| Risk | Mitigation |
|------|------------|
| Low user adoption | Clear onboarding, in-app guidance, training materials |
| Compliance concerns | HIPAA audit logging, legal review, certifications |
| Integration complexity | Start with generic export, add specific integrations incrementally |

### Security Risks
| Risk | Mitigation |
|------|------------|
| Data breach | Encryption at rest/transit, access controls, audit logging |
| Unauthorized access | Strong RBAC, API key management, rate limiting |
| HIPAA violation | Comprehensive audit trail, data retention policies, training |

---

## Summary

This implementation plan provides a structured, phased approach to building the Credential Agent feature:

1. **Week 1:** Foundation - Data model and basic CRUD
2. **Week 2:** AI Parsing - OCR + LLM extraction pipeline
3. **Week 3:** Admin Features - Dashboard, review workflow, reporting
4. **Week 4:** Agent Tools - Conversational AI capabilities
5. **Week 5:** Integration - HR system compatibility
6. **Week 6:** Polish - Automation, performance, security

Each phase builds on the previous, with clear acceptance criteria and testing requirements. The plan emphasizes:
- **Extending existing patterns** rather than reinventing
- **Security and compliance** throughout
- **Iterative improvement** with feedback loops
- **Production readiness** with monitoring and documentation

Next step: **Get user approval and begin Phase 1 implementation.**
