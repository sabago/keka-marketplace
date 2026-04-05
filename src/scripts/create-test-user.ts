/**
 * Script to create a test user with hashed password
 *
 * Usage:
 *   npx tsx src/scripts/create-test-user.ts
 */

import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { UserRole, PlanType, SubscriptionStatus, AgencySize } from '@prisma/client';

async function createTestUser() {
  try {
    console.log('Creating test agency and user...');

    // First, create a test agency
    const agency = await prisma.agency.upsert({
      where: {
        licenseNumber: 'TEST-LICENSE-001',
      },
      update: {},
      create: {
        agencyName: 'Test Home Health Agency',
        licenseNumber: 'TEST-LICENSE-001',
        subscriptionPlan: PlanType.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        agencySize: AgencySize.SMALL,
        primaryContactName: 'Test Contact',
        primaryContactRole: 'Administrator',
        primaryContactEmail: 'test@example.com',
        serviceArea: ['Boston', 'Cambridge', 'Somerville'],
        servicesOffered: ['Skilled Nursing', 'Physical Therapy', 'Occupational Therapy'],
      },
    });

    console.log(`✓ Agency created: ${agency.agencyName} (ID: ${agency.id})`);

    // Hash the password
    const hashedPassword = await hash('password123', 12);

    // Create a test user
    const user = await prisma.user.upsert({
      where: {
        email: 'test@example.com',
      },
      update: {
        password: hashedPassword,
        role: UserRole.AGENCY_ADMIN,
        agencyId: agency.id,
      },
      create: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: UserRole.AGENCY_ADMIN,
        agencyId: agency.id,
        emailVerified: new Date(),
      },
    });

    console.log(`✓ User created: ${user.email} (ID: ${user.id})`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Agency: ${agency.agencyName}`);
    console.log(`\nTest Credentials:`);
    console.log(`  Email: test@example.com`);
    console.log(`  Password: password123`);

    // Create a platform admin user
    const adminHashedPassword = await hash('admin123', 12);

    const adminUser = await prisma.user.upsert({
      where: {
        email: 'admin@example.com',
      },
      update: {
        password: adminHashedPassword,
        role: UserRole.PLATFORM_ADMIN,
      },
      create: {
        email: 'admin@example.com',
        name: 'Platform Admin',
        password: adminHashedPassword,
        role: UserRole.PLATFORM_ADMIN,
        emailVerified: new Date(),
      },
    });

    console.log(`\n✓ Admin user created: ${adminUser.email} (ID: ${adminUser.id})`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`\nAdmin Credentials:`);
    console.log(`  Email: admin@example.com`);
    console.log(`  Password: admin123`);

    console.log('\n✅ Test users created successfully!');
    console.log('\nYou can now sign in at: http://localhost:3000/auth/signin');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestUser()
  .then(() => {
    console.log('\n✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
