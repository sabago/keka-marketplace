# Dockerfile for Next.js with Prisma and Content Import

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and prisma schema (needed for postinstall)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Accept DATABASE_URL as build argument (Railway will provide this)
# Default to Docker PostgreSQL for local builds
ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/marketplace_docker

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Replace DATABASE_URL in .env.production with the build-time DATABASE_URL
# This ensures the Next.js standalone build uses the correct database
RUN sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env.production

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install PostgreSQL client for database connectivity check
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations
COPY --from=builder /app/prisma ./prisma

# Copy full node_modules from builder (needed for import script dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy scripts and content
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/content ./src/content
COPY --from=builder /app/src/lib ./src/lib

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Install tsx for running TypeScript scripts
RUN npm install -g tsx

# Note: Running as root for entrypoint script (needs permissions for migrations/imports)
# Production deployments can add USER nextjs if needed after setup

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use custom entrypoint that runs migrations + import + starts server
ENTRYPOINT ["./docker-entrypoint.sh"]
