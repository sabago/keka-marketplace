# Dockerfile for apps/credtrack
# Build context must be monorepo root:
#   docker build -f apps/credtrack/Dockerfile .

# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3001

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV SKIP_ENV_VALIDATION=1

# Copy everything — prisma generate postinstall needs schema + source
COPY . .

# Install without scripts — no postinstall hooks can run pnpm add under frozen lockfile
RUN pnpm install --frozen-lockfile --ignore-scripts

# Run prisma generate explicitly after install completes
RUN node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

RUN pnpm --filter @credtrack/app build

# ── Stage 2: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client curl poppler-utils

COPY --from=builder /app/apps/credtrack/.next/standalone ./
COPY --from=builder /app/apps/credtrack/.next/static ./apps/credtrack/.next/static
COPY --from=builder /app/apps/credtrack/public ./apps/credtrack/public

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
