import { PrismaClient, DocumentCategory, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// Master DocumentType list for MA home-care agencies
//
// recheckCadenceDays notes:
//   OIG / SAM.gov = 30d  — TODO: verify against MA DPH / 42 CFR 455.436
//   SORI           = 180d — TODO: verify against MA DPH / 101 CMR 15.00
//   CORI           = 365d — standard MA requirement
//   TB Test        = 365d — standard annual screen
//   Licenses       = null — recheck driven by expiration reminder, not fixed cadence
// ----------------------------------------------------------------------------
type SeedDocType = {
  name: string;
  description: string;
  category: DocumentCategory;
  expirationDays: number | null;
  reminderDays: number[];
  isRequired: boolean;
  requiresFrontBack?: boolean;
  allowsMultiPage?: boolean;
  minFiles?: number;
  maxFiles?: number;
  recheckCadenceDays?: number | null;
  aiParsingEnabled?: boolean;
  customFields?: Record<string, string> | null;
};

const documentTypes: SeedDocType[] = [
  // ── LICENSES ────────────────────────────────────────────────────────────────
  {
    name: 'RN License',
    description: 'Registered Nurse state license',
    category: 'LICENSE',
    expirationDays: 730, // 2 years (MA Board of Nursing)
    reminderDays: [90, 60, 30],
    isRequired: true,
  },
  {
    name: 'LPN License',
    description: 'Licensed Practical Nurse state license',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [90, 60, 30],
    isRequired: true,
  },
  {
    name: 'PT License',
    description: 'Physical Therapist state license',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [90, 60, 30],
    isRequired: false,
  },
  {
    name: 'PTA License',
    description: 'Physical Therapist Assistant state license',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [90, 60, 30],
    isRequired: false,
  },
  {
    name: 'OT License',
    description: 'Occupational Therapist state license',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [90, 60, 30],
    isRequired: false,
  },
  {
    name: 'OTA License',
    description: 'Occupational Therapist Assistant state license',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [90, 60, 30],
    isRequired: false,
  },
  {
    name: 'SLP License',
    description: 'Speech-Language Pathologist state license',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [90, 60, 30],
    isRequired: false,
  },
  {
    name: 'HHA Certificate',
    description: 'Home Health Aide certification (MA DPH regulated)',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [60, 30, 14],
    isRequired: true,
  },
  {
    name: 'CNA Certificate',
    description: 'Certified Nursing Assistant certificate',
    category: 'LICENSE',
    expirationDays: 730,
    reminderDays: [60, 30, 14],
    isRequired: false,
  },

  // ── BACKGROUND CHECKS ───────────────────────────────────────────────────────
  {
    name: 'CORI (Criminal Background Check)',
    description: 'Criminal Offender Record Information check required for MA healthcare workers',
    category: 'BACKGROUND_CHECK',
    expirationDays: 365,
    reminderDays: [30, 14, 7],
    isRequired: true,
    recheckCadenceDays: 365, // TODO: verify against MA DPH / 101 CMR 15.00
  },
  {
    name: 'SORI (Sex Offender Registry)',
    description: 'Sex Offender Registry Information check (MA)',
    category: 'BACKGROUND_CHECK',
    expirationDays: 180,
    reminderDays: [30, 14],
    isRequired: true,
    recheckCadenceDays: 180, // TODO: verify against MA DPH / 101 CMR 15.00
  },
  {
    name: 'OIG Exclusion Check',
    description: 'Office of Inspector General exclusion check (required monthly for Medicare/Medicaid)',
    category: 'BACKGROUND_CHECK',
    expirationDays: 30,
    reminderDays: [14, 7],
    isRequired: true,
    recheckCadenceDays: 30, // TODO: verify against 42 CFR 455.436 — OIG recommends monthly
  },
  {
    name: 'SAM.gov Exclusion Check',
    description: 'System for Award Management (federal) exclusion check',
    category: 'BACKGROUND_CHECK',
    expirationDays: 30,
    reminderDays: [14, 7],
    isRequired: true,
    recheckCadenceDays: 30, // TODO: verify — mirrors OIG cadence per typical policy
  },
  {
    name: 'Federal Background Check',
    description: 'Federal-level criminal background check (FBI fingerprint)',
    category: 'BACKGROUND_CHECK',
    expirationDays: 730,
    reminderDays: [90, 30],
    isRequired: false,
    recheckCadenceDays: 730,
  },
  {
    name: 'Sex Offender Registry National',
    description: 'National Sex Offender Public Website (NSOPW) check',
    category: 'BACKGROUND_CHECK',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: false,
    recheckCadenceDays: 365,
  },

  // ── TRAINING ────────────────────────────────────────────────────────────────
  {
    name: 'CPR Certification',
    description: 'Cardiopulmonary Resuscitation certification (BLS or equivalent)',
    category: 'TRAINING',
    expirationDays: 730,
    reminderDays: [60, 30, 14],
    isRequired: true,
  },
  {
    name: 'First Aid Certification',
    description: 'Basic First Aid training and certification',
    category: 'TRAINING',
    expirationDays: 730,
    reminderDays: [60, 30, 14],
    isRequired: false,
  },
  {
    name: 'Bloodborne Pathogens',
    description: 'Annual OSHA bloodborne pathogens training (29 CFR 1910.1030)',
    category: 'TRAINING',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: true,
  },
  {
    name: 'HIPAA Training',
    description: 'Annual HIPAA privacy and security compliance training',
    category: 'TRAINING',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: true,
  },
  {
    name: 'Dementia Training',
    description: 'Dementia care training certification (required for MA AFC/home care)',
    category: 'TRAINING',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: false,
  },
  {
    name: 'Infection Control',
    description: 'Infection control and prevention training',
    category: 'TRAINING',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: true,
  },
  {
    name: 'Orientation & Annual Training Checklist',
    description: 'Completed orientation checklist and annual in-service training record',
    category: 'TRAINING',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: true,
  },
  {
    name: 'Continuing Education',
    description: 'Continuing education credits (CE hours)',
    category: 'TRAINING',
    expirationDays: 365,
    reminderDays: [60, 30],
    isRequired: false,
    customFields: { ceHours: 'number' },
  },

  // ── VACCINATIONS / HEALTH ───────────────────────────────────────────────────
  {
    name: 'COVID-19 Vaccination',
    description: 'COVID-19 vaccination record',
    category: 'VACCINATION',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },
  {
    name: 'Flu Vaccination',
    description: 'Annual influenza vaccination',
    category: 'VACCINATION',
    expirationDays: 365,
    reminderDays: [60, 30],
    isRequired: false,
  },
  {
    name: 'TB Test',
    description: 'Tuberculosis screening test (annual)',
    category: 'VACCINATION',
    expirationDays: 365,
    reminderDays: [30, 14, 7],
    isRequired: true,
    recheckCadenceDays: 365, // TODO: verify — some roles require 2-step initially
  },
  {
    name: 'Hepatitis B Vaccination',
    description: 'Hepatitis B vaccination series (3 doses)',
    category: 'VACCINATION',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },
  {
    name: 'MMR',
    description: 'Measles, Mumps, and Rubella vaccination or titer proof',
    category: 'VACCINATION',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },
  {
    name: 'Varicella',
    description: 'Varicella (chickenpox) vaccination or immunity titer',
    category: 'VACCINATION',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },
  {
    name: 'Tdap',
    description: 'Tetanus, Diphtheria, Pertussis booster (every 10 years)',
    category: 'VACCINATION',
    expirationDays: 3650, // 10 years
    reminderDays: [180, 90, 30],
    isRequired: false,
  },
  {
    name: 'Immunization Record Composite',
    description: 'Complete immunization history record (composite document)',
    category: 'VACCINATION',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
    allowsMultiPage: true,
    maxFiles: 10,
  },
  {
    name: 'Physical Exam',
    description: 'Annual physical examination (may span multiple pages)',
    category: 'VACCINATION',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: true,
    allowsMultiPage: true,
    maxFiles: 5,
  },

  // ── HR DOCUMENTS ────────────────────────────────────────────────────────────
  {
    name: 'Resume',
    description: 'Staff member resume / CV',
    category: 'HR',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
    allowsMultiPage: true,
    maxFiles: 5,
  },
  {
    name: 'Signed Job Description',
    description: 'Signed acknowledgement of job responsibilities and duties',
    category: 'HR',
    expirationDays: null,
    reminderDays: [],
    isRequired: true,
  },
  {
    name: 'I-9',
    description: 'Employment Eligibility Verification (USCIS Form I-9)',
    category: 'HR',
    expirationDays: null,
    reminderDays: [],
    isRequired: true,
    allowsMultiPage: true,
    maxFiles: 5,
  },
  {
    name: 'W-4',
    description: 'Employee withholding certificate (IRS Form W-4)',
    category: 'HR',
    expirationDays: null,
    reminderDays: [],
    isRequired: true,
  },
  {
    name: 'Offer Letter',
    description: 'Signed employment offer letter',
    category: 'HR',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },
  {
    name: 'Direct Deposit Authorization',
    description: 'Direct deposit setup authorization form',
    category: 'HR',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },

  // ── IDENTIFICATION ──────────────────────────────────────────────────────────
  {
    name: "Driver's License",
    description: "Valid driver's license — upload front AND back",
    category: 'ID',
    expirationDays: 1825, // 5 years (varies by state)
    reminderDays: [90, 60, 30],
    isRequired: false,
    requiresFrontBack: true,
    minFiles: 2,
    maxFiles: 2,
  },
  {
    name: 'State ID',
    description: 'Government-issued state ID card — upload front AND back',
    category: 'ID',
    expirationDays: 1825,
    reminderDays: [90, 60, 30],
    isRequired: false,
    requiresFrontBack: true,
    minFiles: 2,
    maxFiles: 2,
  },
  {
    name: 'Social Security Card',
    description: 'Social Security card (upload one clear image)',
    category: 'ID',
    expirationDays: null,
    reminderDays: [],
    isRequired: false,
  },
  {
    name: 'Passport',
    description: 'Valid US or foreign passport (bio page)',
    category: 'ID',
    expirationDays: 3650, // 10 years
    reminderDays: [180, 90, 30],
    isRequired: false,
  },

  // ── INSURANCE ───────────────────────────────────────────────────────────────
  {
    name: 'Auto Insurance',
    description: 'Proof of automobile insurance — upload declaration page AND ID card',
    category: 'INSURANCE',
    expirationDays: 180, // 6 months
    reminderDays: [30, 14, 7],
    isRequired: false,
    requiresFrontBack: true,
    minFiles: 2,
    maxFiles: 4,
  },
  {
    name: 'Professional Liability Insurance',
    description: 'Professional liability / malpractice insurance certificate',
    category: 'INSURANCE',
    expirationDays: 365,
    reminderDays: [60, 30, 14],
    isRequired: false,
  },
  {
    name: 'Vehicle Registration',
    description: 'Current vehicle registration',
    category: 'INSURANCE',
    expirationDays: 365,
    reminderDays: [60, 30],
    isRequired: false,
  },

  // ── COMPETENCY ──────────────────────────────────────────────────────────────
  {
    name: 'In-service Competency',
    description: 'In-service competency evaluation record',
    category: 'COMPETENCY',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: false,
    allowsMultiPage: true,
    maxFiles: 10,
    customFields: { competencyName: 'string' },
  },
  {
    name: 'Competency Skills Checklist',
    description: 'Completed skills competency checklist (may be multi-page)',
    category: 'COMPETENCY',
    expirationDays: 365,
    reminderDays: [30, 14],
    isRequired: false,
    allowsMultiPage: true,
    maxFiles: 10,
  },
];

async function main() {
  console.log('🌱 Seeding database...');
  console.log('📄 Creating/updating platform-wide document types...');

  let created = 0;
  let updated = 0;

  for (const docType of documentTypes) {
    const existing = await prisma.documentType.findFirst({
      where: {
        name: docType.name,
        isGlobal: true,
      },
    });

    const data = {
      name: docType.name,
      description: docType.description,
      category: docType.category,
      expirationDays: docType.expirationDays ?? null,
      reminderDays: docType.reminderDays,
      isRequired: docType.isRequired,
      requiresFrontBack: docType.requiresFrontBack ?? false,
      allowsMultiPage: docType.allowsMultiPage ?? true,
      minFiles: docType.minFiles ?? 1,
      maxFiles: docType.maxFiles ?? 10,
      recheckCadenceDays: docType.recheckCadenceDays ?? null,
      aiParsingEnabled: docType.aiParsingEnabled ?? true,
      customFields: docType.customFields ?? Prisma.DbNull,
      isGlobal: true,
      isActive: true,
    };

    if (existing) {
      await prisma.documentType.update({
        where: { id: existing.id },
        data,
      });
      console.log(`🔄 Updated: ${docType.name}`);
      updated++;
    } else {
      await prisma.documentType.create({ data });
      console.log(`✅ Created: ${docType.name}`);
      created++;
    }
  }

  console.log(`\n✨ Seeding completed! Created: ${created}, Updated: ${updated}, Total: ${documentTypes.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
