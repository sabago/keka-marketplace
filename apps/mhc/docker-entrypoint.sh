#!/bin/sh
set -e

echo "Starting MHC..."

export PORT=${PORT:-3000}
export HOSTNAME="0.0.0.0"

echo "Waiting for database..."
DB_HOST="${PGHOST:-localhost}"
DB_USER="${PGUSER:-postgres}"
until pg_isready -h "$DB_HOST" -U "$DB_USER" 2>/dev/null; do
  echo "Database unavailable - retrying..."
  sleep 2
done
echo "Database ready."

echo "Running migrations..."
/prisma-tools/node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

# Content import in background after server starts
(
  echo "Importing knowledge base content..."
  /prisma-tools/node_modules/.bin/tsx apps/mhc/scripts/import-content-to-db.ts || echo "Content import skipped or failed"
) &

echo "Starting Next.js on $HOSTNAME:$PORT..."
exec node apps/mhc/server.js
