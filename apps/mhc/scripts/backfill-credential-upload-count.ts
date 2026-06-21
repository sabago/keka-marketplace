/**
 * Backfill credentialUploadsTotal for all agencies.
 *
 * Sets each agency's counter to the actual number of StaffCredential rows
 * (across all statuses, including ARCHIVED) linked to their staff members.
 *
 * Safe to run multiple times — always overwrites with the correct count.
 *
 * Run locally:
 *   npx ts-node scripts/backfill-credential-upload-count.ts
 *
 * Run against production (Railway):
 *   DIRECT_DATABASE_URL="postgresql://postgres:<password>@<host>:<port>/railway" \
 *     npx ts-node scripts/backfill-credential-upload-count.ts
 */
import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  const agencies = await prisma.agency.findMany({
    select: { id: true, credentialUploadsTotal: true },
  });

  console.log(`Found ${agencies.length} agency/agencies.\n`);

  for (const agency of agencies) {
    const actual = await prisma.staffCredential.count({
      where: { staffMember: { agencyId: agency.id } },
    });

    await prisma.agency.update({
      where: { id: agency.id },
      data: { credentialUploadsTotal: actual },
    });

    console.log(
      `${agency.id}: was ${agency.credentialUploadsTotal} → set to ${actual}`
    );
  }

  console.log('\nBackfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
