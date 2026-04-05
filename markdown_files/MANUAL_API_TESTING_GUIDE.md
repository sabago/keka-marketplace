# Manual API Testing Guide - Credential System

## Prerequisites

Before testing, ensure:
1. ✅ Database is running and migrated
2. ✅ `.env` file configured with:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `S3_BUCKET_NAME`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
3. ✅ Server running: `npm run dev`
4. ✅ You have a test user account with employee profile

---

## Setup Test Data

### 1. Create Test Agency & User

```bash
# Run the admin creation script (modify for test agency)
npx tsx src/scripts/create-platform-admin.ts
```

Or manually in Prisma Studio:
```bash
npx prisma studio
```

Create:
1. **Agency** with:
   - agencyName: "Test Home Care Agency"
   - licenseNumber: "MA-TEST-12345"
   - credentialWarningDays: 30

2. **User** with:
   - email: "testemployee@test.com"
   - password: (hashed with bcrypt)
   - role: "AGENCY_USER"
   - agencyId: (link to agency above)

3. **Employee** with:
   - firstName: "Test"
   - lastName: "Employee"
   - userId: (link to user above)
   - agencyId: (link to agency)
   - status: "ACTIVE"

4. **DocumentType** (Global or Agency-specific):
   - name: "CPR Certification"
   - expirationDays: 730 (2 years)
   - reminderDays: [30, 7]
   - isRequired: true
   - isGlobal: true

---

## Authentication

### Get Auth Token

**Using curl:**
```bash
# Sign in to get session
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testemployee@test.com",
    "password": "your-password",
    "callbackUrl": "/dashboard"
  }' \
  -c cookies.txt

# Extract session token from cookies.txt
# Use in subsequent requests with -b cookies.txt
```

**Using Postman:**
1. POST to `/api/auth/signin`
2. Body: `{ "email": "...", "password": "..." }`
3. Cookies auto-saved for collection

**Using Browser:**
1. Sign in at `http://localhost:3000/auth/signin`
2. Open DevTools → Network tab
3. Copy `Authorization` or `Cookie` headers

---

## Test Cases

### Test 1: List Credentials (Empty State)

**Request:**
```bash
curl http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v
```

**Expected Response (200):**
```json
{
  "credentials": [],
  "stats": {
    "total": 0,
    "valid": 0,
    "expiringSoon": 0,
    "expired": 0,
    "missing": 0,
    "pendingReview": 0
  }
}
```

**Validation:**
- ✅ Status 200
- ✅ Empty credentials array
- ✅ Stats all zero

---

### Test 2: Upload Credential (Success)

**Prepare Test File:**
```bash
# Create a test PDF
echo "Test CPR Certificate" > test-cpr.pdf
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test-cpr.pdf" \
  -F 'metadata={
    "employeeId": "your-employee-uuid",
    "documentTypeId": "your-documenttype-uuid",
    "issueDate": "2024-01-15",
    "expirationDate": "2026-01-15",
    "issuer": "American Red Cross",
    "licenseNumber": "CPR-2024-001"
  }' \
  -v
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Credential uploaded successfully and is pending review",
  "credential": {
    "id": "credential-uuid",
    "status": "ACTIVE",
    "reviewStatus": "PENDING_REVIEW",
    "credentialType": "CPR Certification"
  }
}
```

**Validation:**
- ✅ Status 201
- ✅ `success: true`
- ✅ Credential ID returned
- ✅ Status = ACTIVE (expires in 2 years)
- ✅ ReviewStatus = PENDING_REVIEW
- ✅ Check S3: File uploaded to `documents/{agencyId}/{employeeId}/`
- ✅ Check DB: Record created in EmployeeDocument table

---

### Test 3: Upload Credential (Expiring Soon)

```bash
# Upload credential expiring in 20 days
EXPIRY_DATE=$(date -v+20d +%Y-%m-%d) # Mac
# OR
EXPIRY_DATE=$(date -d "+20 days" +%Y-%m-%d) # Linux

curl -X POST http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test-cpr-expiring.pdf" \
  -F "metadata={
    \"employeeId\": \"your-employee-uuid\",
    \"documentTypeId\": \"your-documenttype-uuid\",
    \"expirationDate\": \"$EXPIRY_DATE\"
  }" \
  -v
```

**Expected:**
- ✅ Status 201
- ✅ Credential status = "EXPIRING_SOON"

---

### Test 4: Upload Credential (Validation Errors)

**Missing Required Field:**
```bash
curl -X POST http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F 'metadata={
    "employeeId": "your-employee-uuid"
  }' \
  -v
```

**Expected Response (400):**
```json
{
  "error": "Validation failed",
  "errors": [
    "documentTypeId: Required"
  ]
}
```

**Invalid File Type:**
```bash
# Try uploading a .txt file
echo "test" > test.txt

curl -X POST http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@test.txt" \
  -F 'metadata={...}' \
  -v
```

**Expected Response (400):**
```json
{
  "error": "Validation failed",
  "errors": [
    "Only PDF, JPEG, and PNG files are allowed"
  ]
}
```

**File Too Large (>10MB):**
```bash
# Create large file
dd if=/dev/zero of=large-file.pdf bs=1m count=11

curl -X POST http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -F "file=@large-file.pdf" \
  -F 'metadata={...}' \
  -v
```

**Expected Response (400):**
```json
{
  "error": "Validation failed",
  "errors": [
    "File size must be less than 10 MB"
  ]
}
```

---

### Test 5: List Credentials (After Upload)

```bash
curl http://localhost:3000/api/employee/credentials \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v
```

**Expected Response (200):**
```json
{
  "credentials": [
    {
      "id": "credential-uuid",
      "fileName": "test-cpr.pdf",
      "status": "ACTIVE",
      "reviewStatus": "PENDING_REVIEW",
      "expirationDate": "2026-01-15T00:00:00.000Z",
      "issuer": "American Red Cross",
      "licenseNumber": "CPR-2024-001",
      "documentType": {
        "name": "CPR Certification"
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "stats": {
    "total": 1,
    "valid": 0,
    "expiringSoon": 0,
    "expired": 0,
    "missing": 0,
    "pendingReview": 1
  }
}
```

**Validation:**
- ✅ Credentials array has 1 item
- ✅ Stats show 1 pending review
- ✅ Credential includes all metadata

---

### Test 6: Filter by Status

```bash
# Filter for active credentials
curl "http://localhost:3000/api/employee/credentials?status=ACTIVE" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v

# Filter for expiring soon
curl "http://localhost:3000/api/employee/credentials?status=EXPIRING_SOON" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v
```

**Expected:**
- ✅ Only credentials matching status returned
- ✅ Stats recalculated for filtered set

---

### Test 7: Get Single Credential

```bash
curl http://localhost:3000/api/employee/credentials/CREDENTIAL_UUID \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v
```

**Expected Response (200):**
```json
{
  "credential": {
    "id": "credential-uuid",
    "fileName": "test-cpr.pdf",
    "status": "ACTIVE",
    "reviewStatus": "PENDING_REVIEW",
    "expirationDate": "2026-01-15T00:00:00.000Z",
    "issuer": "American Red Cross",
    "licenseNumber": "CPR-2024-001",
    "downloadUrl": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
    "employee": {
      "id": "employee-uuid",
      "firstName": "Test",
      "lastName": "Employee",
      "department": null,
      "position": null
    },
    "documentType": {
      "name": "CPR Certification"
    },
    "reminders": []
  }
}
```

**Validation:**
- ✅ Status 200
- ✅ `downloadUrl` is a valid S3 presigned URL
- ✅ URL expires in 5 minutes
- ✅ Click URL → file downloads correctly

**Test Download URL:**
```bash
# Copy downloadUrl from response and fetch
curl -O "DOWNLOAD_URL_FROM_RESPONSE"
```

---

### Test 8: Update Credential Metadata

```bash
curl -X PATCH http://localhost:3000/api/employee/credentials/CREDENTIAL_UUID \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Renewed online, certificate received by email",
    "expirationDate": "2027-01-15"
  }' \
  -v
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Credential updated successfully",
  "credential": {
    "id": "credential-uuid",
    "notes": "Renewed online, certificate received by email",
    "expirationDate": "2027-01-15T00:00:00.000Z",
    "reviewStatus": "PENDING_REVIEW",
    ...
  }
}
```

**Validation:**
- ✅ Status 200
- ✅ Notes updated
- ✅ Expiration date extended
- ✅ `reviewStatus` reset to PENDING_REVIEW (metadata changed)

---

### Test 9: Archive Credential

```bash
curl -X DELETE http://localhost:3000/api/employee/credentials/CREDENTIAL_UUID \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Credential archived successfully"
}
```

**Validation:**
- ✅ Status 200
- ✅ Check DB: status = "ARCHIVED"
- ✅ Credential no longer appears in list (unless includeArchived=true)

---

### Test 10: Security - Access Other Employee's Credential

```bash
# Try to access credential belonging to different employee
curl http://localhost:3000/api/employee/credentials/OTHER_EMPLOYEE_CREDENTIAL_UUID \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -v
```

**Expected Response (403):**
```json
{
  "error": "You do not have permission to view this credential"
}
```

**Validation:**
- ✅ Status 403
- ✅ Multi-tenancy enforced
- ✅ No data leakage

---

### Test 11: Unauthenticated Request

```bash
# Request without auth token
curl http://localhost:3000/api/employee/credentials \
  -v
```

**Expected Response (401):**
```json
{
  "error": "Authentication required"
}
```

**Validation:**
- ✅ Status 401
- ✅ Auth enforced on all endpoints

---

## Test Checklist

### Functionality
- [ ] List credentials (empty state)
- [ ] Upload credential (valid file)
- [ ] Upload credential (expiring soon)
- [ ] Upload credential (expired)
- [ ] Filter by status
- [ ] Get single credential
- [ ] Download credential file
- [ ] Update credential metadata
- [ ] Archive credential
- [ ] List archived credentials

### Validation
- [ ] Reject missing required fields
- [ ] Reject invalid file types (.txt, .exe)
- [ ] Reject oversized files (>10MB)
- [ ] Reject invalid dates (issue after expiry)
- [ ] Reject invalid UUIDs

### Security
- [ ] Unauthenticated request → 401
- [ ] Access other employee's credential → 403
- [ ] Upload for other employee → 403
- [ ] Update other employee's credential → 403

### Status Calculation
- [ ] Expiring in 45 days → ACTIVE
- [ ] Expiring in 20 days → EXPIRING_SOON
- [ ] Expired yesterday → EXPIRED
- [ ] No expiration date → MISSING

### S3 Integration
- [ ] File uploads to correct folder structure
- [ ] File accessible via presigned URL
- [ ] Presigned URL expires after 5 minutes
- [ ] Original filename preserved

### Database
- [ ] Record created in EmployeeDocument
- [ ] Relationships correct (employee, documentType)
- [ ] Timestamps populated (createdAt, updatedAt)
- [ ] Status calculated correctly

---

## Postman Collection

### Import this JSON:

```json
{
  "info": {
    "name": "Credential API - Phase 1",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "List Credentials",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/employee/credentials",
          "host": ["{{baseUrl}}"],
          "path": ["api", "employee", "credentials"]
        }
      }
    },
    {
      "name": "Upload Credential",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": ""
            },
            {
              "key": "metadata",
              "value": "{\n  \"employeeId\": \"{{employeeId}}\",\n  \"documentTypeId\": \"{{documentTypeId}}\",\n  \"issueDate\": \"2024-01-15\",\n  \"expirationDate\": \"2026-01-15\",\n  \"issuer\": \"American Red Cross\",\n  \"licenseNumber\": \"CPR-2024-001\"\n}",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "{{baseUrl}}/api/employee/credentials",
          "host": ["{{baseUrl}}"],
          "path": ["api", "employee", "credentials"]
        }
      }
    },
    {
      "name": "Get Credential",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/employee/credentials/{{credentialId}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "employee", "credentials", "{{credentialId}}"]
        }
      }
    },
    {
      "name": "Update Credential",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"notes\": \"Updated notes\",\n  \"expirationDate\": \"2027-01-15\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/employee/credentials/{{credentialId}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "employee", "credentials", "{{credentialId}}"]
        }
      }
    },
    {
      "name": "Archive Credential",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/api/employee/credentials/{{credentialId}}",
          "host": ["{{baseUrl}}"],
          "path": ["api", "employee", "credentials", "{{credentialId}}"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "employeeId",
      "value": "YOUR_EMPLOYEE_UUID"
    },
    {
      "key": "documentTypeId",
      "value": "YOUR_DOCUMENTTYPE_UUID"
    },
    {
      "key": "credentialId",
      "value": "YOUR_CREDENTIAL_UUID"
    }
  ]
}
```

---

## Troubleshooting

### Issue: 401 Unauthorized

**Solution:**
1. Check session cookie is valid
2. Sign in again to refresh token
3. Verify user has employee profile linked

### Issue: 403 Forbidden

**Solution:**
1. Check employeeId in metadata matches your employee record
2. Verify employee.userId = current user ID
3. Check you're not trying to access another employee's data

### Issue: 404 Not Found

**Solution:**
1. Verify credential ID is correct
2. Check credential hasn't been deleted
3. Verify endpoint URL is correct

### Issue: 500 Internal Server Error

**Solution:**
1. Check server logs in terminal
2. Verify database connection
3. Check S3 credentials in `.env`
4. Verify all required fields in Prisma schema exist

### Issue: S3 Upload Fails

**Solution:**
1. Check S3_BUCKET_NAME in `.env`
2. Verify S3 credentials (access key, secret key)
3. Check bucket permissions (allow PutObject)
4. Verify bucket region matches configuration

---

## Success Criteria

All tests passing means:
- ✅ Authentication works
- ✅ File upload to S3 succeeds
- ✅ Database records created correctly
- ✅ Status calculation accurate
- ✅ Validation prevents bad data
- ✅ Security prevents unauthorized access
- ✅ Downloads work with presigned URLs

**Phase 1 APIs: Production Ready ✅**

---

*Manual Testing Guide*
*Last Updated: December 3, 2025*
*Test with: curl, Postman, or browser DevTools*
