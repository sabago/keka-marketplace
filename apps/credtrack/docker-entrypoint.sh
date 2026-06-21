#!/bin/sh
set -e

echo "Starting CredTrack deployment..."

export PORT=${PORT:-3000}
export HOSTNAME="0.0.0.0"

echo "Generating Prisma Client..."
./node_modules/.bin/prisma generate

echo "Waiting for database..."
DB_HOST="${PGHOST:-localhost}"
DB_USER="${PGUSER:-postgres}"
until pg_isready -h "$DB_HOST" -U "$DB_USER" 2>/dev/null; do
  echo "Database unavailable - retrying..."
  sleep 2
done
echo "Database ready."

# CredTrack does NOT run migrations — MHC owns schema migrations.
# Both apps share the same DB; MHC's entrypoint runs `prisma migrate deploy`.

echo "Starting Next.js on $HOSTNAME:$PORT..."
exec node apps/credtrack/server.js
