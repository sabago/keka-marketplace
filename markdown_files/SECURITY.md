# Security Policy

## Overview

This document outlines the security architecture, policies, and practices for the Keka Healthcare Marketplace platform. As a healthcare-adjacent platform serving home health agencies, we maintain strict security standards to protect sensitive data and ensure compliance with industry best practices.

## Security Architecture

### Authentication & Authorization

**Authentication System:**
- NextAuth.js-based authentication with JWT tokens
- Secure session management with httpOnly cookies
- Password hashing using industry-standard algorithms
- Support for OAuth providers (future enhancement)

**Authorization Model:**
- Role-Based Access Control (RBAC)
- Three user roles: `AGENCY_USER`, `AGENCY_ADMIN`, `PLATFORM_ADMIN`
- Middleware-enforced authorization checks on all protected routes
- Agency-level data isolation

**Role Permissions:**
```
AGENCY_USER:
  - View agency dashboard
  - Use chatbot queries
  - Track referrals
  - View knowledge base

AGENCY_ADMIN:
  - All AGENCY_USER permissions
  - Manage agency settings
  - Manage agency users
  - View usage analytics

PLATFORM_ADMIN:
  - Full system access
  - Manage all agencies
  - View system-wide analytics
  - Configure platform settings
```

### Data Encryption

**Encryption at Rest:**
- AES-256-CBC encryption for sensitive fields
- Encrypted fields:
  - License numbers (optional)
  - Phone numbers (optional)
  - Internal notes
- Encryption key managed via environment variables
- Key rotation support (manual process)

**Encryption in Transit:**
- TLS 1.3 enforced for all connections
- HTTPS-only in production (HSTS enabled)
- Strict-Transport-Security header with 1-year max-age
- Certificate pinning for API clients (recommended)

**Implementation Details:**
```typescript
// Encryption module: src/lib/encryption.ts
- Algorithm: AES-256-CBC
- Key length: 256 bits (32 bytes)
- IV: Random 16 bytes per encryption
- Output format: hex(iv):hex(encrypted)
```

### Audit Logging

**Events Logged:**
- `user_login` / `user_logout`
- `user_created` / `user_deleted`
- `agency_created` / `agency_updated` / `agency_deleted`
- `subscription_created` / `subscription_updated` / `subscription_canceled`
- `query_executed` (chatbot queries)
- `data_exported`
- `settings_changed`
- `password_changed` / `password_reset_requested`
- `admin_action`
- `security_alert`

**Log Retention:**
- Default: 90 days
- Configurable per compliance requirements
- Automatic purging of old logs
- Stored in `EventLog` database table

**Privacy Protections:**
- IP addresses hashed (SHA-256, first 16 chars only)
- No passwords or tokens logged
- No PHI (Patient Health Information) logged
- Automatic sanitization of sensitive fields

**Log Fields:**
```typescript
{
  eventType: string,
  eventData: JSON,
  ipHash: string,      // Hashed for privacy
  userAgent: string,
  sessionId: string,
  agencyId: string,
  createdAt: timestamp
}
```

### Rate Limiting

**Purpose:**
- Prevent brute force attacks
- Mitigate DDoS attempts
- Control API usage costs
- Ensure fair resource allocation

**Rate Limits:**
```
/api/chatbot/*        50 requests / hour per IP
/api/auth/signin      5 attempts / 15 minutes per IP
/api/agency/*         100 requests / hour per agency
/api/*                200 requests / hour per IP (general)
/admin/*              50 requests / hour per user
```

**Implementation:**
- Upstash Redis for distributed rate limiting
- Sliding window algorithm
- Graceful degradation if Redis unavailable
- 429 status code with `Retry-After` header

**Response Headers:**
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1673456789
Retry-After: 3600
```

### CSRF Protection

**Built-in Protection:**
- Next.js SameSite cookie attribute (`Lax`)
- httpOnly and Secure cookie flags
- CSRF tokens not needed for most operations

**Additional Token Protection:**
- Custom CSRF tokens for sensitive operations
- Token tied to user session
- One-time use tokens
- 1-hour expiration
- Double-submit cookie pattern support

**Protected Operations:**
- Subscription changes
- User deletion
- Payment processing
- Agency settings updates

### Input Validation & Sanitization

**Validation Strategy:**
- Zod schemas for all user inputs
- Server-side validation (never trust client)
- Type-safe validation with TypeScript
- Custom error messages

**Sanitization:**
- HTML sanitization for user-generated content
- Filename sanitization (prevent directory traversal)
- URL validation (prevent open redirects)
- SQL injection prevention (parameterized queries)

**Example Schemas:**
```typescript
CreateAgencySchema    - Agency creation validation
CreateUserSchema      - User registration validation
ChatbotQuerySchema    - Query input validation
UpdateSubscriptionSchema - Subscription changes
```

### Security Headers

**HTTP Security Headers:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Content Security Policy (CSP):**
- Configured for image uploads
- Restricts script execution on SVG files
- Sandbox mode for untrusted content

### Database Security

**Connection Security:**
- Encrypted connections (SSL/TLS)
- Connection pooling with max limits
- Credentials stored in environment variables
- No hard-coded credentials

**Query Safety:**
- Prisma ORM with parameterized queries
- No raw SQL queries with user input
- SQL injection protection built-in

**Access Control:**
- Least privilege principle
- Separate database users for different environments
- Read-only replicas for analytics (future)

### Third-Party Services

**Service Inventory:**
- **Stripe:** Payment processing (PCI-compliant)
- **OpenAI:** AI chatbot queries (no PHI sent)
- **Pinecone:** Vector database for embeddings
- **Upstash:** Redis for rate limiting
- **AWS S3:** File storage (encrypted)
- **AWS SES:** Email delivery (encrypted in transit)

**API Key Management:**
- All keys stored in environment variables
- Never committed to version control
- Rotation schedule: 90 days
- Separate keys per environment

**Data Shared:**
- Stripe: Payment information only (no PHI)
- OpenAI: Anonymized queries (no personal data)
- Pinecone: Knowledge base content only
- No PHI shared with any third party

## Incident Response Plan

### Detection

**Monitoring:**
- Application logs reviewed daily
- Error tracking with automated alerts
- Rate limit violations logged
- Failed authentication attempts tracked
- Unusual activity patterns flagged

**Alert Triggers:**
- Multiple failed login attempts
- Rate limit violations
- Unauthorized access attempts
- Data export anomalies
- System errors or crashes

### Response Procedure

**1. Identification (0-2 hours):**
- Assess severity and scope
- Identify affected systems/data
- Document initial findings
- Notify security team

**2. Containment (2-4 hours):**
- Isolate affected systems if needed
- Block malicious IPs
- Disable compromised accounts
- Preserve evidence

**3. Eradication (4-24 hours):**
- Remove malicious code/access
- Patch vulnerabilities
- Update security rules
- Reset compromised credentials

**4. Recovery (24-48 hours):**
- Restore affected systems
- Verify system integrity
- Monitor for recurring issues
- Resume normal operations

**5. Post-Incident (1-2 weeks):**
- Document incident details
- Update security procedures
- Implement preventive measures
- Notify affected parties if required
- Conduct lessons learned review

### Communication

**Internal:**
- Security team notified immediately
- Executive team within 1 hour
- Development team as needed
- All hands meeting if critical

**External:**
- Affected agencies notified within 24 hours
- Regulatory bodies as required by law
- Law enforcement if criminal activity suspected
- Public disclosure if data breach affects users

### Data Breach Protocol

**If PHI is Compromised:**
1. Immediate containment
2. Legal counsel notification
3. Regulatory authority notification (if applicable)
4. Affected individual notification (if applicable)
5. Public disclosure as required

**Note:** Current platform does not store PHI, but protocol exists for future compliance.

## Vulnerability Disclosure

### Reporting Security Issues

We take security seriously and appreciate responsible disclosure of vulnerabilities.

**How to Report:**
- Email: security@keka.health
- Subject: "Security Vulnerability Report"
- Include:
  - Description of vulnerability
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if any)

**What to Expect:**
- Acknowledgment within 24 hours
- Initial assessment within 3 business days
- Regular updates on remediation progress
- Credit in security advisories (if desired)

**Our Commitment:**
- No legal action against good-faith security researchers
- Work with you to understand and resolve issues
- Keep you informed of our progress
- Recognize your contribution publicly (with permission)

**Please Do Not:**
- Disclose vulnerability publicly before we've had a chance to fix it
- Access more data than necessary to demonstrate the vulnerability
- Cause denial of service or degrade service quality
- Modify or delete data
- Spam or social engineer users

### Responsible Disclosure Timeline

- Day 0: Report received
- Day 1: Acknowledgment sent
- Day 3: Initial assessment complete
- Day 30: Fix deployed (for critical issues)
- Day 90: Public disclosure (coordinated)

### Bug Bounty Program

Currently, we do not have a formal bug bounty program. However, we greatly appreciate security research and will:
- Publicly acknowledge contributors (with permission)
- Provide swag or credits as appropriate
- Consider future paid bug bounty program

## Security Best Practices

### For Developers

**Code Review:**
- All code reviewed before merge
- Security-focused review for sensitive changes
- Automated security scanning in CI/CD
- Regular dependency updates

**Development Environment:**
- Separate from production
- No production data in development
- Test data anonymized
- Local encryption keys (never production keys)

**Git Security:**
- No secrets in version control
- `.env` files in `.gitignore`
- Git history scanned for leaked secrets
- Signed commits encouraged

### For Administrators

**Access Management:**
- Principle of least privilege
- Regular access reviews (quarterly)
- Immediate revocation for departing staff
- Multi-factor authentication required

**System Maintenance:**
- Security patches applied within 7 days
- Dependency updates monthly
- Database backups daily (encrypted)
- Disaster recovery tested quarterly

**Monitoring:**
- Log review daily
- Anomaly detection enabled
- Performance monitoring
- Uptime tracking

### For Users

**Account Security:**
- Strong passwords required (8+ chars, mixed case, numbers)
- Change passwords every 90 days (recommended)
- Never share credentials
- Report suspicious activity immediately

**Data Protection:**
- Never include PHI in chatbot queries
- Verify email authenticity before clicking links
- Use secure connections (HTTPS)
- Log out when finished

## Compliance

### Standards & Frameworks

**Current Compliance:**
- OWASP Top 10 protections
- CIS Controls alignment
- Privacy by design principles

**Future Compliance Goals:**
- HIPAA compliance (when handling PHI)
- SOC 2 Type II certification
- GDPR compliance (for EU users)
- HITRUST certification

### Security Certifications

**Platform Security:**
- TLS 1.3 encryption
- PCI DSS Level 1 (via Stripe)
- Regular penetration testing (annual)
- Vulnerability scanning (continuous)

### Audit & Assessment

**Internal Audits:**
- Quarterly security reviews
- Annual comprehensive audit
- Continuous vulnerability scanning
- Code security analysis

**External Audits:**
- Annual third-party penetration test
- Security architecture review
- Compliance assessment
- SOC 2 audit (planned)

## Security Roadmap

### Q1 2025
- Implement multi-factor authentication (MFA)
- Enhanced logging and monitoring
- Security training for all staff
- Penetration testing

### Q2 2025
- SOC 2 Type I certification
- HIPAA compliance preparation
- Automated security scanning
- Incident response drills

### Q3 2025
- SOC 2 Type II certification
- HIPAA compliance implementation
- Advanced threat detection
- Bug bounty program launch

### Q4 2025
- HITRUST certification
- Security operations center (SOC)
- 24/7 security monitoring
- Advanced encryption (field-level)

## Contact

**Security Team:**
- Email: security@keka.health
- Emergency: security-emergency@keka.health (24/7)

**General Support:**
- Email: support@keka.health
- Phone: [To be provided]

**Documentation:**
- Security: /SECURITY.md
- Compliance: /COMPLIANCE.md
- Privacy Policy: /docs/privacy.md

---

**Last Updated:** 2025-01-19

**Version:** 1.0

**Next Review:** 2025-04-19
