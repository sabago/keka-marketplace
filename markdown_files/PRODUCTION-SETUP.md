# Production Setup Guide

This document outlines the steps taken to set up the production environment for the marketplace application on Railway.

## PostgreSQL Database Setup

### 1. Database Connection Configuration

We've implemented a flexible database connection system that works both locally and in production:

- Created a `dbConfig.ts` helper that intelligently constructs a database connection string from:
  - `DIRECT_DATABASE_URL` environment variable (if available)
  - Individual PostgreSQL environment variables (PGHOST, PGUSER, etc.)
  - `DATABASE_URL` environment variable as a fallback

```typescript
// src/lib/dbConfig.ts
export function getConnectionString(): string {
  // First, check if we have a direct database URL (for external connections)
  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }
  
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
```

### 2. Environment Variables

The following environment variables are used for database connection:

- For Railway's internal connection (used by the application):
  ```
  DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
  PGHOST="postgres.railway.internal"
  PGUSER="postgres"
  PGPASSWORD="your-password"
  PGDATABASE="railway"
  PGPORT="5432"
  ```

- For external connection (used for migrations and seeding):
  ```
  DIRECT_DATABASE_URL="postgresql://postgres:password@hostname.proxy.rlwy.net:port/railway"
  ```

### 3. Database Migrations

Database migrations are handled by Prisma and are automatically applied during the Railway deployment process.

To manually apply migrations:

```bash
npx prisma migrate deploy
```

### 4. Database Seeding

To seed the database with initial data:

```bash
node src/scripts/seed-categories.js
node src/scripts/seed-projects.js
```

## Node.js Version

The application requires Node.js >= 18.18 due to dependencies like Prisma 6.5.0. We've configured this using:

- `.node-version` file with version 18.17.0
- `.nvmrc` file with version 18.17.0

## Deployment Process

### Automatic Deployment (via GitHub)

Railway can be configured to automatically deploy when changes are pushed to a specific branch of your GitHub repository. This is the recommended approach:

1. Update the code and commit changes
2. Push to GitHub
3. Railway automatically detects the changes and starts a new deployment
4. Verify the deployment by checking the logs in Railway

You can use the `deploy.sh` script to automate this process:

```bash
./deploy.sh
```

### Manual Deployment

If automatic deployment is not set up or not working, you can manually deploy from the Railway dashboard:

1. Update the code and commit changes
2. Push to GitHub
3. Go to the [Railway dashboard](https://railway.app/dashboard)
4. Select your project (keka-marketplace)
5. Click on the "Deploy" or "Redeploy" button
6. Wait for the deployment to complete
7. Verify the deployment by checking the logs in Railway

### Verifying the Deployment

After deployment, you can verify that the database connection is working correctly by visiting:

```
https://keka-marketplace-production.up.railway.app/api/test-db
```

This endpoint will return information about the database connection and the number of categories in the database.

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify the database connection string in the Railway dashboard
2. Check the logs for any error messages
3. Ensure the database is running and accessible
4. Try connecting to the database using a PostgreSQL client

### Prisma Issues

If you encounter Prisma-related issues:

1. Ensure you're using Node.js >= 18.18
2. Try regenerating the Prisma client: `npx prisma generate`
3. Check the Prisma schema for any errors: `npx prisma validate`
