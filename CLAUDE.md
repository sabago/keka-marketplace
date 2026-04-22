# CLAUDE.md — Ugabot Marketplace (HIPAA)

> Project-level operating manual for Claude. Sandra's global rules in `~/.claude/CLAUDE.md` still apply (anti-sycophancy, ROI-driven, no fluff). This file adds **what this codebase is, how it's wired, and what will break it.**

---

## 1. What this app is

A HIPAA-aware, multi-tenant SaaS for Massachusetts home-care / AFC agencies. Two flagship surfaces:

1. **MA Referral Directory + RAG Chatbot** — agencies browse a curated knowledge base of patient-acquisition pathways (ASAPs, ACOs, hospitals, hospices, etc.) and query it through a natural-language chatbot grounded in our own content via Pinecone retrieval.
2. **Staff Credential Tracking with AI Parsing** — agencies upload staff documents (CPR, RN license, HHA cert, BCI, etc.). OCR + GPT-4-turbo extract issuer, license number, issue/expiration dates, write to `StaffCredential`, and we surface a compliance dashboard with expiring/expired alerts.

Secondary surfaces: marketplace (digital products, Stripe), referrals tracking, agency onboarding, staff invites, admin console with audit log viewer.

Revenue model: tiered subscriptions (`FREE | PRO | BUSINESS | ENTERPRISE`) gated by `queriesThisMonth` quotas and feature flags. Don't ship features that bypass plan gating.

---

## 2. Stack (don't drift from this)

- **Framework:** Next.js 15 App Router, React 19, TypeScript strict
- **DB:** PostgreSQL via Prisma 6 (`prisma/schema.prisma`, 33 models, 900+ lines — this is the source of truth, not your memory)
- **Auth:** NextAuth v4 + Prisma adapter, JWT sessions, custom `middleware.ts` enforces route + role gates
- **AI / RAG:** OpenAI `text-embedding-3-large` for embeddings, `gpt-4-turbo` for chat + credential parsing, Pinecone for vector store (`src/lib/vectorDb.ts`, `src/lib/rag.ts`)
- **OCR:** Tesseract.js + `pdf-parse` (`src/lib/ocr.ts`, `src/lib/credentialParser.ts`)
- **Files:** AWS S3 (presigned uploads), encrypted-at-rest by AWS, S3 keys live in `StaffCredential.s3Key`
- **Email:** AWS SES + Nodemailer (credential expiration reminders, invites, magic links)
- **Payments:** Stripe (subscriptions + one-off marketplace orders), webhooks at `/api/webhook`
- **Rate limiting:** Upstash Redis + `@upstash/ratelimit` (`src/lib/rateLimit.ts`) — applied in middleware per-route-class
- **Encryption:** AES-256-CBC field encryption (`src/lib/encryption.ts`) for sensitive non-S3 fields. **`ENCRYPTION_KEY` must be 64 hex chars.**
- **Hosting:** Railway (primary), Vercel config present, Docker for parity

If you're tempted to add a new dependency, justify it against time saved vs. maintenance burden. Default = no.

---

## 3. Repo map (the parts that matter)

```
src/
  app/
    api/                     # All server routes (App Router handlers)
      admin/                 # Platform admin (approve agencies, audit log, settings)
      agency/                # Agency-scoped: staff, credentials, compliance, billing
      agent/                 # Tool-calling agent endpoints (credential agent)
      ai/                    # AI utilities
      chatbot/query/         # RAG query endpoint (rate-limited, plan-gated, logged)
      credentials/           # Credential CRUD + parsing jobs
      cron/                  # Daily jobs (expiration reminders, snapshots)
      employee/              # Staff-facing endpoints
      knowledge-base/        # KB article CRUD + search
      referrals/             # Referral tracking + contact log
      subscription/          # Stripe subscription lifecycle
      webhook/               # Stripe webhooks
    admin/, agency/, dashboard/, directory/, knowledge-base/, marketplace/, ...
  components/
    AIChatbot.tsx, DirectoryChatbot.tsx     # Customer-facing RAG UI
    documents/                                # Upload, list, status badge, review modal
    employee/                                 # CredentialCard, ComplianceScoreWidget
    admin/                                    # Agency approval, audit log viewer
    staff/                                    # (currently empty — placeholder)
  lib/
    rag.ts                   # RAG pipeline: embed query → Pinecone → GPT-4-turbo
    vectorDb.ts              # Pinecone client
    credentialParser.ts      # OCR → LLM extraction → typed result
    credentialHelpers.ts, credentialValidation.ts, credentialReminders.ts
    credentialEmails.ts
    agentTools/              # Tool definitions for the credential agent
    ocr.ts                   # Tesseract + pdf-parse wrapper
    auth.ts, authContext.tsx, authHelpers.ts, chatbotAuth.ts
    auditLog.ts              # HIPAA-grade event log → EventLog table
    encryption.ts            # AES-256-CBC, never log plaintext
    rateLimit.ts             # Per-route-class limiters
    s3.ts                    # Presigned upload/download helpers
    stripe.ts, subscriptionHelpers.ts
    queryCache.ts            # Cached RAG responses to cut OpenAI spend
    jobQueue.ts              # Async credential parsing jobs
    db.ts                    # Singleton PrismaClient (always import from here)
    env.ts                   # Validated env loader
prisma/
  schema.prisma              # 33 models — read this before changing data shape
  migrations/                # Prisma migrations (deploy with db:migrate)
  seed.ts
scripts/                     # One-off ops (import-content-to-db, fix-internal-links, list-users)
src/scripts/
  generate-embeddings.ts     # rag:generate
  test-rag.ts                # rag:test
  create-platform-admin.ts   # create-admin
markdown_files/              # Internal design docs (CREDENTIAL_AGENT_*, PHASE_*, HIPAA_AUDIT_CHECKLIST)
```

---

## 4. Data model — the 30-second briefing

Tenancy spine: **`Agency` (1) → `User` (M) → `StaffMember` (M) → `StaffCredential` (M) → `DocumentType` (1)**.

Roles (`UserRole` enum): `AGENCY_USER`, `AGENCY_ADMIN`, `SUPERADMIN`, `PLATFORM_ADMIN`. Middleware + every API route must enforce. Never trust the client.

Plan gates (`PlanType` enum): `FREE | PRO | BUSINESS | ENTERPRISE`. `queriesThisMonth` resets on `billingPeriodStart` rollover via cron — don't reset elsewhere.

Credential lifecycle (`DocumentStatus`): `MISSING → PENDING_REVIEW → ACTIVE → EXPIRING_SOON → EXPIRED` (or `ARCHIVED`). State transitions live in `credentialHelpers.ts`. Reminder jobs live in `credentialReminders.ts` and run from `/api/cron`.

RAG: `KnowledgeBaseArticle` is canonical content; `VectorEmbedding` is the chunk-level mirror that goes to Pinecone via `npm run rag:generate`. **Pinecone and Postgres can drift** — re-run embeddings after any KB content edit.

Audit: every meaningful action goes through `auditLog.ts` → `EventLog`. Add new event types to the union in that file, don't invent strings inline.

Encrypted fields: anything written through `encryption.ts`. Never `console.log` the plaintext, never store the key in the repo, rotate via re-encryption migration (not yet built — flag if needed).

---

## 5. HIPAA guardrails — non-negotiable

This app is positioned as HIPAA-aware. Treat it that way.

- **No PHI in logs.** Not in `console.log`, not in error messages returned to the client, not in audit log payloads. `auditLog.ts` already strips this — use it.
- **No PHI in prompts you don't control.** Don't paste credential file contents into ad-hoc chat — use the parsing pipeline, which runs through OpenAI under the BAA assumption (verify BAA status before claiming compliance).
- **Encryption at rest:** S3 (AWS-managed), Postgres (provider-managed), application-layer for sensitive fields via `encryption.ts`.
- **Access control:** every API route checks `getServerSession` + role + agency-scope. If you write a new route and it doesn't, that's a bug.
- **Audit everything that touches PHI:** read, write, export, share.
- **Retention:** credential files persist per agency policy; we don't auto-delete. Don't add deletion endpoints without a compliance review.
- **Cross-tenant queries are forbidden.** Always filter by `agencyId` from the session, never from the request body.
- See `markdown_files/HIPAA_AUDIT_CHECKLIST.md` and `markdown_files/COMPLIANCE.md` before touching anything in this category.

---

## 6. Local dev — the actual workflow

```bash
# First time
npm install                          # postinstall runs prisma generate
cp .env.example .env                 # fill in DATABASE_URL, NEXTAUTH_SECRET, OPENAI_API_KEY,
                                     # PINECONE_API_KEY, STRIPE_*, AWS_*, ENCRYPTION_KEY, UPSTASH_*
npx prisma migrate deploy            # apply migrations
npm run db:seed                      # categories + sample products
npm run create-admin                 # create a PLATFORM_ADMIN (local DB)
# To create a platform admin on production, use DIRECT_DATABASE_URL (not DATABASE_URL —
# the PG* vars in .env take priority over DATABASE_URL and will override it):
# DIRECT_DATABASE_URL="postgresql://postgres:<password>@shinkansen.proxy.rlwy.net:21055/railway" npm run create-admin
npm run rag:generate                 # build Pinecone index from KB articles

# Daily
npm run dev                          # next dev on :3000
npm run lint
npx tsc --noEmit                     # type-check without emitting
npm run rag:test                     # smoke-test RAG pipeline

# DB
npx prisma studio
npx prisma migrate dev --name <slug> # creates + applies a new migration

# Docker parity
./test-docker-build.sh
docker-compose up
```

Sandra's local DB on her Mac: `postgresql://sandraabago@localhost:5432/marketplace_dev` (per `.claude/settings.local.json`). Don't hardcode this — use `DATABASE_URL`.

---

## 7. Coding conventions

- **TypeScript strict.** No `any` unless commented and justified. Prefer Zod (`zod` is in deps) for runtime validation at API boundaries — see `src/lib/validation.ts`.
- **Prisma:** import the singleton from `src/lib/db.ts`, never `new PrismaClient()`. Avoid N+1 — use `include` / `select` deliberately.
- **API routes:** always `try/catch`, always return typed JSON, never leak stack traces to the client. Use `NextResponse.json({ error }, { status })` patterns already in the codebase.
- **Server vs. client:** keep secrets server-only. `src/lib/serverSettings.ts` and `src/lib/serverUtils.ts` are server-only — don't import them from client components.
- **Components:** colocated by feature in `src/components/{documents,employee,admin,staff}/`. New customer-facing components go at the top level only if shared across features.
- **Styling:** Tailwind. Don't add a competing CSS system.
- **Forms:** prefer server actions or fetch-to-API-route. Don't introduce a new form library.
- **Testing:** `src/lib/__tests__/` exists but coverage is thin. Write tests for any change in `auditLog`, `encryption`, `credentialParser`, `rag`, `auth*`, or anything plan-gated.

---

## 8. Common workflows — the right way

**Adding a new credential type**
1. Insert into `DocumentType` (admin UI or seed).
2. If it needs custom parsing, extend `credentialParser.ts` and add a structured-output schema.
3. Update reminder cadence in `credentialReminders.ts` if non-default.
4. Add to compliance score weighting in `ComplianceScoreWidget.tsx`.

**Adding a new RAG content category**
1. Drop markdown into `src/content/...`.
2. Run `scripts/import-content-to-db.ts` (verify with `verify-import.ts` and `verify-links.ts`).
3. Run `npm run rag:generate` to refresh embeddings.
4. Run `npm run rag:test` with representative queries.

**Adding a new role-gated API route**
1. Create the handler in `src/app/api/...`.
2. Add the path pattern + required role to `middleware.ts`.
3. Inside the handler, re-check role + `agencyId` scope (defense in depth).
4. Wrap the action with `auditLog.logEvent(...)`.
5. Apply the right rate limiter from `rateLimit.ts`.

**Schema change**
1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <slug>` locally.
3. Update any affected `include`/`select`, server actions, and types.
4. If touching encrypted or audited fields, write/extend a test.
5. Commit migration files. Deploy applies via `db:migrate`.

---

## 9. Things that will burn time if you forget

- **Pinecone drift:** edit KB → forget `rag:generate` → chatbot answers from stale content. Always re-embed after content changes.
- **`ENCRYPTION_KEY` length:** must be 64 hex chars (32 bytes). Wrong length = silent decrypt failures in prod.
- **NextAuth + middleware:** new routes default to **protected**. If a public route 401s, add it to the `publicRoutes` array in `middleware.ts`.
- **Stripe webhooks in dev:** use `stripe listen --forward-to localhost:3000/api/webhook` or events won't fire.
- **Upstash limits:** without `UPSTASH_REDIS_REST_URL` / `_TOKEN`, rate limiting silently no-ops. Verify in prod.
- **OpenAI cost:** the chatbot is the #1 spend line. `queryCache.ts` exists — use it. Don't bypass the cache for "freshness."
- **Cron jobs:** credential reminders + plan-quota resets run from `/api/cron/*`. They need an external scheduler (Railway cron / Vercel cron / external) — don't assume they self-trigger.
  All routes require `Authorization: Bearer <CRON_SECRET>` header. On Railway, set up 4 separate services (one per job), each connected to the same repo with a curl start command and a cron schedule:
  | Service | Schedule | Endpoint | Purpose |
  |---|---|---|---|
  | `cron-refresh-credentials` | `0 8 * * *` | `/api/cron/refresh-credential-status` | Recalculates credential statuses (expired, expiring soon) for all agencies daily |
  | `cron-process-reminders` | `0 9 * * *` | `/api/cron/process-reminders` | Sends expiration reminder emails to staff whose credentials are expiring or expired |
  | `cron-weekly-digest` | `0 10 * * 1` | `/api/cron/weekly-digest` | Sends weekly compliance summary emails to agency admins every Monday |
  | `cron-process-parsing` | `*/5 * * * *` | `/api/cron/process-parsing` | Processes queued AI/OCR credential parsing jobs (only needed once agencies upload credentials) |
  Start command format: `curl -s -X GET http://<service-name>.railway.internal:3000/api/cron/<endpoint> -H "Authorization: Bearer <CRON_SECRET>"`
- **`.env` vs `.env.production` vs `.env.rag.example`:** three are committed (without secrets). Real secrets live only in the deployment platform.

---

## 10. Things to NEVER do
- Commit or push to git
- Commit secrets. `.env*` are gitignored except the examples — keep it that way.
- Bypass `middleware.ts` auth by reading auth state in client components only.
- Cross-tenant queries (filtering by request-supplied `agencyId` instead of session-supplied).
- Log PHI, credential content, parsed AI output, or encryption keys.
- `prisma db push` against production. Always migrate.
- Add a new ORM, auth library, or state manager. We have Prisma, NextAuth, Zustand. Pick from the menu.
- Hand-roll Stripe state. Read it from the webhook → DB; never trust the client.
- Inflate the `markdown_files/` graveyard with another `PHASE_X_COMPLETION_REPORT.md` unless Sandra asks.
- Ship "AI features" without plan-gating + rate-limiting + audit logging. All three, every time.

---

## 11. ROI lens (Sandra's global rule, applied here)

When proposing changes, frame them in:
- **Time saved** per agency per week (e.g., credential auto-parsing = ~3 min → 15 sec per doc × N docs/month).
- **Cost saved** vs. manual ops (compliance audit prep, missed expirations, churn).
- **Revenue impact** (which plan tier does this unlock or upsell into?).
- **Risk reduced** (HIPAA exposure, expired-credential liability, billing leakage).

If a proposed change doesn't move one of these, push back before building.

---

## 12. Where to look first

| Question | File |
|---|---|
| What's a model's shape? | `prisma/schema.prisma` |
| How does auth work? | `src/middleware.ts` + `src/lib/auth.ts` |
| How does the chatbot answer? | `src/lib/rag.ts` → `src/app/api/chatbot/query/route.ts` |
| How does credential parsing work? | `src/lib/credentialParser.ts` + `src/lib/agentTools/` |
| How are subscriptions enforced? | `src/lib/subscriptionHelpers.ts` + `src/app/api/webhook/` |
| What's logged for HIPAA? | `src/lib/auditLog.ts` (event-type union is the spec) |
| What env vars exist? | `.env.example` + `src/lib/env.ts` |
| Past design decisions? | `markdown_files/CREDENTIAL_AGENT_*` + `HIPAA_AUDIT_CHECKLIST.md` |

---

## 13. Open questions / known soft spots

- `src/components/staff/` is empty — likely a stub from a refactor. Confirm before adding to it.
- Three `marketplace-auth*.zip` backups in the repo root are tech debt. Move out or git-rm.
- `markdown_files/` has 50+ docs, many overlapping (`CREDENTIAL_AGENT_OVERVIEW.md` through `OVERVIEW3.md`). Worth a consolidation pass.
- No CI config visible at the root (no `.github/workflows`). If shipping to production agencies, GitHub Actions for `tsc + lint + prisma validate` is a one-hour win.
- `aiParsedBy` records the model name on `StaffCredential` — confirm we're rotating off `gpt-4-turbo` to a current model when cost/quality justifies (audit `rag.ts` `CHAT_MODEL` constant too).

---

*Last updated: 2026-04-19. Update this file when stack, tenancy model, or HIPAA posture changes — not when individual features ship.*
