# Dockerfile for apps/mhc
# Build context must be monorepo root:
#   docker build -f apps/mhc/Dockerfile .

# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests only (layer-cache friendly)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mhc/package.json ./apps/mhc/
COPY apps/credtrack/package.json ./apps/credtrack/
COPY packages/db/package.json ./packages/db/
COPY packages/credential-core/package.json ./packages/credential-core/

# Copy prisma schema so postinstall can reference it (but skip running it)
COPY prisma ./prisma

# Ensure package-level node_modules dirs exist so builder COPY steps never fail
RUN mkdir -p packages/db/node_modules packages/credential-core/node_modules

# --ignore-scripts prevents packages/db postinstall from trying to run
# `prisma generate` during install (it fails in frozen-lockfile mode).
# We run `prisma generate` explicitly in the builder stage instead.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Copy installed node_modules from deps stage (root + per-app)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/mhc/node_modules ./apps/mhc/node_modules
COPY --from=deps /app/apps/credtrack/node_modules ./apps/credtrack/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/credential-core/node_modules ./packages/credential-core/node_modules

# Copy full source
COPY . .

# Generate Prisma client now that full source + node_modules are present
RUN PRISMA_GENERATE_SKIP_AUTOINSTALL=1 ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV SKIP_ENV_VALIDATION=1

RUN pnpm --filter @mhc/app build

# ── Stage 3: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client curl poppler-utils

# Next.js standalone output — with monorepo, server.js lands at:
#   apps/mhc/.next/standalone/apps/mhc/server.js
# The standalone folder is self-contained with its own node_modules.
COPY --from=builder /app/apps/mhc/.next/standalone ./
COPY --from=builder /app/apps/mhc/.next/static ./apps/mhc/.next/static
COPY --from=builder /app/apps/mhc/public ./apps/mhc/public

# Prisma schema + migrations for runtime `prisma migrate deploy`
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Scripts + content for background import job
COPY --from=builder /app/apps/mhc/scripts ./apps/mhc/scripts
COPY --from=builder /app/apps/mhc/src/content ./apps/mhc/src/content
COPY --from=builder /app/apps/mhc/src/lib ./apps/mhc/src/lib
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

COPY apps/mhc/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
