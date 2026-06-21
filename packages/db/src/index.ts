import { PrismaClient } from '@prisma/client';
import { getConnectionString } from './dbConfig';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting database connection limits.
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = getConnectionString();

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Guard against stale hot-reload cache
const cached = globalForPrisma.prisma;
const isValid = cached && typeof (cached as any).staffMember !== 'undefined';

export const prisma = isValid ? cached : createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export all generated Prisma types so consumers only need @mhc/db
export * from '@prisma/client';
