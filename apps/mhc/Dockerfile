# Dockerfile for apps/mhc
# Build context: monorepo root (docker build -f apps/mhc/Dockerfile .)

# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mhc/package.json ./apps/mhc/
COPY apps/credtrack/package.json ./apps/credtrack/
COPY packages/db/package.json ./packages/db/
COPY packages/credential-core/package.json ./packages/credential-core/

# Copy prisma schema (needed for postinstall prisma generate)
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

# ── Stage 2: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/mhc/node_modules ./apps/mhc/node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm --filter @mhc/app build

# ── Stage 3: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client curl poppler-utils
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy built app
COPY --from=builder /app/apps/mhc/.next/standalone ./
COPY --from=builder /app/apps/mhc/.next/static ./apps/mhc/.next/static
COPY --from=builder /app/apps/mhc/public ./apps/mhc/public

# Copy prisma for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy scripts + content for import-content-to-db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/apps/mhc/src/content ./apps/mhc/src/content
COPY --from=builder /app/apps/mhc/src/lib ./apps/mhc/src/lib

RUN npm install -g tsx

COPY apps/mhc/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
