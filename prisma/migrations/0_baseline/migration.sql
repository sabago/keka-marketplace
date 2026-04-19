--
-- PostgreSQL database dump
--

-- Dumped from database version 14.13 (Homebrew)
-- Dumped by pg_dump version 14.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AgencyReminderFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgencyReminderFrequency" AS ENUM (
    'DAILY',
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'CUSTOM'
);


--
-- Name: AgencySize; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgencySize" AS ENUM (
    'SMALL',
    'MEDIUM',
    'LARGE'
);


--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);


--
-- Name: DocumentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentStatus" AS ENUM (
    'ACTIVE',
    'EXPIRING_SOON',
    'EXPIRED',
    'ARCHIVED',
    'MISSING',
    'PENDING_REVIEW'
);


--
-- Name: EmployeeStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmployeeStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'TERMINATED',
    'ON_LEAVE'
);


--
-- Name: IntakeMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IntakeMethod" AS ENUM (
    'PHONE',
    'FAX',
    'EMAIL',
    'PORTAL',
    'MANUAL_ENTRY'
);


--
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JobStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'EMAIL',
    'SMS',
    'IN_APP',
    'WEBHOOK'
);


--
-- Name: PlanType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlanType" AS ENUM (
    'FREE',
    'PRO',
    'BUSINESS',
    'ENTERPRISE'
);


--
-- Name: ReferralStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReferralStatus" AS ENUM (
    'SUBMITTED',
    'RESPONDED',
    'ACCEPTED',
    'DECLINED',
    'PATIENT_STARTED'
);


--
-- Name: ReminderFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReminderFrequency" AS ENUM (
    'MINIMAL',
    'STANDARD',
    'FREQUENT'
);


--
-- Name: ReminderType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReminderType" AS ENUM (
    'EXPIRING_SOON',
    'EXPIRED',
    'MISSING',
    'RENEWAL_DUE',
    'FOLLOW_UP'
);


--
-- Name: ReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReviewStatus" AS ENUM (
    'PENDING_UPLOAD',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'NEEDS_CORRECTION'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'CANCELED',
    'PAST_DUE',
    'TRIAL',
    'INCOMPLETE'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'PURCHASE',
    'USAGE',
    'REFUND',
    'BONUS'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'AGENCY_USER',
    'AGENCY_ADMIN',
    'PLATFORM_ADMIN',
    'SUPERADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: AdminAction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AdminAction" (
    id text NOT NULL,
    "adminId" text NOT NULL,
    "actionType" text NOT NULL,
    "targetAgencyId" text,
    details jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Agency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Agency" (
    id text NOT NULL,
    "agencyName" text NOT NULL,
    "licenseNumber" text NOT NULL,
    "subscriptionPlan" public."PlanType" DEFAULT 'FREE'::public."PlanType" NOT NULL,
    "subscriptionStatus" public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    "stripeCustomerId" text,
    "stripeSubscriptionId" text,
    "queriesThisMonth" integer DEFAULT 0 NOT NULL,
    "queriesAllTime" integer DEFAULT 0 NOT NULL,
    "billingPeriodStart" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "billingPeriodEnd" timestamp(3) without time zone NOT NULL,
    "lastQueryReset" timestamp(3) without time zone,
    "servicesOffered" text[],
    "serviceArea" text[],
    "agencySize" public."AgencySize" NOT NULL,
    "primaryContactName" text NOT NULL,
    "primaryContactRole" text NOT NULL,
    "primaryContactEmail" text NOT NULL,
    "primaryContactPhone" text,
    "intakeMethod" public."IntakeMethod",
    "intakeMethods" text[] DEFAULT ARRAY[]::text[],
    "intakeTrackingDescription" text,
    "followUpFrequency" text,
    "followUpMethods" text[] DEFAULT ARRAY[]::text[],
    "avgReferralsPerMonth" integer,
    "timeToProcessReferral" integer,
    "staffHandlingIntake" integer,
    "painPoints" text[] DEFAULT ARRAY[]::text[],
    "preferredChannels" text[] DEFAULT ARRAY[]::text[],
    specializations text[] DEFAULT ARRAY[]::text[],
    "consentToAnalytics" boolean DEFAULT false NOT NULL,
    "consentToProcessRecs" boolean DEFAULT false NOT NULL,
    "approvalStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "approvalEmailSent" boolean DEFAULT false NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "rejectionReason" text,
    "taxId" text,
    "licenseDocument" text,
    "verificationNotes" text,
    "credentialWarningDays" integer DEFAULT 30 NOT NULL,
    "autoReminderEnabled" boolean DEFAULT true NOT NULL,
    "reminderFrequency" public."AgencyReminderFrequency" DEFAULT 'WEEKLY'::public."AgencyReminderFrequency" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text
);


--
-- Name: ChatbotQuery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatbotQuery" (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    query text NOT NULL,
    response text NOT NULL,
    "tokensUsed" integer NOT NULL,
    "modelUsed" text NOT NULL,
    "responseTime" integer NOT NULL,
    "sourcesReturned" jsonb NOT NULL,
    "userRating" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ComplianceSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ComplianceSnapshot" (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "snapshotDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    period text,
    "totalEmployees" integer NOT NULL,
    "activeEmployees" integer NOT NULL,
    "totalCredentials" integer NOT NULL,
    "validCredentials" integer NOT NULL,
    "expiringCredentials" integer NOT NULL,
    "expiredCredentials" integer NOT NULL,
    "missingCredentials" integer NOT NULL,
    "pendingReviewCredentials" integer NOT NULL,
    "complianceRate" double precision NOT NULL,
    "byCredentialType" jsonb NOT NULL,
    "byDepartment" jsonb,
    "byEmployee" jsonb,
    "createdBy" text,
    notes text
);


--
-- Name: CredentialParsingJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CredentialParsingJob" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "agencyId" text NOT NULL,
    status public."JobStatus" DEFAULT 'PENDING'::public."JobStatus" NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "processingStartedAt" timestamp(3) without time zone,
    "processingCompletedAt" timestamp(3) without time zone,
    error text,
    "lastError" text,
    result jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "documentTypeName" text,
    "fileName" text NOT NULL,
    metadata jsonb,
    "mimeType" text NOT NULL,
    "retryAt" timestamp(3) without time zone,
    "s3Key" text NOT NULL
);


--
-- Name: CredentialReminder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CredentialReminder" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "employeeId" text NOT NULL,
    "agencyId" text NOT NULL,
    "reminderType" public."ReminderType" NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sentTo" text[],
    channel public."NotificationChannel" NOT NULL,
    "daysBeforeExpiry" integer,
    "templateUsed" text,
    metadata jsonb
);


--
-- Name: CreditTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CreditTransaction" (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    type public."TransactionType" NOT NULL,
    amount integer NOT NULL,
    description text NOT NULL,
    "relatedEntityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DocumentType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DocumentType" (
    id text NOT NULL,
    "agencyId" text,
    name text NOT NULL,
    description text,
    "expirationDays" integer,
    "reminderDays" integer[] DEFAULT ARRAY[30, 7],
    "isRequired" boolean DEFAULT false NOT NULL,
    "isGlobal" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Download; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Download" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "downloadToken" text NOT NULL,
    "downloadCount" integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Employee" (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text,
    phone text,
    "employeeNumber" text,
    "hireDate" timestamp(3) without time zone,
    department text,
    "position" text,
    status public."EmployeeStatus" DEFAULT 'ACTIVE'::public."EmployeeStatus" NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EmployeeDocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmployeeDocument" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "documentTypeId" text NOT NULL,
    "s3Key" text NOT NULL,
    "fileName" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    "issueDate" timestamp(3) without time zone,
    "expirationDate" timestamp(3) without time zone,
    status public."DocumentStatus" DEFAULT 'ACTIVE'::public."DocumentStatus" NOT NULL,
    issuer text,
    "licenseNumber" text,
    "verificationUrl" text,
    "aiParsedData" jsonb,
    "aiConfidence" double precision,
    "aiParsedAt" timestamp(3) without time zone,
    "aiParsedBy" text,
    "reviewStatus" public."ReviewStatus" DEFAULT 'PENDING_UPLOAD'::public."ReviewStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNotes" text,
    "isCompliant" boolean DEFAULT false NOT NULL,
    "complianceCheckedAt" timestamp(3) without time zone,
    "uploadedBy" text NOT NULL,
    notes text,
    "lastReminderSent" timestamp(3) without time zone,
    "remindersSent" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: EventLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EventLog" (
    id text NOT NULL,
    "agencyId" text,
    "eventType" text NOT NULL,
    "eventData" jsonb NOT NULL,
    "sessionId" text,
    "ipHash" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: FavoriteReferral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FavoriteReferral" (
    id text NOT NULL,
    "agencyId" text,
    "articleSlug" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text
);


--
-- Name: KnowledgeBaseArticle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KnowledgeBaseArticle" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    state text NOT NULL,
    category text,
    "isOverview" boolean DEFAULT false NOT NULL,
    tags text[],
    content text NOT NULL,
    excerpt text,
    published boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NotificationPreferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NotificationPreferences" (
    id text NOT NULL,
    "employeeId" text NOT NULL,
    "emailEnabled" boolean DEFAULT true NOT NULL,
    "emailExpiringReminders" boolean DEFAULT true NOT NULL,
    "emailExpiredReminders" boolean DEFAULT true NOT NULL,
    "emailApprovalNotifications" boolean DEFAULT true NOT NULL,
    "emailRejectionNotifications" boolean DEFAULT true NOT NULL,
    "reminderFrequency" public."ReminderFrequency" DEFAULT 'STANDARD'::public."ReminderFrequency" NOT NULL,
    "quietHoursEnabled" boolean DEFAULT false NOT NULL,
    "quietHoursStart" integer,
    "quietHoursEnd" integer,
    "weeklyDigestEnabled" boolean DEFAULT false NOT NULL,
    "weeklyDigestDay" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "customerEmail" text NOT NULL,
    "totalAmount" numeric(65,30) NOT NULL,
    "stripePaymentId" text,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    price numeric(65,30) NOT NULL
);


--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordResetToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PasswordSetupToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PasswordSetupToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    price numeric(65,30) NOT NULL,
    "filePath" text NOT NULL,
    thumbnail text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCategory" (
    "productId" text NOT NULL,
    "categoryId" text NOT NULL
);


--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "imageUrl" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductTag" (
    id text NOT NULL,
    "productId" text NOT NULL,
    tag text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductVideo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductVideo" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "videoUrl" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReferralContactLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferralContactLog" (
    id text NOT NULL,
    "referralTrackingId" text NOT NULL,
    "contactedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "contactName" text,
    method text,
    outcome text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ReferralTracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferralTracking" (
    id text NOT NULL,
    "agencyId" text,
    "referralSourceSlug" text NOT NULL,
    "submissionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "submissionMethod" text,
    "patientType" text,
    status public."ReferralStatus" DEFAULT 'SUBMITTED'::public."ReferralStatus" NOT NULL,
    "statusUpdatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "responseTime" integer,
    accepted boolean,
    "patientStarted" boolean,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text,
    "respondedAt" timestamp(3) without time zone,
    "acceptedAt" timestamp(3) without time zone,
    "patientStartedAt" timestamp(3) without time zone,
    "patientCount" integer DEFAULT 0 NOT NULL,
    "contactName" text
);


--
-- Name: Review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Review" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "customerName" text NOT NULL,
    "customerEmail" text NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    password text,
    role public."UserRole" DEFAULT 'AGENCY_USER'::public."UserRole" NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "isPrimaryContact" boolean DEFAULT false NOT NULL,
    "agencyId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: VectorEmbedding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VectorEmbedding" (
    id text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text NOT NULL,
    content text NOT NULL,
    embedding numeric(65,30)[],
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: AdminAction AdminAction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminAction"
    ADD CONSTRAINT "AdminAction_pkey" PRIMARY KEY (id);


--
-- Name: Agency Agency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Agency"
    ADD CONSTRAINT "Agency_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: ChatbotQuery ChatbotQuery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatbotQuery"
    ADD CONSTRAINT "ChatbotQuery_pkey" PRIMARY KEY (id);


--
-- Name: ComplianceSnapshot ComplianceSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplianceSnapshot"
    ADD CONSTRAINT "ComplianceSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: CredentialParsingJob CredentialParsingJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialParsingJob"
    ADD CONSTRAINT "CredentialParsingJob_pkey" PRIMARY KEY (id);


--
-- Name: CredentialReminder CredentialReminder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialReminder"
    ADD CONSTRAINT "CredentialReminder_pkey" PRIMARY KEY (id);


--
-- Name: CreditTransaction CreditTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY (id);


--
-- Name: DocumentType DocumentType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentType"
    ADD CONSTRAINT "DocumentType_pkey" PRIMARY KEY (id);


--
-- Name: Download Download_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Download"
    ADD CONSTRAINT "Download_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeDocument EmployeeDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY (id);


--
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- Name: EventLog EventLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventLog"
    ADD CONSTRAINT "EventLog_pkey" PRIMARY KEY (id);


--
-- Name: FavoriteReferral FavoriteReferral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FavoriteReferral"
    ADD CONSTRAINT "FavoriteReferral_pkey" PRIMARY KEY (id);


--
-- Name: KnowledgeBaseArticle KnowledgeBaseArticle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KnowledgeBaseArticle"
    ADD CONSTRAINT "KnowledgeBaseArticle_pkey" PRIMARY KEY (id);


--
-- Name: NotificationPreferences NotificationPreferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: PasswordSetupToken PasswordSetupToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordSetupToken"
    ADD CONSTRAINT "PasswordSetupToken_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId");


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: ProductTag ProductTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_pkey" PRIMARY KEY (id);


--
-- Name: ProductVideo ProductVideo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVideo"
    ADD CONSTRAINT "ProductVideo_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: ReferralContactLog ReferralContactLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralContactLog"
    ADD CONSTRAINT "ReferralContactLog_pkey" PRIMARY KEY (id);


--
-- Name: ReferralTracking ReferralTracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralTracking"
    ADD CONSTRAINT "ReferralTracking_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VectorEmbedding VectorEmbedding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VectorEmbedding"
    ADD CONSTRAINT "VectorEmbedding_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Account_userId_idx" ON public."Account" USING btree ("userId");


--
-- Name: AdminAction_actionType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminAction_actionType_idx" ON public."AdminAction" USING btree ("actionType");


--
-- Name: AdminAction_adminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminAction_adminId_idx" ON public."AdminAction" USING btree ("adminId");


--
-- Name: AdminAction_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminAction_createdAt_idx" ON public."AdminAction" USING btree ("createdAt");


--
-- Name: AdminAction_targetAgencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AdminAction_targetAgencyId_idx" ON public."AdminAction" USING btree ("targetAgencyId");


--
-- Name: Agency_approvalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Agency_approvalStatus_idx" ON public."Agency" USING btree ("approvalStatus");


--
-- Name: Agency_licenseNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Agency_licenseNumber_key" ON public."Agency" USING btree ("licenseNumber");


--
-- Name: Agency_stripeCustomerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Agency_stripeCustomerId_idx" ON public."Agency" USING btree ("stripeCustomerId");


--
-- Name: Agency_stripeCustomerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Agency_stripeCustomerId_key" ON public."Agency" USING btree ("stripeCustomerId");


--
-- Name: Agency_stripeSubscriptionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Agency_stripeSubscriptionId_key" ON public."Agency" USING btree ("stripeSubscriptionId");


--
-- Name: Agency_subscriptionPlan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Agency_subscriptionPlan_idx" ON public."Agency" USING btree ("subscriptionPlan");


--
-- Name: Category_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);


--
-- Name: ChatbotQuery_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatbotQuery_agencyId_idx" ON public."ChatbotQuery" USING btree ("agencyId");


--
-- Name: ChatbotQuery_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatbotQuery_createdAt_idx" ON public."ChatbotQuery" USING btree ("createdAt");


--
-- Name: ComplianceSnapshot_agencyId_snapshotDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ComplianceSnapshot_agencyId_snapshotDate_idx" ON public."ComplianceSnapshot" USING btree ("agencyId", "snapshotDate");


--
-- Name: ComplianceSnapshot_snapshotDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ComplianceSnapshot_snapshotDate_idx" ON public."ComplianceSnapshot" USING btree ("snapshotDate");


--
-- Name: CredentialParsingJob_agencyId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialParsingJob_agencyId_status_idx" ON public."CredentialParsingJob" USING btree ("agencyId", status);


--
-- Name: CredentialParsingJob_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialParsingJob_createdAt_idx" ON public."CredentialParsingJob" USING btree ("createdAt");


--
-- Name: CredentialParsingJob_documentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CredentialParsingJob_documentId_key" ON public."CredentialParsingJob" USING btree ("documentId");


--
-- Name: CredentialParsingJob_status_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialParsingJob_status_priority_idx" ON public."CredentialParsingJob" USING btree (status, priority);


--
-- Name: CredentialReminder_agencyId_sentAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialReminder_agencyId_sentAt_idx" ON public."CredentialReminder" USING btree ("agencyId", "sentAt");


--
-- Name: CredentialReminder_documentId_sentAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialReminder_documentId_sentAt_idx" ON public."CredentialReminder" USING btree ("documentId", "sentAt");


--
-- Name: CredentialReminder_employeeId_sentAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialReminder_employeeId_sentAt_idx" ON public."CredentialReminder" USING btree ("employeeId", "sentAt");


--
-- Name: CredentialReminder_reminderType_sentAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CredentialReminder_reminderType_sentAt_idx" ON public."CredentialReminder" USING btree ("reminderType", "sentAt");


--
-- Name: CreditTransaction_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CreditTransaction_agencyId_idx" ON public."CreditTransaction" USING btree ("agencyId");


--
-- Name: DocumentType_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DocumentType_agencyId_idx" ON public."DocumentType" USING btree ("agencyId");


--
-- Name: DocumentType_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DocumentType_isActive_idx" ON public."DocumentType" USING btree ("isActive");


--
-- Name: DocumentType_isGlobal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DocumentType_isGlobal_idx" ON public."DocumentType" USING btree ("isGlobal");


--
-- Name: Download_downloadToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Download_downloadToken_key" ON public."Download" USING btree ("downloadToken");


--
-- Name: EmployeeDocument_documentTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_documentTypeId_idx" ON public."EmployeeDocument" USING btree ("documentTypeId");


--
-- Name: EmployeeDocument_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_employeeId_idx" ON public."EmployeeDocument" USING btree ("employeeId");


--
-- Name: EmployeeDocument_employeeId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_employeeId_status_idx" ON public."EmployeeDocument" USING btree ("employeeId", status);


--
-- Name: EmployeeDocument_expirationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_expirationDate_idx" ON public."EmployeeDocument" USING btree ("expirationDate");


--
-- Name: EmployeeDocument_isCompliant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_isCompliant_idx" ON public."EmployeeDocument" USING btree ("isCompliant");


--
-- Name: EmployeeDocument_reviewStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_reviewStatus_idx" ON public."EmployeeDocument" USING btree ("reviewStatus");


--
-- Name: EmployeeDocument_status_expirationDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_status_expirationDate_idx" ON public."EmployeeDocument" USING btree (status, "expirationDate");


--
-- Name: EmployeeDocument_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_status_idx" ON public."EmployeeDocument" USING btree (status);


--
-- Name: EmployeeDocument_uploadedBy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmployeeDocument_uploadedBy_idx" ON public."EmployeeDocument" USING btree ("uploadedBy");


--
-- Name: Employee_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Employee_agencyId_idx" ON public."Employee" USING btree ("agencyId");


--
-- Name: Employee_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Employee_email_idx" ON public."Employee" USING btree (email);


--
-- Name: Employee_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Employee_status_idx" ON public."Employee" USING btree (status);


--
-- Name: Employee_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Employee_userId_idx" ON public."Employee" USING btree ("userId");


--
-- Name: Employee_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Employee_userId_key" ON public."Employee" USING btree ("userId");


--
-- Name: EventLog_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EventLog_agencyId_idx" ON public."EventLog" USING btree ("agencyId");


--
-- Name: EventLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EventLog_createdAt_idx" ON public."EventLog" USING btree ("createdAt");


--
-- Name: EventLog_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EventLog_eventType_idx" ON public."EventLog" USING btree ("eventType");


--
-- Name: FavoriteReferral_agencyId_articleSlug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FavoriteReferral_agencyId_articleSlug_key" ON public."FavoriteReferral" USING btree ("agencyId", "articleSlug");


--
-- Name: FavoriteReferral_userId_articleSlug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FavoriteReferral_userId_articleSlug_key" ON public."FavoriteReferral" USING btree ("userId", "articleSlug");


--
-- Name: FavoriteReferral_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FavoriteReferral_userId_idx" ON public."FavoriteReferral" USING btree ("userId");


--
-- Name: KnowledgeBaseArticle_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeBaseArticle_category_idx" ON public."KnowledgeBaseArticle" USING btree (category);


--
-- Name: KnowledgeBaseArticle_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeBaseArticle_published_idx" ON public."KnowledgeBaseArticle" USING btree (published);


--
-- Name: KnowledgeBaseArticle_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeBaseArticle_slug_idx" ON public."KnowledgeBaseArticle" USING btree (slug);


--
-- Name: KnowledgeBaseArticle_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "KnowledgeBaseArticle_slug_key" ON public."KnowledgeBaseArticle" USING btree (slug);


--
-- Name: KnowledgeBaseArticle_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KnowledgeBaseArticle_state_idx" ON public."KnowledgeBaseArticle" USING btree (state);


--
-- Name: NotificationPreferences_employeeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NotificationPreferences_employeeId_idx" ON public."NotificationPreferences" USING btree ("employeeId");


--
-- Name: NotificationPreferences_employeeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NotificationPreferences_employeeId_key" ON public."NotificationPreferences" USING btree ("employeeId");


--
-- Name: PasswordResetToken_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_token_idx" ON public."PasswordResetToken" USING btree (token);


--
-- Name: PasswordResetToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON public."PasswordResetToken" USING btree (token);


--
-- Name: PasswordResetToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordResetToken_userId_idx" ON public."PasswordResetToken" USING btree ("userId");


--
-- Name: PasswordSetupToken_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordSetupToken_token_idx" ON public."PasswordSetupToken" USING btree (token);


--
-- Name: PasswordSetupToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PasswordSetupToken_token_key" ON public."PasswordSetupToken" USING btree (token);


--
-- Name: PasswordSetupToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PasswordSetupToken_userId_idx" ON public."PasswordSetupToken" USING btree ("userId");


--
-- Name: ProductTag_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTag_productId_idx" ON public."ProductTag" USING btree ("productId");


--
-- Name: ProductTag_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTag_tag_idx" ON public."ProductTag" USING btree (tag);


--
-- Name: ProductVideo_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductVideo_productId_key" ON public."ProductVideo" USING btree ("productId");


--
-- Name: ReferralContactLog_referralTrackingId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralContactLog_referralTrackingId_idx" ON public."ReferralContactLog" USING btree ("referralTrackingId");


--
-- Name: ReferralTracking_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralTracking_agencyId_idx" ON public."ReferralTracking" USING btree ("agencyId");


--
-- Name: ReferralTracking_referralSourceSlug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralTracking_referralSourceSlug_idx" ON public."ReferralTracking" USING btree ("referralSourceSlug");


--
-- Name: ReferralTracking_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferralTracking_userId_idx" ON public."ReferralTracking" USING btree ("userId");


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: User_agencyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_agencyId_idx" ON public."User" USING btree ("agencyId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VectorEmbedding_sourceType_sourceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "VectorEmbedding_sourceType_sourceId_idx" ON public."VectorEmbedding" USING btree ("sourceType", "sourceId");


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AdminAction AdminAction_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminAction"
    ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AdminAction AdminAction_targetAgencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AdminAction"
    ADD CONSTRAINT "AdminAction_targetAgencyId_fkey" FOREIGN KEY ("targetAgencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatbotQuery ChatbotQuery_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatbotQuery"
    ADD CONSTRAINT "ChatbotQuery_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ComplianceSnapshot ComplianceSnapshot_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ComplianceSnapshot"
    ADD CONSTRAINT "ComplianceSnapshot_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CredentialParsingJob CredentialParsingJob_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialParsingJob"
    ADD CONSTRAINT "CredentialParsingJob_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CredentialParsingJob CredentialParsingJob_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialParsingJob"
    ADD CONSTRAINT "CredentialParsingJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."EmployeeDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CredentialReminder CredentialReminder_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialReminder"
    ADD CONSTRAINT "CredentialReminder_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CredentialReminder CredentialReminder_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialReminder"
    ADD CONSTRAINT "CredentialReminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."EmployeeDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CredentialReminder CredentialReminder_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CredentialReminder"
    ADD CONSTRAINT "CredentialReminder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CreditTransaction CreditTransaction_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CreditTransaction"
    ADD CONSTRAINT "CreditTransaction_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DocumentType DocumentType_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentType"
    ADD CONSTRAINT "DocumentType_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Download Download_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Download"
    ADD CONSTRAINT "Download_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Download Download_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Download"
    ADD CONSTRAINT "Download_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeDocument EmployeeDocument_documentTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES public."DocumentType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: EmployeeDocument EmployeeDocument_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmployeeDocument"
    ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Employee Employee_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EventLog EventLog_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EventLog"
    ADD CONSTRAINT "EventLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FavoriteReferral FavoriteReferral_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FavoriteReferral"
    ADD CONSTRAINT "FavoriteReferral_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FavoriteReferral FavoriteReferral_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FavoriteReferral"
    ADD CONSTRAINT "FavoriteReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: NotificationPreferences NotificationPreferences_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NotificationPreferences"
    ADD CONSTRAINT "NotificationPreferences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."Employee"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasswordSetupToken PasswordSetupToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PasswordSetupToken"
    ADD CONSTRAINT "PasswordSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductCategory ProductCategory_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductCategory ProductCategory_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTag ProductTag_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductVideo ProductVideo_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVideo"
    ADD CONSTRAINT "ProductVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferralContactLog ReferralContactLog_referralTrackingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralContactLog"
    ADD CONSTRAINT "ReferralContactLog_referralTrackingId_fkey" FOREIGN KEY ("referralTrackingId") REFERENCES public."ReferralTracking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReferralTracking ReferralTracking_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralTracking"
    ADD CONSTRAINT "ReferralTracking_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReferralTracking ReferralTracking_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferralTracking"
    ADD CONSTRAINT "ReferralTracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Review Review_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public."Agency"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

