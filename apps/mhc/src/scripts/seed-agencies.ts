import { PrismaClient, PlanType, SubscriptionStatus, AgencySize, IntakeMethod, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting agency seed...');

  // Calculate billing period end (30 days from now)
  const billingPeriodEnd = new Date();
  billingPeriodEnd.setDate(billingPeriodEnd.getDate() + 30);

  // Test Agency 1 - Free Plan
  const agency1 = await prisma.agency.upsert({
    where: { licenseNumber: 'LIC-2024-001' },
    update: {},
    create: {
      agencyName: 'Sunshine Home Health Agency',
      licenseNumber: 'LIC-2024-001',
      subscriptionPlan: PlanType.FREE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      queriesThisMonth: 5,
      queriesAllTime: 25,
      billingPeriodEnd: billingPeriodEnd,
      servicesOffered: ['Skilled Nursing', 'Physical Therapy', 'Occupational Therapy'],
      serviceArea: ['Boston', 'Cambridge', 'Somerville'],
      agencySize: AgencySize.SMALL,
      primaryContactName: 'John Smith',
      primaryContactRole: 'Clinical Director',
      primaryContactEmail: 'john.smith@sunshinehha.com',
      primaryContactPhone: '617-555-0001',
      intakeMethod: IntakeMethod.EMAIL,
      avgReferralsPerMonth: 15,
      timeToProcessReferral: 24,
      staffHandlingIntake: 2,
      painPoints: ['Manual data entry', 'Slow response times', 'Paper-based workflows'],
      preferredChannels: ['Email', 'Phone'],
      specializations: ['Post-surgical care', 'Chronic disease management'],
      consentToAnalytics: true,
      consentToProcessRecs: true,
      users: {
        create: [
          {
            email: 'john.smith@sunshinehha.com',
            name: 'John Smith',
            role: UserRole.AGENCY_ADMIN,
            emailVerified: new Date(),
          },
          {
            email: 'sarah.jones@sunshinehha.com',
            name: 'Sarah Jones',
            role: UserRole.AGENCY_USER,
            emailVerified: new Date(),
          },
        ],
      },
    },
  });

  console.log('Created agency 1:', agency1.agencyName);

  // Test Agency 2 - Pro Plan
  const agency2 = await prisma.agency.upsert({
    where: { licenseNumber: 'LIC-2024-002' },
    update: {},
    create: {
      agencyName: 'Metro Care Services',
      licenseNumber: 'LIC-2024-002',
      subscriptionPlan: PlanType.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      stripeCustomerId: 'cus_test_metro123',
      stripeSubscriptionId: 'sub_test_metro456',
      queriesThisMonth: 150,
      queriesAllTime: 1250,
      billingPeriodEnd: billingPeriodEnd,
      servicesOffered: ['Skilled Nursing', 'Physical Therapy', 'Speech Therapy', 'Medical Social Work'],
      serviceArea: ['Worcester', 'Springfield', 'Framingham', 'Newton'],
      agencySize: AgencySize.MEDIUM,
      primaryContactName: 'Maria Garcia',
      primaryContactRole: 'Operations Manager',
      primaryContactEmail: 'maria.garcia@metrocare.com',
      primaryContactPhone: '508-555-0002',
      intakeMethod: IntakeMethod.PORTAL,
      avgReferralsPerMonth: 45,
      timeToProcessReferral: 12,
      staffHandlingIntake: 5,
      painPoints: ['High volume management', 'Need for automation', 'Better analytics'],
      preferredChannels: ['Portal', 'Email', 'API'],
      specializations: ['Pediatric care', 'Palliative care', 'Wound care'],
      consentToAnalytics: true,
      consentToProcessRecs: true,
      users: {
        create: [
          {
            email: 'maria.garcia@metrocare.com',
            name: 'Maria Garcia',
            role: UserRole.AGENCY_ADMIN,
            emailVerified: new Date(),
          },
          {
            email: 'tom.wilson@metrocare.com',
            name: 'Tom Wilson',
            role: UserRole.AGENCY_USER,
            emailVerified: new Date(),
          },
          {
            email: 'linda.chen@metrocare.com',
            name: 'Linda Chen',
            role: UserRole.AGENCY_USER,
            emailVerified: new Date(),
          },
        ],
      },
    },
  });

  console.log('Created agency 2:', agency2.agencyName);

  // Create some sample chatbot queries for agency 1
  await prisma.chatbotQuery.createMany({
    data: [
      {
        agencyId: agency1.id,
        query: 'What skilled nursing facilities accept MassHealth in Boston?',
        response: 'Here are the top skilled nursing facilities in Boston that accept MassHealth...',
        tokensUsed: 450,
        modelUsed: 'gpt-4',
        responseTime: 1200,
        sourcesReturned: { sources: ['article-1', 'article-2', 'article-3'] },
        userRating: 5,
      },
      {
        agencyId: agency1.id,
        query: 'How do I submit a referral to Boston Medical Center?',
        response: 'To submit a referral to Boston Medical Center, you can use their online portal...',
        tokensUsed: 380,
        modelUsed: 'gpt-4',
        responseTime: 1050,
        sourcesReturned: { sources: ['article-4', 'article-5'] },
        userRating: 4,
      },
    ],
  });

  console.log('Created sample chatbot queries for agency 1');

  // Create some sample chatbot queries for agency 2
  await prisma.chatbotQuery.createMany({
    data: [
      {
        agencyId: agency2.id,
        query: 'What are the requirements for pediatric home health in Massachusetts?',
        response: 'Pediatric home health services in Massachusetts require...',
        tokensUsed: 520,
        modelUsed: 'gpt-4',
        responseTime: 1350,
        sourcesReturned: { sources: ['article-6', 'article-7', 'article-8'] },
        userRating: 5,
      },
    ],
  });

  console.log('Created sample chatbot queries for agency 2');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
