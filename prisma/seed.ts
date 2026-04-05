import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed system-wide document types
  const documentTypes = [
    {
      name: 'CORI (Criminal Background Check)',
      description: 'Criminal Offender Record Information check required for healthcare workers',
      expirationDays: 365, // 1 year
      reminderDays: [30, 14, 7],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'HHA Certificate',
      description: 'Home Health Aide certification',
      expirationDays: 730, // 2 years
      reminderDays: [60, 30, 14],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'CPR Certification',
      description: 'Cardiopulmonary Resuscitation certification',
      expirationDays: 730, // 2 years
      reminderDays: [60, 30, 14],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'First Aid Certification',
      description: 'Basic First Aid training and certification',
      expirationDays: 730, // 2 years
      reminderDays: [60, 30, 14],
      isRequired: false,
      isGlobal: true,
    },
    {
      name: 'TB Test',
      description: 'Tuberculosis screening test',
      expirationDays: 365, // 1 year
      reminderDays: [30, 14, 7],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'RN License',
      description: 'Registered Nurse state license',
      expirationDays: 730, // 2 years (varies by state)
      reminderDays: [90, 60, 30],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'LPN License',
      description: 'Licensed Practical Nurse state license',
      expirationDays: 730, // 2 years (varies by state)
      reminderDays: [90, 60, 30],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'Physical Exam',
      description: 'Annual physical examination',
      expirationDays: 365, // 1 year
      reminderDays: [30, 14],
      isRequired: true,
      isGlobal: true,
    },
    {
      name: 'COVID-19 Vaccination',
      description: 'COVID-19 vaccination record',
      expirationDays: null, // No expiration
      reminderDays: [],
      isRequired: false,
      isGlobal: true,
    },
    {
      name: 'Flu Vaccination',
      description: 'Annual influenza vaccination',
      expirationDays: 365, // 1 year
      reminderDays: [60, 30],
      isRequired: false,
      isGlobal: true,
    },
    {
      name: 'Hepatitis B Vaccination',
      description: 'Hepatitis B vaccination series',
      expirationDays: null, // No expiration
      reminderDays: [],
      isRequired: false,
      isGlobal: true,
    },
    {
      name: 'Driver\'s License',
      description: 'Valid driver\'s license',
      expirationDays: 1825, // 5 years (varies by state)
      reminderDays: [90, 60, 30],
      isRequired: false,
      isGlobal: true,
    },
    {
      name: 'Auto Insurance',
      description: 'Proof of automobile insurance',
      expirationDays: 180, // 6 months
      reminderDays: [30, 14, 7],
      isRequired: false,
      isGlobal: true,
    },
    {
      name: 'Professional Liability Insurance',
      description: 'Professional liability/malpractice insurance',
      expirationDays: 365, // 1 year
      reminderDays: [60, 30, 14],
      isRequired: false,
      isGlobal: true,
    },
  ];

  console.log('📄 Creating system-wide document types...');

  for (const docType of documentTypes) {
    const existing = await prisma.documentType.findFirst({
      where: {
        name: docType.name,
        isGlobal: true,
      },
    });

    if (!existing) {
      await prisma.documentType.create({
        data: docType,
      });
      console.log(`✅ Created: ${docType.name}`);
    } else {
      console.log(`⏭️  Skipped (already exists): ${docType.name}`);
    }
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
