# Dockerfile for apps/credtrack
# Build context must be monorepo root:
#   docker build -f apps/credtrack/Dockerfile .

# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000

ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=${DATABASE_URL}
ENV SKIP_ENV_VALIDATION=1

COPY . .

RUN npm ci

RUN PRISMA_GENERATE_SKIP_AUTOINSTALL=1 node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

RUN npm run build --workspace=apps/credtrack

# ── Stage 2: Runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache postgresql-client curl poppler-utils

# Install prisma CLI standalone so migrate deploy works at runtime
RUN npm install --prefix /prisma-tools prisma@6.19.3 --no-save

COPY --from=builder /app/apps/credtrack/.next/standalone ./
COPY --from=builder /app/apps/credtrack/.next/static ./apps/credtrack/.next/static
COPY --from=builder /app/apps/credtrack/public ./apps/credtrack/public

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY apps/credtrack/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
