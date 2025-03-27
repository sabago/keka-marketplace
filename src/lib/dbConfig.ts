// This file constructs a DATABASE_URL from individual PostgreSQL environment variables
// This is useful when deploying to platforms like Railway that provide these variables separately

export function getConnectionString(): string {
  // Check if we have individual PostgreSQL environment variables
  const pgHost = process.env.PGHOST;
  const pgUser = process.env.PGUSER;
  const pgPassword = process.env.PGPASSWORD;
  const pgDatabase = process.env.PGDATABASE;
  const pgPort = process.env.PGPORT;

  // If we have all the individual variables, construct a connection string
  if (pgHost && pgUser && pgPassword && pgDatabase && pgPort) {
    return `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
  }

  // Otherwise, use the DATABASE_URL environment variable
  return process.env.DATABASE_URL || '';
}
