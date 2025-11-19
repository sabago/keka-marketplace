#!/bin/sh
set -e

echo "🚀 Starting deployment process..."

# Railway sets PGPORT=5432 which conflicts with Next.js PORT
# Ensure Next.js uses port 3000
export PORT=3000
export HOSTNAME="0.0.0.0"

# CRITICAL: Generate Prisma Client BEFORE starting server
# Next.js cannot start without this
echo "🔧 Generating Prisma Client for runtime database..."
./node_modules/.bin/prisma generate

# Wait for database to be ready BEFORE starting background tasks
echo "⏳ Waiting for database to be ready..."
DB_HOST="${PGHOST:-localhost}"
DB_USER="${PGUSER:-postgres}"

until pg_isready -h "$DB_HOST" -U "$DB_USER" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run Prisma migrations synchronously (needed before server starts)
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Import content articles in background (can happen after server starts)
(
  echo "📚 Checking and importing content articles if needed..."
  tsx scripts/import-content-to-db.ts || echo "⚠️  Content import skipped or failed"
  echo "✅ Content import complete!"
) &

# Start the Next.js server
echo "🚀 Starting Next.js server on $HOSTNAME:$PORT..."
exec node server.js
