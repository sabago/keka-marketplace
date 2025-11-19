#!/bin/sh
set -e

echo "🚀 Starting deployment process..."

# Railway sets PGPORT=5432 which conflicts with Next.js PORT
# Ensure Next.js uses port 3000
export PORT=3000

# Start background tasks immediately (Prisma generation, migrations, imports)
# This ensures the server starts quickly for healthcheck
(
  # Generate Prisma Client with runtime DATABASE_URL
  echo "🔧 Generating Prisma Client for runtime database..."
  ./node_modules/.bin/prisma generate

  # Wait for database to be ready using Railway's PGHOST variable
  echo "⏳ Waiting for database to be ready..."
  DB_HOST="${PGHOST:-localhost}"
  DB_USER="${PGUSER:-postgres}"
  
  until pg_isready -h "$DB_HOST" -U "$DB_USER" 2>/dev/null; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done

  echo "✅ Database is ready!"

  # Run Prisma migrations
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy

  # Import content articles (only if not already imported)
  echo "📚 Checking and importing content articles if needed..."
  tsx scripts/import-content-to-db.ts || echo "⚠️  Content import skipped or failed"

  echo "✅ Background tasks complete!"
) &

# Start the Next.js server immediately (before background tasks complete)
echo "🚀 Starting Next.js server on port 3000..."
exec node server.js
