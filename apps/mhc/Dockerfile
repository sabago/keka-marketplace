# Dockerfile for apps/mhc
# Build context must be monorepo root:
#   docker build -f apps/mhc/Dockerfile .

# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV SKIP_ENV_VALIDATION=1

# Copy everything — prisma generate postinstall needs schema + source
COPY . .

# Install without scripts — no postinstall hooks can run pnpm add under frozen lockfile
RUN pnpm install --frozen-lockfile --ignore-scripts

# Run prisma generate explicitly after install completes
RUN PRISMA_GENERATE_SKIP_AUTOINSTALL=1 node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

RUN pnpm --filter @mhc/app build

# ── Stage 2: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client curl poppler-utils

COPY --from=builder /app/apps/mhc/.next/standalone ./
COPY --from=builder /app/apps/mhc/.next/static ./apps/mhc/.next/static
COPY --from=builder /app/apps/mhc/public ./apps/mhc/public

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

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
