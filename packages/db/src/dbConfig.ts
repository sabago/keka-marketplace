// Constructs a DATABASE_URL from individual PostgreSQL environment variables.
// Useful when deploying to platforms like Railway that provide these variables separately.

export function getConnectionString(): string {
  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }

  const pgHost = process.env.PGHOST;
  const pgUser = process.env.PGUSER;
  const pgPassword = process.env.PGPASSWORD;
  const pgDatabase = process.env.PGDATABASE;
  const pgPort = process.env.PGPORT;

  if (pgHost && pgUser && pgPassword && pgDatabase && pgPort) {
    return `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
  }

  return process.env.MARKETPLACE_DATABASE_URL || process.env.DATABASE_URL || '';
}
