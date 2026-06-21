# Dockerfile for apps/credtrack
# Build context must be monorepo root:
#   docker build -f apps/credtrack/Dockerfile .

# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mhc/package.json ./apps/mhc/
COPY apps/credtrack/package.json ./apps/credtrack/
COPY packages/db/package.json ./packages/db/
COPY packages/credential-core/package.json ./packages/credential-core/
COPY prisma ./prisma

# --ignore-scripts prevents packages/db postinstall from failing
# under frozen-lockfile. prisma generate runs explicitly in builder stage.
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/mhc/node_modules ./apps/mhc/node_modules
COPY --from=deps /app/apps/credtrack/node_modules ./apps/credtrack/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/credential-core/node_modules ./packages/credential-core/node_modules 2>/dev/null || true

COPY . .

RUN npx prisma generate --schema=./prisma/schema.prisma

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV SKIP_ENV_VALIDATION=1

RUN pnpm --filter @credtrack/app build

# ── Stage 3: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client curl poppler-utils

# Next.js standalone output for monorepo — server.js at:
#   apps/credtrack/.next/standalone/apps/credtrack/server.js
COPY --from=builder /app/apps/credtrack/.next/standalone ./
COPY --from=builder /app/apps/credtrack/.next/static ./apps/credtrack/.next/static
COPY --from=builder /app/apps/credtrack/public ./apps/credtrack/public

# Prisma schema for runtime `prisma generate`
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

COPY apps/credtrack/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
