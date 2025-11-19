#!/bin/sh
set -e

echo "🚀 Starting deployment process..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p') -U $(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p'); do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Import content articles
echo "📚 Importing content articles..."
tsx scripts/import-content-to-db.ts

echo "✅ Import complete!"

# Generate Prisma Client with runtime DATABASE_URL
echo "🔧 Generating Prisma Client for runtime database..."
./node_modules/.bin/prisma generate

# Start the Next.js server
echo "🚀 Starting Next.js server..."
exec node server.js
