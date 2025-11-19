#!/bin/sh
set -e

echo "🚀 Starting deployment process..."

# Generate Prisma Client with runtime DATABASE_URL first
echo "🔧 Generating Prisma Client for runtime database..."
./node_modules/.bin/prisma generate

# Start the server immediately to pass healthcheck
# Then run migrations and imports in background
(
  # Wait for database to be ready
  echo "⏳ Waiting for database to be ready..."
  until pg_isready -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p') -U $(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p') 2>/dev/null; do
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

# Start the Next.js server immediately
echo "🚀 Starting Next.js server..."
exec node server.js
