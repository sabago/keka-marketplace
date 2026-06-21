/**
 * List all users in the system by role and email (no passwords).
 * Run with: npx ts-node scripts/list-users.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      agency: {
        select: {
          agencyName: true,
          subscriptionPlan: true,
          approvalStatus: true,
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  console.log(`\nTotal users: ${users.length}\n`);
  console.log('='.repeat(80));

  for (const user of users) {
    console.log(`Name:    ${user.name ?? '(none)'}`);
    console.log(`Email:   ${user.email}`);
    console.log(`Role:    ${user.role}`);
    console.log(`Agency:  ${user.agency?.agencyName ?? 'N/A'}`);
    console.log(`Plan:    ${user.agency?.subscriptionPlan ?? 'N/A'}`);
    console.log(`Status:  ${user.agency?.approvalStatus ?? 'N/A'}`);
    console.log(`Created: ${user.createdAt.toISOString()}`);
    console.log('-'.repeat(80));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
