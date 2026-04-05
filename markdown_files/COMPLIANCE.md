# Compliance Documentation

## Overview

This document outlines the compliance policies, data handling practices, and regulatory considerations for the Keka Healthcare Marketplace platform. While we do not currently store Protected Health Information (PHI), we maintain strict compliance standards as a healthcare-adjacent platform.

## No PHI Policy

### Explicit Statement

**The Keka Healthcare Marketplace does NOT collect, store, process, or transmit Protected Health Information (PHI) as defined by HIPAA.**

### What We Collect

**Agency Data:**
- Agency name and license number
- Contact information (name, email, phone)
- Service offerings and geographic areas
- Operational metrics (referral volumes, processing times)
- Subscription and billing information

**User Data:**
- User name and email address
- Password (hashed)
- Role and permissions
- Authentication tokens (temporary)

**Platform Usage:**
- Chatbot queries (anonymized, no patient information)
- Knowledge base article views
- Referral source tracking (aggregated data only)
- System activity logs

**NOT Collected:**
- Patient names or identifiers
- Medical diagnoses or treatment information
- Medical record numbers
- Insurance information (patient-level)
- Social Security Numbers
- Dates of birth
- Any other PHI as defined by HIPAA

### User Responsibilities

**Agencies must NOT:**
- Include patient names in chatbot queries
- Upload documents containing PHI
- Enter medical diagnoses or conditions
- Share patient identifiers in any form
- Store PHI in agency profiles or notes

**Platform Safeguards:**
- Content moderation for uploaded data
- Automated detection of potential PHI
- Clear user guidelines and warnings
- Training materials on PHI avoidance

## Data Classification

### Public Data
**Examples:** Marketing materials, public knowledge base articles
- **Storage:** Unencrypted (optimized for performance)
- **Access:** Anyone with internet connection
- **Retention:** Indefinite

### Internal Data
**Examples:** System logs, analytics, internal documentation
- **Storage:** Encrypted at rest
- **Access:** Platform administrators only
- **Retention:** As needed for operations (typically 90 days for logs)

### Confidential Data
**Examples:** Agency profiles, user accounts, subscription data
- **Storage:** Encrypted at rest and in transit
- **Access:** Agency users and authorized administrators
- **Retention:** Duration of subscription + 7 years

### Sensitive Data
**Examples:** Payment information (via Stripe), license numbers
- **Storage:** Encrypted at rest, PCI-compliant storage for payments
- **Access:** Strictly controlled, logged access
- **Retention:** Per legal and regulatory requirements

## Data Retention Policy

### Active Data

**User Accounts:**
- Retained while account is active
- Includes: profile, preferences, activity history
- Backed up daily

**Agency Profiles:**
- Retained while subscription is active
- Includes: agency information, usage data, referral tracking
- Backed up daily

**Chatbot Queries:**
- Retained for 12 months from query date
- Anonymized after 90 days
- Aggregated data retained indefinitely for analytics

**Audit Logs:**
- Retained for 90 days by default
- Configurable up to 7 years for compliance needs
- Archived logs encrypted and stored offline

### Inactive Data

**Canceled Subscriptions:**
- Data retained for 7 years after cancellation
- Access restricted to agency and platform admins
- Available for export during retention period

**Deleted Accounts:**
- Soft delete for 30 days (recoverable)
- Hard delete after 30 days (non-recoverable)
- Some data retained for legal/compliance (anonymized)

### Data Disposal

**Automated Processes:**
- Expired sessions deleted immediately
- Temporary files purged daily
- Old logs purged per retention policy
- Soft-deleted data hard-deleted after 30 days

**Manual Processes:**
- Secure deletion of backups per schedule
- Hardware decommissioning with data wiping
- Third-party data deletion verification

## Right to Deletion

### User Rights

Users and agencies have the right to:
- Access their data
- Export their data
- Correct inaccurate data
- Delete their data (with limitations)
- Opt-out of analytics

### Deletion Process

**How to Request Deletion:**
1. Email: privacy@keka.health
2. Subject: "Data Deletion Request"
3. Include: Account email and agency name
4. Verification required

**Response Timeline:**
- Acknowledgment within 24 hours
- Identity verification within 3 business days
- Deletion completed within 30 days
- Confirmation email sent

**What Gets Deleted:**
- User account and profile
- Agency profile (if admin)
- Chatbot query history
- Preferences and settings
- Uploaded files

**What Remains:**
- Anonymized analytics data
- Financial records (7 years, legal requirement)
- Audit logs (anonymized)
- Aggregated usage statistics

**Exceptions:**
- Active subscriptions (must cancel first)
- Legal hold orders
- Fraud investigation
- Contractual obligations

## Data Export

### Export Rights

Users can export all their data in machine-readable format (JSON).

**How to Request Export:**
1. Log in to dashboard
2. Navigate to Settings > Privacy
3. Click "Export My Data"
4. Receive download link via email (expires in 24 hours)

**What's Included:**
- User profile information
- Agency profile (if applicable)
- Chatbot query history
- Referral tracking data
- Subscription history
- Usage analytics

**Format:**
- JSON files (structured data)
- CSV files (tabular data)
- PDF files (reports and invoices)
- Zip archive for large exports

**Timeline:**
- Small exports: Instant
- Large exports: Within 24 hours
- Complex exports: Within 3 business days

## Third-Party Services

### Service Inventory

#### Stripe (Payment Processing)
- **Purpose:** Subscription billing and payment processing
- **Data Shared:** Payment information, customer email, subscription status
- **PHI Shared:** None
- **Compliance:** PCI DSS Level 1 certified
- **Data Location:** United States
- **Contract:** Data Processing Agreement in place
- **Retention:** Per Stripe's policy (7 years for financial records)

#### OpenAI (AI Chatbot)
- **Purpose:** Natural language processing for chatbot queries
- **Data Shared:** Anonymized query text (no personal identifiers)
- **PHI Shared:** None (filtered before sending)
- **Compliance:** SOC 2 Type II certified
- **Data Location:** United States
- **Contract:** Terms of Service agreement
- **Retention:** 30 days per OpenAI policy

#### Pinecone (Vector Database)
- **Purpose:** Knowledge base search and embeddings
- **Data Shared:** Knowledge base article content (public information)
- **PHI Shared:** None
- **Compliance:** SOC 2 Type II certified
- **Data Location:** United States (AWS)
- **Contract:** Terms of Service agreement
- **Retention:** Duration of service usage

#### Upstash (Redis Rate Limiting)
- **Purpose:** Distributed rate limiting and caching
- **Data Shared:** Request counts, IP hashes, rate limit data
- **PHI Shared:** None
- **Compliance:** SOC 2 Type II certified
- **Data Location:** United States (AWS)
- **Contract:** Terms of Service agreement
- **Retention:** 24 hours (rate limit data)

#### AWS S3 (File Storage)
- **Purpose:** Product file storage, image hosting
- **Data Shared:** Uploaded files, images, documents
- **PHI Shared:** None (content moderation in place)
- **Compliance:** HIPAA-eligible, SOC 1/2/3, ISO 27001
- **Data Location:** US-East-1 (Virginia)
- **Contract:** Business Associate Agreement available
- **Retention:** Duration of subscription + 7 years

#### AWS SES (Email Delivery)
- **Purpose:** Transactional emails (notifications, receipts)
- **Data Shared:** Email addresses, message content
- **PHI Shared:** None
- **Compliance:** HIPAA-eligible, SOC 1/2/3, ISO 27001
- **Data Location:** US-East-1 (Virginia)
- **Contract:** Business Associate Agreement available
- **Retention:** 30 days (delivery logs)

#### Railway (Hosting)
- **Purpose:** Application hosting and deployment
- **Data Shared:** Application code, environment variables, logs
- **PHI Shared:** None
- **Compliance:** SOC 2 Type II (in progress)
- **Data Location:** United States (AWS)
- **Contract:** Terms of Service agreement
- **Retention:** Duration of service usage

### Data Transfer Mechanisms

**All Third-Party Data Transfers:**
- Encrypted in transit (TLS 1.3)
- Encrypted at rest (AES-256)
- Logged and audited
- Covered by contracts/agreements
- Reviewed annually

## Encryption Policies

### Encryption at Rest

**Database:**
- Encryption: AES-256
- Provider: Railway/PostgreSQL
- Key Management: Provider-managed keys
- Backup Encryption: Enabled

**File Storage:**
- Encryption: AES-256
- Provider: AWS S3
- Key Management: AWS KMS
- Server-Side Encryption: Enabled

**Application-Level:**
- Sensitive Fields: AES-256-CBC
- License Numbers: Encrypted (optional)
- Phone Numbers: Encrypted (optional)
- Notes: Encrypted
- Key Management: Environment variables (rotation supported)

### Encryption in Transit

**HTTPS/TLS:**
- Protocol: TLS 1.3 (minimum TLS 1.2)
- Certificate: Let's Encrypt (auto-renewed)
- HSTS: Enabled (1 year max-age)
- Perfect Forward Secrecy: Enabled

**API Communications:**
- All API calls over HTTPS
- Certificate pinning recommended for clients
- Webhook signatures verified

**Email:**
- SMTP: TLS encryption required
- Message Content: Encrypted in transit
- Attachments: Not supported (security policy)

## Privacy Practices

### Data Collection Principles

**Minimal Collection:**
- Only collect data necessary for service delivery
- No collection of PHI
- No tracking without consent
- Clear purpose for each data point

**Transparency:**
- Privacy policy publicly available
- Clear data usage descriptions
- User consent required for non-essential data
- Regular privacy policy updates

**User Control:**
- Users can access their data
- Users can export their data
- Users can delete their data
- Users can opt-out of analytics

### Analytics & Tracking

**What We Track:**
- Page views and navigation
- Feature usage
- Error rates and performance
- Subscription events
- Anonymized chatbot queries

**What We Don't Track:**
- Personal health information
- Browsing history outside our platform
- Keystrokes or mouse movements
- Location data (unless explicitly provided)

**Analytics Tools:**
- Internal analytics (no third-party)
- Aggregated data only
- No cross-site tracking
- Opt-out available

### Cookies & Sessions

**Essential Cookies:**
- Session authentication (httpOnly, Secure)
- CSRF protection tokens
- User preferences (language, theme)
- Duration: Session or as specified

**Analytics Cookies:**
- Anonymous usage tracking
- Performance monitoring
- A/B testing (future)
- Opt-out available

**No Third-Party Cookies:**
- No advertising cookies
- No social media tracking pixels
- No cross-site tracking

## Consent Management

### Consent Types

**Essential Services (No Consent Required):**
- Account creation and authentication
- Service delivery
- Security and fraud prevention
- Legal compliance

**Optional Services (Consent Required):**
- Marketing communications
- Product analytics
- Feature usage tracking
- Process recommendations

**Granular Consent:**
- Users can consent to some services but not others
- Consent can be withdrawn at any time
- Platform functionality not affected by optional consent

### Consent Records

**What We Record:**
- Date and time of consent
- Type of consent given
- Method of consent (checkbox, form, etc.)
- IP address (hashed)
- User agent
- Consent version

**Consent Audit Trail:**
- All consent changes logged
- Available for user review
- Retained for 7 years
- Exportable with user data

## Regulatory Compliance

### Current Compliance Status

**Not Currently Subject To:**
- HIPAA (no PHI stored)
- GDPR (US-only operations)
- CCPA (not meeting threshold)

**Voluntary Compliance:**
- HIPAA-ready architecture
- GDPR-inspired privacy practices
- CCPA-aligned data rights
- OWASP security standards

### HIPAA Readiness

**If We Add PHI in the Future:**
- Business Associate Agreements (BAAs) with all vendors
- Enhanced encryption (field-level)
- Audit controls strengthened
- Access controls enhanced
- Breach notification procedures
- HIPAA training for all staff
- Annual risk assessments
- Penetration testing
- Incident response drills

**Current HIPAA-Aligned Practices:**
- Administrative safeguards (policies, training)
- Physical safeguards (data center security)
- Technical safeguards (encryption, access control)
- Audit controls (logging, monitoring)
- Data integrity controls (validation, checksums)
- Transmission security (TLS, VPN)

### State Privacy Laws

**Awareness:**
- California (CCPA/CPRA)
- Virginia (VCDPA)
- Colorado (CPA)
- Connecticut (CTDPA)
- Utah (UCPA)

**Compliance Approach:**
- Privacy-by-design
- Data minimization
- Transparency
- User rights (access, delete, export)
- No sale of personal data
- Opt-out mechanisms

## Data Breach Response

### Detection & Reporting

**Internal Detection:**
- 24/7 monitoring
- Automated alerts
- Manual security reviews
- User reports

**Reporting Timeline:**
- Internal team: Immediate
- Executive team: Within 1 hour
- Legal counsel: Within 2 hours
- Affected users: Within 24 hours (if applicable)
- Regulators: As required by law (typically 72 hours)

### Notification Process

**Who Gets Notified:**
- Directly affected users/agencies
- Platform administrators
- Relevant regulatory authorities (if required)
- Law enforcement (if criminal activity)
- Media/public (if large-scale breach)

**What We Communicate:**
- Nature of the breach
- Data types affected
- Number of records affected
- Actions taken to contain breach
- Recommended actions for affected parties
- Contact information for questions

**Notification Methods:**
- Email (primary)
- In-app notification
- Website banner
- Press release (if large-scale)

### User Actions

**Recommended Steps:**
1. Change password immediately
2. Enable two-factor authentication (when available)
3. Review account activity
4. Monitor for suspicious activity
5. Contact support with questions

## Compliance Contacts

### Privacy Questions
- Email: privacy@keka.health
- Response Time: 3 business days

### Data Requests (Access, Export, Delete)
- Email: privacy@keka.health
- Subject: "Data Request"
- Response Time: 3 business days

### Security Concerns
- Email: security@keka.health
- Emergency: security-emergency@keka.health
- Response Time: 24 hours (1 hour for emergencies)

### General Support
- Email: support@keka.health
- Response Time: 1 business day

## Compliance Roadmap

### Q1 2025
- Enhanced data encryption
- CCPA compliance assessment
- Privacy policy updates
- User consent management UI

### Q2 2025
- SOC 2 Type I certification
- HIPAA compliance preparation
- Data retention automation
- Breach response drills

### Q3 2025
- SOC 2 Type II certification
- GDPR compliance (EU expansion)
- Privacy audit (third-party)
- Enhanced user data controls

### Q4 2025
- HITRUST certification
- HIPAA compliance (if adding PHI)
- ISO 27001 certification
- Annual compliance review

## Appendix

### Definitions

**PHI (Protected Health Information):**
Individually identifiable health information transmitted or maintained in any form, including patient names, medical record numbers, diagnoses, treatment information, and other health-related data.

**PII (Personally Identifiable Information):**
Information that can be used to identify an individual, such as name, email, phone number, or address.

**Anonymization:**
The process of removing personally identifiable information from data so that individuals cannot be identified.

**Pseudonymization:**
Replacing identifying information with artificial identifiers (pseudonyms) to reduce privacy risks while maintaining data utility.

**Data Controller:**
The entity that determines the purposes and means of processing personal data.

**Data Processor:**
The entity that processes personal data on behalf of the data controller.

### Relevant Laws & Regulations

**Federal:**
- HIPAA (Health Insurance Portability and Accountability Act)
- HITECH (Health Information Technology for Economic and Clinical Health Act)
- FTC Act (Federal Trade Commission Act)

**State:**
- CCPA/CPRA (California Consumer Privacy Act)
- VCDPA (Virginia Consumer Data Protection Act)
- CPA (Colorado Privacy Act)
- And others (see State Privacy Laws section)

**Industry Standards:**
- PCI DSS (Payment Card Industry Data Security Standard)
- SOC 2 (Service Organization Control 2)
- ISO 27001 (Information Security Management)
- HITRUST CSF (Health Information Trust Alliance Common Security Framework)

---

**Last Updated:** 2025-01-19

**Version:** 1.0

**Next Review:** 2025-04-19

**Approved By:** Platform Security Team

**Questions?** Contact privacy@keka.health
