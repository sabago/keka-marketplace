# Credential Agent Architecture & Implementation Plan

## Executive Summary

This document outlines the design and implementation plan for an **AI-powered credential tracking system** for home care agencies. The system will extend the existing document management infrastructure with intelligent parsing, compliance monitoring, and conversational AI capabilities.

---

## 1. Current System Analysis

### Tech Stack
- **Backend:** Next.js 15.2.2 App Router (TypeScript)
- **Database:** PostgreSQL with Prisma ORM 6.5.0
- **Authentication:** NextAuth.js with JWT sessions
- **File Storage:** AWS S3 with presigned URLs
- **Email:** AWS SES with HTML templates
- **LLM:** OpenAI GPT-4 Turbo + text-embedding-3-large
- **Vector DB:** Pinecone (for existing RAG chatbot)
- **Payments:** Stripe subscriptions
- **Rate Limiting:** Upstash Redis

### Existing Document Management System

**Already Implemented (Foundation to Build Upon):**

```prisma
model DocumentType {
  id              String   @id @default(uuid())
  agencyId        String?
  name            String                    // "CPR Certification", "RN License"
  description     String?   @db.Text
  expirationDays  Int?                      // Days until expiration
  reminderDays    Int[]     @default([30, 7]) // When to send reminders
  isRequired      Boolean   @default(false)
  isGlobal        Boolean   @default(false)  // System-wide templates
  isActive        Boolean   @default(true)
  documents       EmployeeDocument[]
}

model EmployeeDocument {
  id                String   @id @default(uuid())
  employeeId        String
  employee          Employee @relation(...)
  documentTypeId    String
  documentType      DocumentType @relation(...)

  // File storage
  s3Key             String   // S3 path
  fileName          String
  fileSize          Int
  mimeType          String

  // Dates
  issueDate         DateTime?
  expirationDate    DateTime?
  status            DocumentStatus @default(ACTIVE)

  // Tracking
  uploadedBy        String   // User ID
  notes             String?  @db.Text
  lastReminderSent  DateTime?
  remindersSent     Int      @default(0)
}

enum DocumentStatus {
  ACTIVE
  EXPIRING_SOON  // Within 30 days
  EXPIRED
  ARCHIVED
}
```

**Key Patterns:**
- Multi-tenancy via `agencyId` on all entities
- Role-based access: `AGENCY_USER`, `AGENCY_ADMIN`, `PLATFORM_ADMIN`
- S3 file storage: `documents/${agencyId}/${employeeId}/${timestamp}_${filename}`
- Status calculation: Based on `expirationDate` and days remaining
- Service layer in `/src/lib/` (authHelpers, documentHelpers, etc.)
- API routes in `/src/app/api/` with standardized patterns

**What's Missing (Our Implementation Focus):**
1. ✗ AI-powered document parsing (OCR + LLM extraction)
2. ✗ Credential-specific metadata (issuer, license number, confidence)
3. ✗ Pending review workflow
4. ✗ Compliance dashboard and reporting
5. ✗ Agent tools for conversational AI
6. ✗ Background job system for reminders
7. ✗ Export capabilities for HR system integration

---

## 2. Data Model Design

### Strategy: Extend, Don't Replace

We'll **extend** the existing `EmployeeDocument` model rather than creating a parallel system. This maintains consistency and leverages existing infrastructure.

### New Models & Extensions

#### 2.1 Extend EmployeeDocument

```prisma
model EmployeeDocument {
  // ... existing fields ...

  // NEW: Credential-specific fields
  issuer            String?              // "American Red Cross", "MA Board of Nursing"
  licenseNumber     String?              // "RN123456", "CPR-2024-001"
  verificationUrl   String?              // Link to verify credential

  // NEW: AI parsing metadata
  aiParsedData      Json?                // Raw LLM extraction output
  aiConfidence      Float?               // 0.0-1.0 confidence score
  aiParsedAt        DateTime?
  aiParsedBy        String?              // Model name (gpt-4-turbo, etc.)

  // NEW: Review workflow
  reviewStatus      ReviewStatus         @default(PENDING_UPLOAD)
  reviewedBy        String?              // Admin user ID
  reviewedAt        DateTime?
  reviewNotes       String?   @db.Text

  // NEW: Compliance tracking
  isCompliant       Boolean              @default(false) // Computed field
  complianceCheckedAt DateTime?
}

enum ReviewStatus {
  PENDING_UPLOAD     // Slot created, no document yet
  PENDING_REVIEW     // Document uploaded, needs admin review
  APPROVED           // Admin verified
  REJECTED           // Document rejected (quality/authenticity issues)
  NEEDS_CORRECTION   // Needs employee to re-upload
}

// Extend DocumentStatus to include more states
enum DocumentStatus {
  ACTIVE             // Valid and current
  EXPIRING_SOON      // Within warning window (30 days default)
  EXPIRED            // Past expiration date
  MISSING            // Required but not uploaded
  ARCHIVED           // Superseded by newer version
  PENDING_REVIEW     // Uploaded but not yet approved
}
```

#### 2.2 New Model: CredentialReminder

Track reminder history and prevent duplicate notifications.

```prisma
model CredentialReminder {
  id                String   @id @default(uuid())

  documentId        String
  document          EmployeeDocument @relation(...)

  reminderType      ReminderType     // EXPIRING_SOON, EXPIRED, MISSING
  sentAt            DateTime         @default(now())
  sentTo            String[]         // Email addresses
  channel           NotificationChannel // EMAIL, SMS, IN_APP

  daysBeforeExpiry  Int?             // How many days before expiration
  templateUsed      String?          // Email template identifier

  agencyId          String
  agency            Agency @relation(...)

  @@index([documentId, sentAt])
  @@index([agencyId, sentAt])
}

enum ReminderType {
  EXPIRING_SOON    // Credential expiring soon
  EXPIRED          // Credential expired
  MISSING          // Required credential not uploaded
  RENEWAL_DUE      // Time to renew
}

enum NotificationChannel {
  EMAIL
  SMS
  IN_APP
  WEBHOOK
}
```

#### 2.3 New Model: ComplianceSnapshot

Store point-in-time compliance reports for historical tracking.

```prisma
model ComplianceSnapshot {
  id                String   @id @default(uuid())

  agencyId          String
  agency            Agency @relation(...)

  snapshotDate      DateTime @default(now())

  // Aggregated stats
  totalEmployees    Int
  activeEmployees   Int

  totalCredentials  Int
  validCredentials  Int
  expiringCredentials Int
  expiredCredentials Int
  missingCredentials Int

  complianceRate    Float    // Percentage (0-100)

  // Breakdown by credential type
  byCredentialType  Json     // { "CPR": { valid: 10, expiring: 2, ... }, ... }

  // Breakdown by department
  byDepartment      Json?

  createdBy         String?  // User who generated report

  @@index([agencyId, snapshotDate])
}
```

#### 2.4 Extend Agency Model

Add compliance preferences.

```prisma
model Agency {
  // ... existing fields ...

  // NEW: Compliance settings
  credentialWarningDays Int @default(30)  // Days before expiry to warn
  autoReminderEnabled   Boolean @default(true)
  reminderFrequency     ReminderFrequency @default(WEEKLY)

  // Relations
  credentialReminders   CredentialReminder[]
  complianceSnapshots   ComplianceSnapshot[]
}

enum ReminderFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
}
```

### Migration Strategy

1. **Phase 1:** Add new columns to `EmployeeDocument` (nullable for backward compatibility)
2. **Phase 2:** Create new tables (`CredentialReminder`, `ComplianceSnapshot`)
3. **Phase 3:** Add indexes for performance
4. **Phase 4:** Backfill existing documents with default values

---

## 3. API Surface Design

### 3.1 Employee APIs

**Credential Management:**
```
POST   /api/employee/credentials/upload
       Body: multipart/form-data (file, documentTypeId, issueDate?, expirationDate?)
       Returns: { credentialId, status: "pending_review", uploadUrl }

GET    /api/employee/credentials
       Query: ?status=active|expiring|expired&employeeId={id}
       Returns: { credentials: [...], summary: { total, valid, expiring, expired } }

GET    /api/employee/credentials/:id
       Returns: { credential: {...}, downloadUrl, history: [...] }

PATCH  /api/employee/credentials/:id
       Body: { notes?, issueDate?, expirationDate? }
       Returns: { credential: {...}, updated: true }
```

### 3.2 Admin APIs

**Compliance Dashboard:**
```
GET    /api/admin/credentials/dashboard
       Query: ?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&department=...
       Returns: {
         overview: { total, valid, expiring, expired, missing, complianceRate },
         byCredentialType: [...],
         byDepartment: [...],
         recentActivity: [...]
       }

GET    /api/admin/credentials/search
       Query: ?status=...&credentialType=...&employeeName=...&expiringBefore=...
       Returns: { credentials: [...], pagination: {...} }

POST   /api/admin/credentials/export
       Body: { format: "csv"|"json"|"xlsx", filters: {...} }
       Returns: { downloadUrl, expiresAt }
```

**Review Workflow:**
```
PATCH  /api/admin/credentials/:id/review
       Body: {
         reviewStatus: "approved"|"rejected"|"needs_correction",
         reviewNotes?: string,
         correctedData?: { issuer?, licenseNumber?, expirationDate? }
       }
       Returns: { credential: {...}, statusChanged: true }

POST   /api/admin/credentials/:id/resend-reminder
       Body: { channel: "email"|"sms", customMessage? }
       Returns: { reminderSent: true, sentTo: [...] }
```

**Bulk Operations:**
```
POST   /api/admin/credentials/bulk-remind
       Body: {
         filters: { status?, credentialType?, department? },
         reminderType: "expiring_soon"|"expired"|"missing"
       }
       Returns: { remindersSent: 45, failed: 2, errors: [...] }

POST   /api/admin/credentials/bulk-import
       Body: multipart/form-data (csv file with employee mapping)
       Returns: { imported: 100, skipped: 5, errors: [...] }
```

### 3.3 AI Processing API (Internal)

```
POST   /api/internal/credentials/parse
       Body: { credentialId, s3Key, mimeType }
       Returns: {
         parsedData: {...},
         confidence: 0.85,
         suggestedReviewStatus: "approved"|"pending_review"
       }
       Note: Should be called async from upload handler
```

### 3.4 Integration/Webhook APIs

For external HR systems:

```
GET    /api/integrations/credentials/employees/:employeeId
       Auth: API key in header
       Returns: { employee: {...}, credentials: [...] }

GET    /api/integrations/credentials/report
       Query: ?status=...&updatedSince=YYYY-MM-DD
       Auth: API key
       Returns: CSV or JSON export

POST   /api/integrations/webhooks/credential-updated
       Outbound webhook when credential status changes
       Payload: { event: "credential.updated", data: {...} }
```

---

## 4. AI Document Parsing Pipeline

### 4.1 Architecture Overview

```
┌─────────────────┐
│ User Uploads    │
│ Document        │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────────────┐
│ 1. Upload Handler (API Route)                      │
│    - Validate file (size, type)                    │
│    - Upload to S3                                   │
│    - Create EmployeeDocument record (PENDING_REVIEW)│
│    - Enqueue parsing job                            │
└────────┬────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────┐
│ 2. Parsing Service (Async Job)                     │
│    - Download file from S3                         │
│    - Extract text (OCR if image, PDF parse if PDF) │
└────────┬────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────┐
│ 3. LLM Extraction                                   │
│    - Send text + credential type to GPT-4          │
│    - Extract: issuer, license#, dates, type        │
│    - Return confidence score                        │
└────────┬────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────┐
│ 4. Update Database                                  │
│    - Save parsed metadata to EmployeeDocument      │
│    - Calculate status                               │
│    - Set reviewStatus based on confidence           │
│    - Notify admin if needs review                   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Service Layer Design

**File:** `/src/lib/credentialParser.ts`

```typescript
interface ParsedCredential {
  credentialType: string;
  issuer: string | null;
  licenseNumber: string | null;
  issuedAt: string | null;  // ISO date
  expiresAt: string | null;  // ISO date
  confidence: number;  // 0.0 - 1.0
  rawText?: string;
}

interface ParsingOptions {
  expectedType?: string;  // Hint for the LLM
  language?: string;      // Default: 'en'
  ocrProvider?: 'aws' | 'google' | 'tesseract';
}

export async function parseCredentialDocument(
  s3Key: string,
  mimeType: string,
  options?: ParsingOptions
): Promise<ParsedCredential>

export async function extractTextFromDocument(
  s3Key: string,
  mimeType: string
): Promise<string>

export async function extractCredentialMetadata(
  text: string,
  expectedType?: string
): Promise<ParsedCredential>

export function shouldRequireReview(
  parsed: ParsedCredential,
  threshold: number = 0.7
): boolean
```

**File:** `/src/lib/ocr.ts`

```typescript
// Abstraction layer for OCR providers
export interface OCRProvider {
  extractText(s3Key: string): Promise<string>;
}

export class AWSTextractProvider implements OCRProvider {
  async extractText(s3Key: string): Promise<string> {
    // AWS Textract implementation
  }
}

export class TesseractProvider implements OCRProvider {
  async extractText(s3Key: string): Promise<string> {
    // Tesseract.js implementation (fallback)
  }
}

export function getOCRProvider(provider: string = 'aws'): OCRProvider {
  // Factory pattern
}
```

### 4.3 LLM Prompt Engineering

**System Prompt for Credential Extraction:**

```typescript
const CREDENTIAL_EXTRACTION_PROMPT = `You are a credential document parser for healthcare credentials.

Extract the following information from the provided text:
1. Credential Type (e.g., "CPR Certification", "RN License", "CNA License", "HHA Certification")
2. Issuing Organization (e.g., "American Red Cross", "Massachusetts Board of Nursing")
3. License/Certificate Number
4. Issue Date (YYYY-MM-DD format)
5. Expiration Date (YYYY-MM-DD format)

Rules:
- If a field is not found, return null
- Be conservative with dates - only return if clearly stated
- Return confidence score (0.0-1.0) based on clarity of information
- For dates, prefer MM/DD/YYYY or MM-DD-YYYY formats commonly used in US documents

Return ONLY valid JSON with this structure:
{
  "credentialType": "string or null",
  "issuer": "string or null",
  "licenseNumber": "string or null",
  "issuedAt": "YYYY-MM-DD or null",
  "expiresAt": "YYYY-MM-DD or null",
  "confidence": 0.0-1.0
}`;
```

### 4.4 Background Job System

**Recommendation:** Implement a lightweight job queue using one of:

**Option A: Vercel Cron + Database Queue (Simple)**
- Store jobs in `CredentialParsingJob` table
- Use Vercel Cron to process queue every minute
- Pros: No new dependencies, works on Vercel
- Cons: Not real-time, limited concurrency

**Option B: Inngest (Recommended)**
- Serverless job queue with retries
- Native Next.js integration
- Pros: Reliable, observable, free tier
- Cons: External dependency

**Option C: BullMQ + Redis**
- Use existing Upstash Redis
- Most robust solution
- Pros: Full-featured, battle-tested
- Cons: More complex setup

**Implementation Plan:** Start with Option A (cron + DB queue), migrate to Inngest in Phase 2.

---

## 5. Agent Tools for Conversational AI

### 5.1 Tool Definitions

Create a set of **function calling** compatible tools that any LLM (Claude, GPT-4, etc.) can invoke.

**File:** `/src/lib/agentTools/credentialTools.ts`

```typescript
export const credentialAgentTools = [
  {
    name: "search_credentials",
    description: "Search for employee credentials with filters",
    parameters: {
      type: "object",
      properties: {
        agencyId: { type: "string", required: true },
        status: {
          type: "string",
          enum: ["active", "expiring_soon", "expired", "missing", "pending_review"]
        },
        credentialType: { type: "string" },
        employeeName: { type: "string" },
        expiringBefore: { type: "string", format: "date" },
        department: { type: "string" }
      }
    }
  },

  {
    name: "get_employee_credentials",
    description: "Get all credentials for a specific employee",
    parameters: {
      type: "object",
      properties: {
        agencyId: { type: "string", required: true },
        employeeId: { type: "string", required: true }
      }
    }
  },

  {
    name: "get_compliance_summary",
    description: "Get agency-wide compliance statistics",
    parameters: {
      type: "object",
      properties: {
        agencyId: { type: "string", required: true },
        windowDays: { type: "number", default: 30 },
        department: { type: "string" }
      }
    }
  },

  {
    name: "send_credential_reminders",
    description: "Send reminders for credentials matching criteria",
    parameters: {
      type: "object",
      properties: {
        agencyId: { type: "string", required: true },
        filters: {
          type: "object",
          properties: {
            status: { type: "string" },
            credentialType: { type: "string" }
          }
        },
        channel: { type: "string", enum: ["email", "sms"], default: "email" }
      }
    }
  },

  {
    name: "create_credential_requirement",
    description: "Create a missing credential requirement for an employee",
    parameters: {
      type: "object",
      properties: {
        agencyId: { type: "string", required: true },
        employeeId: { type: "string", required: true },
        credentialTypeId: { type: "string", required: true }
      }
    }
  },

  {
    name: "update_credential",
    description: "Update credential metadata manually",
    parameters: {
      type: "object",
      properties: {
        agencyId: { type: "string", required: true },
        credentialId: { type: "string", required: true },
        updates: {
          type: "object",
          properties: {
            issuer: { type: "string" },
            licenseNumber: { type: "string" },
            issueDate: { type: "string", format: "date" },
            expirationDate: { type: "string", format: "date" }
          }
        }
      }
    }
  }
];
```

### 5.2 Tool Implementation

Each tool is a thin wrapper around service layer logic with:
- Authentication enforcement
- Input validation
- Error handling
- Audit logging

**File:** `/src/lib/agentTools/credentialToolHandlers.ts`

```typescript
export async function executeCredentialTool(
  toolName: string,
  params: any,
  context: { userId: string; agencyId: string }
): Promise<any> {
  // Validate user has access to agency
  await verifyAgencyAccess(context.userId, context.agencyId);

  // Route to appropriate handler
  switch (toolName) {
    case "search_credentials":
      return await searchCredentials(params, context);
    case "get_employee_credentials":
      return await getEmployeeCredentials(params, context);
    // ... etc
  }

  throw new Error(`Unknown tool: ${toolName}`);
}
```

### 5.3 Agent API Endpoint

**File:** `/src/app/api/agent/credentials/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Authenticate
  const { user, agency } = await requireAgency();

  // Parse request
  const { toolName, parameters } = await request.json();

  // Execute tool
  const result = await executeCredentialTool(
    toolName,
    parameters,
    { userId: user.id, agencyId: agency.id }
  );

  // Log for audit
  await logAuditEvent('agent_tool_executed', {
    toolName,
    parameters: sanitizeForLog(parameters),
  });

  return NextResponse.json({ success: true, result });
}
```

### 5.4 Conversational Agent Integration

**Example: Claude Integration**

```typescript
// In chatbot handler
const messages = [...conversationHistory];
const tools = credentialAgentTools;

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages,
  tools,
  max_tokens: 4096,
});

// Handle tool calls
if (response.stop_reason === 'tool_use') {
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const result = await executeCredentialTool(
        block.name,
        block.input,
        { userId: user.id, agencyId: agency.id }
      );

      // Continue conversation with tool result
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        }]
      });
    }
  }
}
```

---

## 6. HR System Integration Design

### 6.1 Data Export Format

**Standard Credential Export Schema:**

```typescript
interface CredentialExportRow {
  // Employee identifiers
  employeeId: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;

  // Credential details
  credentialType: string;
  credentialId: string;

  // Dates
  issueDate: string | null;      // YYYY-MM-DD
  expirationDate: string | null;

  // Status
  status: 'active' | 'expiring_soon' | 'expired' | 'missing';
  daysUntilExpiry: number | null;
  isCompliant: boolean;

  // Verification
  issuer: string | null;
  licenseNumber: string | null;
  verificationUrl: string | null;

  // Metadata
  lastReviewedAt: string | null;
  lastReviewedBy: string | null;
  uploadedAt: string;

  // Agency context
  department: string | null;
  position: string | null;
}
```

### 6.2 Export Endpoints

```typescript
// CSV Export
GET /api/integrations/credentials/export.csv
Query: ?status=active&updatedSince=2024-01-01&includeArchived=false
Headers: Authorization: Bearer {apiKey}
Returns: CSV file download

// JSON Export
GET /api/integrations/credentials/export.json
Returns: { data: CredentialExportRow[], generatedAt: string, totalRecords: number }

// Excel Export (using xlsx library)
GET /api/integrations/credentials/export.xlsx
Returns: Excel workbook with multiple sheets (Overview, By Employee, By Type)
```

### 6.3 Webhook System

**Outbound Webhooks for External Systems:**

```prisma
model WebhookSubscription {
  id          String   @id @default(uuid())
  agencyId    String
  agency      Agency   @relation(...)

  url         String   // Endpoint to POST to
  events      String[] // ["credential.updated", "credential.expiring", ...]
  secret      String   // For signature verification
  isActive    Boolean  @default(true)

  lastTriggeredAt DateTime?
  failureCount    Int @default(0)

  createdBy   String
  createdAt   DateTime @default(now())
}

model WebhookDelivery {
  id            String   @id @default(uuid())
  subscriptionId String

  event         String   // Event type
  payload       Json     // Data sent
  responseCode  Int?     // HTTP status
  responseBody  String?  @db.Text

  attemptedAt   DateTime @default(now())
  succeededAt   DateTime?
  failedAt      DateTime?
  error         String?  @db.Text

  retryCount    Int      @default(0)

  @@index([subscriptionId, attemptedAt])
}
```

**Events to Emit:**
- `credential.created`
- `credential.updated`
- `credential.approved`
- `credential.rejected`
- `credential.expiring` (7 days before)
- `credential.expired`
- `employee.non_compliant`
- `agency.compliance_summary` (daily/weekly)

### 6.4 API Key Management

```prisma
model ApiKey {
  id          String   @id @default(uuid())
  agencyId    String
  agency      Agency   @relation(...)

  name        String   // "BambooHR Integration", "Payroll Sync"
  key         String   @unique  // Hashed
  keyPrefix   String   // First 8 chars for identification (e.g., "ak_live_12345678")

  permissions String[] // ["read:credentials", "write:credentials", ...]

  lastUsedAt  DateTime?
  expiresAt   DateTime?

  createdBy   String
  createdAt   DateTime @default(now())
  revokedAt   DateTime?
}
```

### 6.5 Common HR System Mappings

**Field Mapping Guide:**

| Our System | BambooHR | Gusto | Paychex | ADP |
|------------|----------|-------|---------|-----|
| employeeNumber | employeeNumber | id | employee_number | associateOID |
| credentialType | customField_credentialType | custom_field | certification_type | certificationName |
| licenseNumber | customField_licenseNumber | license_number | license_id | certificationNumber |
| expirationDate | customField_expiryDate | expiration_date | expiration_date | expirationDate |
| issuer | customField_issuer | issuing_authority | issuer | issuingOrganization |

**Implementation:** Store mapping configuration in agency settings:

```prisma
model Agency {
  // ... existing fields ...

  hrSystemConfig Json? // { provider: "bamboohr", fieldMappings: {...}, syncEnabled: true }
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Extend data model and basic CRUD APIs

1. **Database Schema**
   - Add credential-specific fields to `EmployeeDocument`
   - Create `CredentialReminder` model
   - Create `ComplianceSnapshot` model
   - Add indexes for performance
   - Write and run migrations

2. **Service Layer**
   - `/src/lib/credentialHelpers.ts` - Core business logic
     - Status calculation
     - Compliance checking
     - Reminder scheduling logic
   - `/src/lib/credentialValidation.ts` - Input validation schemas
   - Extend `/src/lib/documentHelpers.ts` with credential methods

3. **Employee APIs**
   - `POST /api/employee/credentials/upload` - Upload credential document
   - `GET /api/employee/credentials` - List my credentials
   - `GET /api/employee/credentials/:id` - Get specific credential

4. **Testing**
   - Unit tests for service layer
   - Integration tests for APIs
   - Test data seeding

**Deliverables:**
- ✅ Migrations applied
- ✅ Basic upload/retrieve working
- ✅ Tests passing
- ✅ API documentation

---

### Phase 2: AI Parsing Pipeline (Week 2)
**Goal:** Implement intelligent document extraction

1. **OCR Integration**
   - `/src/lib/ocr.ts` - OCR provider abstraction
   - Implement AWS Textract integration
   - Add Tesseract.js fallback
   - PDF text extraction (using pdf-parse library)

2. **LLM Extraction**
   - `/src/lib/credentialParser.ts` - Core parsing logic
   - OpenAI GPT-4 integration for metadata extraction
   - Confidence scoring
   - Prompt engineering and testing

3. **Job Queue**
   - Implement database-backed job queue
   - `CredentialParsingJob` model
   - `/src/lib/jobQueue.ts` - Queue management
   - Vercel Cron handler to process queue
   - Retry logic and error handling

4. **Integration**
   - Update upload handler to enqueue parsing jobs
   - Create `/api/internal/credentials/parse` endpoint
   - Implement status webhooks for real-time updates

**Deliverables:**
- ✅ OCR working for images
- ✅ LLM extraction with >80% accuracy
- ✅ Async job processing
- ✅ Parsed data saved to database

---

### Phase 3: Admin Features (Week 3)
**Goal:** Compliance dashboard and management tools

1. **Admin APIs**
   - `GET /api/admin/credentials/dashboard` - Overview statistics
   - `GET /api/admin/credentials/search` - Advanced filtering
   - `PATCH /api/admin/credentials/:id/review` - Review workflow
   - `POST /api/admin/credentials/bulk-remind` - Bulk reminders

2. **Compliance Reporting**
   - `/src/lib/complianceReporting.ts` - Report generation
   - Snapshot creation logic
   - Aggregation queries (by type, department, status)
   - Export to CSV/JSON

3. **Review Workflow**
   - Admin can approve/reject parsed data
   - Manual correction interface
   - Audit trail for all reviews

4. **Email Notifications**
   - Extend `/src/lib/email.ts` with credential templates
   - Expiration reminders
   - Missing credential notifications
   - Admin compliance alerts

**Deliverables:**
- ✅ Dashboard API returning real data
- ✅ Review workflow functional
- ✅ Email templates tested
- ✅ CSV export working

---

### Phase 4: Agent Tools (Week 4)
**Goal:** Conversational AI capabilities

1. **Agent Tool Framework**
   - `/src/lib/agentTools/credentialTools.ts` - Tool definitions
   - `/src/lib/agentTools/credentialToolHandlers.ts` - Implementations
   - Input validation and sanitization
   - Error handling for LLM context

2. **Agent API**
   - `POST /api/agent/credentials` - Execute agent tools
   - Authentication and authorization
   - Rate limiting for LLM usage
   - Audit logging

3. **Chatbot Integration**
   - Extend existing chatbot to support credential queries
   - Add tool calling to conversation flow
   - Context management for multi-turn dialogs

4. **Testing & Documentation**
   - Test with Claude/GPT-4 function calling
   - Create example conversations
   - Document tool usage patterns

**Deliverables:**
- ✅ 6 agent tools functional
- ✅ Chatbot can answer credential questions
- ✅ Tool execution logged
- ✅ Example prompts documented

---

### Phase 5: Integration & Export (Week 5)
**Goal:** Enable HR system compatibility

1. **Export/Import System**
   - `/src/lib/credentialExport.ts` - Export and import logic
   - CSV export with standard schema
   - JSON export API
   - Excel export/import (using xlsx library)

2. **Integration APIs**
   - `GET /api/integrations/credentials/export.{csv,json,xlsx}`
   - API key authentication
   - Rate limiting
   - Documentation for external developers

3. **Webhook System**
   - `WebhookSubscription` and `WebhookDelivery` models
   - `/src/lib/webhooks.ts` - Webhook dispatcher
   - Signature verification
   - Retry logic with exponential backoff
   - Admin UI to manage subscriptions

4. **Field Mapping Configuration**
   - Agency settings for HR system type
   - Custom field mappings
   - Transformation logic for common providers

**Deliverables:**
- ✅ Export APIs functional
- ✅ Webhook system operational
- ✅ Sample integrations documented
- ✅ Field mapping guide

---

### Phase 6: Background Jobs & Polish (Week 6)
**Goal:** Automation and production readiness

1. **Automated Reminders**
   - Cron job: Daily credential expiration check
   - Automatic email dispatch based on `reminderDays`. use same email setup as we do for the marketplace
   - Track reminder history in `CredentialReminder` table
   - Agency-level reminder preferences

2. **Compliance Snapshots**
   - Weekly automated snapshot generation
   - Historical trend tracking
   - Month-over-month compliance reporting

3. **Performance Optimization**
   - Add database indexes
   - Optimize complex queries
   - Implement result caching (Redis)
   - Query pagination for large datasets

4. **Security Hardening**
   - Audit all endpoints for RBAC
   - Add rate limiting to sensitive endpoints
   - Implement CSRF protection
   - Sensitive data encryption (license numbers)

5. **Documentation**
   - API reference (OpenAPI/Swagger)
   - Integration guides for common HR systems
   - Admin user manual
   - Employee user guide

**Deliverables:**
- ✅ Automated reminders running
- ✅ Performance benchmarks met
- ✅ Security audit passed
- ✅ Documentation complete

---

## 8. Technical Decisions

### 8.1 Why Extend Existing Models?

**Decision:** Extend `EmployeeDocument` rather than create separate `Credential` model.

**Rationale:**
- Existing document system already handles 90% of requirements
- Avoids code duplication
- Maintains consistency in file storage patterns
- Leverages existing multi-tenancy and RBAC
- Easier migration path for existing documents

**Trade-off:** Model becomes slightly more complex, but we mitigate with clear field naming and documentation.

### 8.2 OCR Provider Selection

**Decision:** AWS Textract as primary, Tesseract.js as fallback.

**Rationale:**
- Already using AWS infrastructure (S3, SES)
- Textract excels at form extraction (common in licenses)
- Tesseract.js provides zero-cost fallback
- Both integrate easily with S3

**Alternative Considered:** Google Cloud Vision (good OCR, but adds GCP dependency)

### 8.3 Job Queue Strategy

**Decision:** Start with database-backed queue + Vercel Cron, migrate to Inngest later.

**Rationale:**
- Quick to implement (no new infrastructure)
- Works on current deployment (Railway/Vercel)
- PostgreSQL handles low-medium job volume
- Easy migration path when scale demands it

**Future Migration:** When processing >1000 documents/day, switch to Inngest or BullMQ.

### 8.4 LLM Choice

**Decision:** OpenAI GPT-4 Turbo for extraction.

**Rationale:**
- Already integrated and working
- Excellent at structured extraction
- Function calling support
- Consistent with existing RAG chatbot

**Future Enhancement:** Add Claude support for comparison and fallback.

### 8.5 Agent Tool Pattern

**Decision:** Function-calling compatible JSON schema + thin wrappers.

**Rationale:**
- Works with Claude, GPT-4, and other modern LLMs
- Separates tool definition from implementation
- Easy to test and version
- Standard format for API documentation

---

## 9. Security Considerations

### 9.1 Access Control

**Rules:**
1. **Employee Level:**
   - Can view their own credentials
   - Can upload documents for themselves
   - Cannot view other employees' credentials
   - Cannot approve/reject documents

2. **Agency Admin Level:**
   - Can view all credentials in their agency
   - Can approve/reject documents
   - Can send reminders
   - Can export reports
   - Cannot access other agencies

3. **Platform Admin Level:**
   - Can view all agencies
   - Can manage system-wide credential types
   - Can audit all operations
   - Cannot approve credentials (must be agency admin)

### 9.2 Data Protection

**Sensitive Fields:**
- License numbers → Consider encryption at rest
- Issuer information → PII in some cases
- Document files → Already secured via S3 presigned URLs

**Recommendations:**
1. Implement field-level encryption for `licenseNumber`
2. Audit all access to credential documents
3. Automatic document purging after employee termination (configurable retention)
4. HIPAA compliance audit logging (already exists)

### 9.3 API Security

**Measures:**
1. **Rate Limiting:**
   - Upload: 10 per minute per user
   - Export: 5 per hour per agency
   - Agent tools: 30 per minute per agency

2. **Input Validation:**
   - Strict Zod schemas for all inputs
   - File type and size restrictions
   - Filename sanitization

3. **Authentication:**
   - NextAuth session required for web APIs
   - API key authentication for integrations
   - Key rotation enforcement (90-day expiry)

4. **CSRF Protection:**
   - Use existing CSRF middleware
   - Token validation on all mutations

---

## 10. Compatibility Matrix

### 10.1 HR/HRIS Systems

| System | Integration Type | Effort | Priority |
|--------|------------------|--------|----------|
| **BambooHR** | REST API + Webhooks | Medium | High |
| **Gusto** | REST API | Medium | High |
| **Paychex** | SFTP + CSV | Low | Medium |
| **ADP Workforce Now** | REST API | High | Medium |
| **Rippling** | REST API | Medium | Low |
| **Generic CSV** | File Export | Low | High |

### 10.2 Export Formats

**Supported:**
1. **CSV** - Universal compatibility
   - Standard schema
   - Custom field selection
   - Date format options (US vs ISO)

2. **JSON** - API integrations
   - Nested structure support
   - Metadata rich
   - Versioned schema

3. **Excel (XLSX)** - Business reporting
   - Multiple sheets (overview, details, trends)
   - Formatted cells (colors for statuses)
   - Charts and summaries

### 10.3 Standard Field Mappings

**Core Employee Fields:**
```
employeeId → employee_id, worker_id, associate_id
firstName → first_name, given_name
lastName → last_name, family_name, surname
email → email, email_address, work_email
employeeNumber → employee_number, employee_code, badge_id
```

**Credential Fields:**
```
credentialType → certification_name, license_type, credential_name
licenseNumber → license_number, certification_id, credential_id
expirationDate → expiration_date, expiry_date, valid_until
issuer → issuing_authority, certifying_body, provider
```

---

## 11. Metrics & Monitoring

### 11.1 Key Metrics to Track

**Operational Metrics:**
- Documents uploaded per day/week
- Parsing success rate (confidence > 0.7)
- Average parsing time
- Manual review rate
- Reminder delivery rate

**Compliance Metrics:**
- Agency compliance rate (% of valid credentials)
- Credentials expiring in next 30 days
- Overdue credentials by type
- Time to renewal (from reminder to upload)
- Non-compliant employees by department

**Usage Metrics:**
- Agent tool invocations per day
- Most common credential queries
- Export frequency by format
- API key usage by integration

### 11.2 Alerting

**Critical Alerts:**
- Parsing failure rate >20% (indicates OCR/LLM issues)
- Agency compliance rate drops below 80%
- S3 upload failures
- Email delivery failures

**Warning Alerts:**
- >50 credentials expiring in next 7 days (per agency)
- Manual review queue >100 items
- API error rate >5%
- Job queue backlog >500 items

---

## 12. Testing Strategy

### 12.1 Unit Tests

**Service Layer:**
- `credentialHelpers.ts` - Status calculation logic
- `credentialParser.ts` - Parsing logic (mocked LLM)
- `complianceReporting.ts` - Aggregation logic
- `agentTools/credentialToolHandlers.ts` - Tool execution

**Coverage Target:** >90% for business logic

### 12.2 Integration Tests

**API Endpoints:**
- Employee credential upload flow
- Admin review workflow
- Compliance dashboard queries
- Export generation
- Agent tool execution

**Test Data:**
- Seed multiple agencies with employees
- Various credential types
- Different status states (active, expiring, expired)

### 12.3 E2E Tests

**Critical Flows:**
1. New employee onboarding → upload credentials → admin review → approved
2. Credential expiring → automatic reminder → employee uploads → auto-parsed
3. Admin exports compliance report → downloads CSV → validates data
4. Conversational agent query → "Who's non-compliant?" → returns results

### 12.4 AI Parsing Tests

**Test Set:**
- 20+ sample credential documents (various types)
- Known ground truth metadata
- Measure: precision, recall, confidence distribution
- Iterate on prompt engineering to improve accuracy

**Acceptance Criteria:**
- >85% field extraction accuracy
- >90% correct credential type identification
- <10% false positives (hallucinated data)

---

## 13. Migration Plan

### 13.1 Existing Data

**Current State:**
- `DocumentType` records exist (may be credentials already)
- `EmployeeDocument` records exist (some are credentials)

**Migration Steps:**
1. **Identify Credential Documents:**
   ```sql
   SELECT dt.name, COUNT(*) as count
   FROM "DocumentType" dt
   JOIN "EmployeeDocument" ed ON ed."documentTypeId" = dt.id
   WHERE dt.name ILIKE ANY (ARRAY['%license%', '%certification%', '%cpr%', '%rn%', '%cna%'])
   GROUP BY dt.name;
   ```

2. **Backfill New Fields:**
   ```sql
   UPDATE "EmployeeDocument"
   SET
     "reviewStatus" = 'APPROVED',  -- Assume existing docs are approved
     "isCompliant" = CASE
       WHEN "expirationDate" IS NULL THEN false
       WHEN "expirationDate" > NOW() THEN true
       ELSE false
     END
   WHERE "documentTypeId" IN (SELECT id FROM "DocumentType" WHERE [credential types]);
   ```

3. **Trigger Parsing for Existing Documents:**
   - Create batch job to re-process documents
   - Extract metadata retroactively
   - Don't overwrite existing issueDate/expirationDate if set

### 13.2 Rollback Plan

**If critical issues arise:**

1. **Schema Rollback:**
   - New columns are nullable → safe to rollback migration
   - New tables can be dropped without affecting existing data

2. **Code Rollback:**
   - Feature behind environment flag
   - Disable with `FEATURE_CREDENTIALS_ENABLED=false`
   - Existing document system continues to work

3. **Data Recovery:**
   - All changes logged in audit trail
   - Can reconstruct state from logs if needed

---

## 14. Documentation Deliverables

### 14.1 Technical Documentation

1. **API Reference** (`/docs/api/credentials.md`)
   - OpenAPI/Swagger spec
   - Request/response examples
   - Error codes
   - Rate limits

2. **Integration Guide** (`/docs/integrations/hr-systems.md`)
   - BambooHR setup
   - Gusto setup
   - Generic CSV import
   - Webhook configuration
   - API key management

3. **Agent Tools Reference** (`/docs/agent-tools.md`)
   - Function signatures
   - Example conversations
   - Best practices for prompt engineering

### 14.2 User Documentation

1. **Admin Guide** (`/docs/users/admin-credential-management.md`)
   - Setting up credential types
   - Reviewing uploaded documents
   - Sending reminders
   - Generating reports
   - Interpreting compliance dashboard

2. **Employee Guide** (`/docs/users/employee-credentials.md`)
   - How to upload credentials
   - Supported document formats
   - Understanding credential status
   - Renewal process

### 14.3 Development Documentation

1. **Architecture Decision Records** (`/docs/adr/`)
   - ADR-001: Why extend EmployeeDocument
   - ADR-002: OCR provider selection
   - ADR-003: Job queue strategy
   - ADR-004: Agent tool patterns

2. **Runbook** (`/docs/runbooks/credential-system.md`)
   - Common troubleshooting
   - Manual parsing retry
   - Reminder job debugging
   - Database maintenance

---

## 15. Success Criteria

### 15.1 Functional Requirements

- ✅ Employees can upload credentials with <3 clicks
- ✅ 85%+ of documents auto-parsed correctly
- ✅ Admins see real-time compliance dashboard
- ✅ Automated reminders sent 30 & 7 days before expiry
- ✅ Conversational agent answers common queries
- ✅ CSV export compatible with Excel/BambooHR

### 15.2 Performance Requirements

- ✅ Upload completes in <5 seconds
- ✅ Parsing completes in <30 seconds
- ✅ Dashboard loads in <2 seconds
- ✅ Export generates in <10 seconds for 1000 credentials
- ✅ Agent tool response in <3 seconds

### 15.3 Quality Requirements

- ✅ >90% test coverage for business logic
- ✅ Zero critical security vulnerabilities
- ✅ HIPAA audit logging for all PII access
- ✅ Graceful error handling (no crashes)
- ✅ Comprehensive API documentation

### 15.4 Business Requirements

- ✅ Reduces manual credential tracking time by 70%
- ✅ Increases compliance rate by 25%
- ✅ Supports 5+ major HR systems
- ✅ Agency onboarding time <1 hour
- ✅ <5% support ticket rate

---

## 16. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **OCR accuracy too low** | High | Medium | Multi-provider fallback, manual review workflow, continuous prompt engineering |
| **LLM hallucination** | High | Medium | Confidence thresholds, always require admin review for low confidence |
| **Job queue overwhelm** | Medium | Low | Rate limiting on uploads, queue monitoring, auto-scaling |
| **HIPAA violation** | Critical | Low | Comprehensive audit logging, access controls, legal review |
| **Integration complexity** | Medium | Medium | Start with generic export, add specific integrations incrementally |
| **Performance degradation** | Medium | Medium | Database indexes, query optimization, caching layer |
| **User adoption low** | High | Medium | Clear onboarding, in-app guidance, responsive support |

---

## 17. Future Enhancements (Post-MVP)

### Phase 7+: Advanced Features

1. **Mobile App:**
   - Employee credential wallet
   - Push notifications for expiring credentials
   - Mobile document scanning with auto-upload

2. **Credential Verification:**
   - Direct integration with state licensing boards
   - Automated verification checks
   - Real-time validation against official databases

3. **Training & Certification Marketplace:**
   - In-app course recommendations
   - Direct enrollment for expiring credentials
   - Partner with training providers

4. **Predictive Analytics:**
   - Predict which credentials will expire based on historical data
   - Recommend proactive renewal schedules
   - Identify employees at risk of non-compliance

5. **Advanced Reporting:**
   - Custom report builder
   - Scheduled report delivery
   - Trend analysis over time
   - Benchmarking against industry standards

6. **Multi-Language Support:**
   - OCR and parsing for Spanish, Portuguese, French credentials
   - Localized UI and notifications

7. **Blockchain Verification:**
   - Immutable credential ledger
   - Third-party verification without data sharing
   - Portable credential wallet

---

## Appendix A: File Structure

```
/Users/sandraabago/keka/marketplace/

prisma/
  schema.prisma                          # Extended with credential models
  migrations/
    YYYYMMDDHHMMSS_add_credential_fields/  # New migration

src/
  lib/
    credentialHelpers.ts                 # NEW: Core business logic
    credentialParser.ts                  # NEW: AI parsing pipeline
    credentialValidation.ts              # NEW: Input validation schemas
    complianceReporting.ts               # NEW: Report generation
    ocr.ts                               # NEW: OCR provider abstraction
    jobQueue.ts                          # NEW: Background job management
    webhooks.ts                          # NEW: Webhook dispatcher
    agentTools/
      credentialTools.ts                 # NEW: Tool definitions
      credentialToolHandlers.ts          # NEW: Tool implementations

  app/
    api/
      employee/
        credentials/
          route.ts                       # NEW: List/upload credentials
          [id]/
            route.ts                     # NEW: Get/update single credential

      admin/
        credentials/
          dashboard/route.ts             # NEW: Compliance overview
          search/route.ts                # NEW: Advanced search
          export/route.ts                # NEW: CSV/JSON/Excel export
          [id]/
            review/route.ts              # NEW: Review workflow
            remind/route.ts              # NEW: Send reminder
          bulk-remind/route.ts           # NEW: Bulk reminders
          bulk-import/route.ts           # NEW: Batch upload

      agent/
        credentials/route.ts             # NEW: Agent tool execution

      integrations/
        credentials/
          export.csv/route.ts            # NEW: CSV export
          export.json/route.ts           # NEW: JSON export
          export.xlsx/route.ts           # NEW: Excel export
          employees/[id]/route.ts        # NEW: Employee credentials API

      internal/
        credentials/
          parse/route.ts                 # NEW: Async parsing endpoint

      cron/
        process-parsing-jobs/route.ts    # NEW: Vercel Cron job
        send-reminders/route.ts          # NEW: Daily reminder job
        generate-snapshots/route.ts      # NEW: Weekly snapshot job

docs/
  api/
    credentials.md                       # NEW: API reference
  integrations/
    hr-systems.md                        # NEW: Integration guide
  agent-tools.md                         # NEW: Agent tools reference
  users/
    admin-credential-management.md       # NEW: Admin guide
    employee-credentials.md              # NEW: Employee guide
  adr/
    001-extend-employee-document.md      # NEW: ADR
  runbooks/
    credential-system.md                 # NEW: Runbook

tests/
  unit/
    credentialHelpers.test.ts            # NEW
    credentialParser.test.ts             # NEW
    complianceReporting.test.ts          # NEW
  integration/
    credentialApis.test.ts               # NEW
  e2e/
    credential-workflow.test.ts          # NEW
```

---

## Appendix B: Database Schema Changes

See `CREDENTIAL_AGENT_SCHEMA.sql` for complete DDL.

Key additions:
- `EmployeeDocument` - 12 new columns
- `CredentialReminder` - New table (8 columns)
- `ComplianceSnapshot` - New table (11 columns)
- `WebhookSubscription` - New table (9 columns)
- `WebhookDelivery` - New table (11 columns)
- `ApiKey` - New table (10 columns)
- `CredentialParsingJob` - New table (9 columns)
- `Agency` - 3 new columns

Total new/modified tables: 8
Total new indexes: 12

---

## Appendix C: Environment Variables

New environment variables required:

```bash
# OCR Provider
OCR_PROVIDER=aws              # or 'tesseract'
AWS_TEXTRACT_REGION=us-east-1 # Already have AWS creds

# Feature Flags
FEATURE_CREDENTIALS_ENABLED=true
FEATURE_AUTO_PARSING_ENABLED=true
FEATURE_AGENT_TOOLS_ENABLED=true

# LLM Configuration (reuse existing OpenAI)
OPENAI_API_KEY=sk-...         # Already configured
CREDENTIAL_PARSING_MODEL=gpt-4-turbo

# Job Queue
JOB_QUEUE_ENABLED=true
JOB_QUEUE_CONCURRENCY=5       # Parallel parsing jobs

# Webhooks
WEBHOOK_TIMEOUT_MS=5000
WEBHOOK_MAX_RETRIES=3

# Compliance
DEFAULT_WARNING_DAYS=30       # Days before expiry to warn
REMINDER_FREQUENCY=WEEKLY     # or DAILY
```

---

## Appendix D: Cost Estimates

**Monthly costs for typical agency (50 employees, 200 credentials):**

| Service | Usage | Cost |
|---------|-------|------|
| **AWS S3** | 200 files × 2MB, 1000 downloads | $0.05 |
| **AWS Textract** | 50 new docs/month | $7.50 |
| **OpenAI GPT-4** | 50 parsing calls, 500 tokens ea | $1.00 |
| **OpenAI Embeddings** | Minimal for agent queries | $0.10 |
| **AWS SES** | 200 reminder emails | $0.02 |
| **Pinecone** | Existing plan (no change) | $0.00 |
| **PostgreSQL** | Database storage +5GB | $0.00 |
| **Total** | | **$8.67** |

**Scaling to 500 employees, 2000 credentials:**
- AWS Textract: $75/month (500 docs)
- OpenAI: $10/month
- Total: ~$87/month

**Cost optimization strategies:**
1. Cache parsed results to avoid re-processing
2. Use Tesseract for simple documents (free)
3. Batch OCR requests
4. Compress stored images

---

This architecture provides a solid foundation for an AI-powered credential tracking system that:
- ✅ Extends existing patterns
- ✅ Maintains security and compliance
- ✅ Enables HR system integration
- ✅ Supports conversational AI
- ✅ Scales with agency growth
- ✅ Delivers measurable ROI

Next step: **User confirmation to proceed with implementation**.
