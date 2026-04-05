# Security Implementation Guide

This guide provides step-by-step instructions for implementing and integrating the security infrastructure into your application.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Audit Logging Integration](#audit-logging-integration)
3. [Data Encryption Integration](#data-encryption-integration)
4. [Rate Limiting Configuration](#rate-limiting-configuration)
5. [CSRF Protection Integration](#csrf-protection-integration)
6. [Input Validation Integration](#input-validation-integration)
7. [Testing & Verification](#testing--verification)
8. [Deployment Checklist](#deployment-checklist)

---

## Environment Setup

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Generate Required Secrets

**NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

**ENCRYPTION_KEY (64 hex characters):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Essential Variables

Edit `.env` and set at minimum:
```env
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_SECRET="your-generated-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="your-generated-64-char-hex-key"
```

### 4. Validate Environment

Add to your `src/app/layout.tsx` or application entry point:

```typescript
import { validateEnvOrThrow } from '@/lib/env';

// Validate environment at startup (server-side only)
if (typeof window === 'undefined') {
  validateEnvOrThrow();
}
```

---

## Audit Logging Integration

### Usage Examples

**1. Log User Login:**
```typescript
import { logAuditEvent, getRequestMetadata } from '@/lib/auditLog';

// In your authentication route
export async function POST(request: Request) {
  const metadata = getRequestMetadata(request);

  // After successful authentication
  await logAuditEvent(
    'user_login',
    {
      userId: user.id,
      agencyId: user.agencyId,
      success: true,
    },
    metadata
  );
}
```

**2. Log Agency Creation:**
```typescript
import { logAuditEvent } from '@/lib/auditLog';

// In your agency creation endpoint
const newAgency = await prisma.agency.create({ data: agencyData });

await logAuditEvent(
  'agency_created',
  {
    agencyId: newAgency.id,
    userId: session.user.id,
    agencyName: newAgency.agencyName,
  },
  getRequestMetadata(request)
);
```

**3. Log Chatbot Query:**
```typescript
await logAuditEvent(
  'query_executed',
  {
    agencyId: query.agencyId,
    queryLength: query.query.length,
    tokensUsed: response.tokensUsed,
    modelUsed: 'gpt-4',
  },
  getRequestMetadata(request)
);
```

**4. Log Subscription Changes:**
```typescript
await logAuditEvent(
  'subscription_updated',
  {
    agencyId: agency.id,
    userId: session.user.id,
    changes: {
      oldPlan: agency.subscriptionPlan,
      newPlan: newPlan,
    },
  },
  getRequestMetadata(request)
);
```

**5. Query Audit Logs:**
```typescript
import { queryAuditLogs } from '@/lib/auditLog';

// Get recent events for an agency
const logs = await queryAuditLogs({
  agencyId: 'agency-uuid',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  limit: 100,
});
```

---

## Data Encryption Integration

### Encrypting Data Before Storage

**Example: Encrypt sensitive agency fields:**
```typescript
import { encrypt, encryptFields } from '@/lib/encryption';
import { prisma } from '@/lib/db';

// Option 1: Encrypt individual fields
const encryptedPhone = encrypt(agencyData.primaryContactPhone);

const agency = await prisma.agency.create({
  data: {
    ...agencyData,
    primaryContactPhone: encryptedPhone,
    licenseNumber: encrypt(agencyData.licenseNumber),
  },
});

// Option 2: Encrypt multiple fields at once
const sensitiveData = {
  primaryContactPhone: '+1234567890',
  licenseNumber: 'MA-HCBS-12345',
  notes: 'Confidential notes',
};

const encrypted = encryptFields(sensitiveData, [
  'primaryContactPhone',
  'licenseNumber',
  'notes',
]);

const agency = await prisma.agency.create({
  data: {
    ...otherData,
    ...encrypted,
  },
});
```

### Decrypting Data After Retrieval

```typescript
import { decrypt, decryptFields } from '@/lib/encryption';

// Retrieve agency
const agency = await prisma.agency.findUnique({
  where: { id: agencyId },
});

// Option 1: Decrypt individual fields
const decryptedPhone = decrypt(agency.primaryContactPhone);

// Option 2: Decrypt multiple fields
const decrypted = decryptFields(agency, [
  'primaryContactPhone',
  'licenseNumber',
  'notes',
]);

// Return decrypted data to user
return {
  ...agency,
  ...decrypted,
};
```

### Testing Encryption

```typescript
import { testEncryption, isEncryptionConfigured } from '@/lib/encryption';

// Check if encryption is configured
if (!isEncryptionConfigured()) {
  console.error('ENCRYPTION_KEY not configured!');
}

// Test encryption/decryption
if (!testEncryption()) {
  console.error('Encryption test failed!');
}
```

---

## Rate Limiting Configuration

### 1. Setup Upstash Redis

1. Sign up at https://console.upstash.com/
2. Create a Redis database
3. Copy REST URL and Token to `.env`:
```env
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### 2. Middleware Integration

The middleware is already configured in `/Users/sandraabago/keka/marketplace/src/middleware.ts`.

### 3. Custom Rate Limiting in API Routes

```typescript
import { chatbotRateLimit, getIP, checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const ip = getIP(request);
  const result = await checkRateLimit(chatbotRateLimit, ip);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Process request
}
```

### 4. Rate Limit Different Identifiers

```typescript
// Rate limit by user ID
const result = await checkRateLimit(generalRateLimit, session.user.id);

// Rate limit by agency ID
const result = await checkRateLimit(agencyRateLimit, agency.id);

// Rate limit by IP + user ID combination
const identifier = `${ip}:${userId}`;
const result = await checkRateLimit(generalRateLimit, identifier);
```

---

## CSRF Protection Integration

### 1. Generate Token for Forms

```typescript
import { generateCSRFToken } from '@/lib/csrf';

// In your page component
export default async function SettingsPage() {
  const csrfToken = generateCSRFToken(session?.sessionId);

  return (
    <form action="/api/settings" method="POST">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {/* Rest of form */}
    </form>
  );
}
```

### 2. Verify Token in API Route

```typescript
import { checkCSRFToken } from '@/lib/csrf';

export async function POST(request: Request) {
  const session = await getServerSession();

  // Check CSRF token
  const csrfError = await checkCSRFToken(request, session?.sessionId);
  if (csrfError) {
    return csrfError; // Returns 403 error response
  }

  // Process request
}
```

### 3. CSRF Token in Headers

```typescript
// Client-side: Send token in header
const response = await fetch('/api/sensitive-action', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

### 4. Protected Operations

Use CSRF protection for:
- Subscription changes
- User account deletion
- Payment processing
- Agency settings updates
- Password changes
- Email changes

---

## Input Validation Integration

### 1. Validate Request Body

```typescript
import { validateRequestBody, CreateAgencySchema } from '@/lib/validation';

export async function POST(request: Request) {
  // Validate input
  const validation = await validateRequestBody(request, CreateAgencySchema);

  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: 'Validation failed',
        errors: validation.errors,
      }),
      { status: 400 }
    );
  }

  // Use validated data
  const agency = await prisma.agency.create({
    data: validation.data,
  });

  return Response.json(agency);
}
```

### 2. Validate Query Parameters

```typescript
import { validateQueryParams, PaginationSchema } from '@/lib/validation';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const validation = validateQueryParams(url, PaginationSchema);

  if (!validation.success) {
    return new Response(
      JSON.stringify({ errors: validation.errors }),
      { status: 400 }
    );
  }

  const { page, limit } = validation.data;
  // Use validated pagination
}
```

### 3. Create Custom Schemas

```typescript
import { z } from 'zod';

const CustomSchema = z.object({
  field1: z.string().min(1).max(100),
  field2: z.number().int().min(0),
  field3: z.enum(['option1', 'option2']),
  field4: z.boolean().optional(),
});

// Use with validation
const validation = await validateRequestBody(request, CustomSchema);
```

### 4. Sanitize User Input

```typescript
import { sanitizeHTML, sanitizeFilename, sanitizeRedirectURL } from '@/lib/validation';

// Sanitize HTML content
const cleanHTML = sanitizeHTML(userProvidedHTML);

// Sanitize filename for uploads
const safeFilename = sanitizeFilename(uploadedFile.name);

// Validate redirect URL
const safeRedirect = sanitizeRedirectURL(
  userProvidedURL,
  ['keka.health', 'staging.keka.health']
);
if (!safeRedirect) {
  // Invalid redirect URL
}
```

---

## Testing & Verification

### 1. Test Audit Logging

```typescript
// Test in development console
import { logAuditEvent } from '@/lib/auditLog';

await logAuditEvent('user_login', {
  userId: 'test-user',
  success: true,
}, { ip: '127.0.0.1' });

// Check database
SELECT * FROM "EventLog" ORDER BY "createdAt" DESC LIMIT 10;
```

### 2. Test Encryption

```bash
# In Node.js console or script
node -e '
const { encrypt, decrypt } = require("./src/lib/encryption");
const text = "test data 123";
const encrypted = encrypt(text);
console.log("Encrypted:", encrypted);
const decrypted = decrypt(encrypted);
console.log("Decrypted:", decrypted);
console.log("Match:", text === decrypted);
'
```

### 3. Test Rate Limiting

```bash
# Test with curl
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/chatbot \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}' \
    -w "Status: %{http_code}\n"
done

# Should see 429 after rate limit exceeded
```

### 4. Test CSRF Protection

```bash
# Without token (should fail)
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"setting":"value"}'

# With valid token (should succeed)
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: valid-token" \
  -d '{"setting":"value"}'
```

### 5. Test Input Validation

```bash
# Invalid input (should return 400)
curl -X POST http://localhost:3000/api/agency \
  -H "Content-Type: application/json" \
  -d '{"agencyName":"A"}' # Too short

# Valid input (should succeed)
curl -X POST http://localhost:3000/api/agency \
  -H "Content-Type: application/json" \
  -d '{"agencyName":"Valid Agency Name","licenseNumber":"MA-HCBS-12345",...}'
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured on production server
- [ ] ENCRYPTION_KEY set (64 hex characters)
- [ ] NEXTAUTH_SECRET set (32+ characters)
- [ ] Database connection string verified
- [ ] Redis/Upstash configured for rate limiting
- [ ] All dependencies installed (`npm install`)
- [ ] Database migrations run (`npm run db:migrate`)
- [ ] Build successful (`npm run build`)

### Security Verification

- [ ] Encryption test passes
- [ ] Environment validation passes
- [ ] Security headers configured
- [ ] HTTPS/TLS enabled on production
- [ ] Rate limiting functional
- [ ] Audit logging operational
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints

### Testing

- [ ] User authentication works
- [ ] Agency creation/update works
- [ ] Chatbot queries work
- [ ] Subscription changes work
- [ ] Email delivery works
- [ ] File uploads work
- [ ] All API endpoints return correct status codes
- [ ] Rate limits trigger correctly
- [ ] Audit logs being created

### Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Log aggregation set up
- [ ] Uptime monitoring configured
- [ ] Security alerts configured
- [ ] Backup verification
- [ ] Disaster recovery plan documented

### Documentation

- [ ] Team trained on security features
- [ ] Incident response plan reviewed
- [ ] Security contacts documented
- [ ] Compliance documentation complete
- [ ] API documentation updated

### Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Verify audit logs being created
- [ ] Test rate limiting in production
- [ ] Verify encryption working
- [ ] Check performance metrics
- [ ] Review security headers
- [ ] Test authentication flows
- [ ] Verify CSRF protection

---

## Common Issues & Solutions

### Issue: Encryption Key Not Set

**Error:** `ENCRYPTION_KEY environment variable is not set`

**Solution:**
```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
echo 'ENCRYPTION_KEY=your-generated-key' >> .env
```

### Issue: Rate Limiting Not Working

**Error:** Rate limits not enforced

**Solution:**
1. Check Upstash Redis configuration
2. Verify environment variables:
```env
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```
3. Test Redis connection

### Issue: CSRF Token Invalid

**Error:** `Invalid CSRF token`

**Solution:**
1. Ensure token is being generated and sent
2. Verify session ID matches
3. Check token hasn't expired (1 hour)
4. Clear token store: `clearAllTokens()`

### Issue: Validation Errors

**Error:** Input validation failing

**Solution:**
1. Review validation schema
2. Check request body format
3. Verify all required fields present
4. Check data types match schema

---

## Additional Resources

- [Audit Logging](/Users/sandraabago/keka/marketplace/src/lib/auditLog.ts)
- [Encryption Module](/Users/sandraabago/keka/marketplace/src/lib/encryption.ts)
- [Rate Limiting](/Users/sandraabago/keka/marketplace/src/lib/rateLimit.ts)
- [CSRF Protection](/Users/sandraabago/keka/marketplace/src/lib/csrf.ts)
- [Input Validation](/Users/sandraabago/keka/marketplace/src/lib/validation.ts)
- [Environment Config](/Users/sandraabago/keka/marketplace/src/lib/env.ts)
- [Security Documentation](/Users/sandraabago/keka/marketplace/SECURITY.md)
- [Compliance Documentation](/Users/sandraabago/keka/marketplace/COMPLIANCE.md)
- [Security Audit](/Users/sandraabago/keka/marketplace/SECURITY_AUDIT.md)

---

**Questions?** Contact security@keka.health
