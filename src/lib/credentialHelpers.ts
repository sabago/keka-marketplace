/**
 * Credential Helper Utilities
 * Helper functions for credential status calculation, compliance checking, and management
 */

import { DocumentStatus, ReviewStatus, StaffStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

// Type for credential with related data
export type CredentialWithRelations = Prisma.StaffCredentialGetPayload<{
  include: {
    staffMember: true;
    documentType: true;
  };
}>;

// Type for compliance summary
export interface ComplianceSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  missing: number;
  pendingReview: number;
  complianceRate: number; // Percentage (0-100)
}

// Type for employee compliance status
export interface EmployeeComplianceStatus {
  employeeId: string;
  employeeName: string;
  department: string | null;
  position: string | null;
  totalCredentials: number;
  validCredentials: number;
  expiringCredentials: number;
  expiredCredentials: number;
  missingCredentials: number;
  isCompliant: boolean;
  complianceRate: number;
}

/**
 * Calculate credential status based on expiration date and agency warning days
 */
export function calculateCredentialStatus(
  expirationDate: Date | null,
  warningDays: number = 30
): DocumentStatus {
  if (!expirationDate) {
    return 'MISSING';
  }

  const now = new Date();
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 0) {
    return 'EXPIRED';
  } else if (daysUntilExpiration <= warningDays) {
    return 'EXPIRING_SOON';
  } else {
    return 'ACTIVE';
  }
}

/**
 * Check if a credential is compliant (valid and approved)
 */
export function isCredentialCompliant(
  status: DocumentStatus,
  reviewStatus: ReviewStatus,
  expirationDate: Date | null
): boolean {
  // Must be approved or pending upload (for new credentials)
  if (reviewStatus !== 'APPROVED' && reviewStatus !== 'PENDING_UPLOAD') {
    return false;
  }

  // Must not be expired
  if (status === 'EXPIRED' || status === 'MISSING') {
    return false;
  }

  // If has expiration date, must be in the future
  if (expirationDate && new Date() > expirationDate) {
    return false;
  }

  return true;
}

/**
 * Determine if a credential needs admin review based on AI confidence
 */
export function shouldRequireReview(
  aiConfidence: number | null,
  threshold: number = 0.7
): boolean {
  if (aiConfidence === null) {
    return true; // No AI data, needs review
  }

  return aiConfidence < threshold;
}

/**
 * Check if a reminder should be sent for this credential
 */
export function shouldSendReminder(
  expirationDate: Date | null,
  status: DocumentStatus,
  reminderDays: number[],
  lastReminderSent: Date | null,
  minDaysBetweenReminders: number = 7
): { shouldSend: boolean; reason?: string } {
  // Don't send reminders for missing or archived credentials
  if (status === 'MISSING' || status === 'ARCHIVED') {
    return { shouldSend: false, reason: 'Not applicable for this status' };
  }

  // Don't send if no expiration date
  if (!expirationDate) {
    return { shouldSend: false, reason: 'No expiration date' };
  }

  // Check if enough time has passed since last reminder
  if (lastReminderSent) {
    const daysSinceLastReminder = Math.floor(
      (new Date().getTime() - lastReminderSent.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastReminder < minDaysBetweenReminders) {
      return {
        shouldSend: false,
        reason: `Reminder sent ${daysSinceLastReminder} days ago`,
      };
    }
  }

  // Calculate days until expiration
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if current days match any reminder threshold
  if (reminderDays.includes(daysUntilExpiration)) {
    return { shouldSend: true };
  }

  // Send reminder for expired credentials (once per week)
  if (daysUntilExpiration < 0 && status === 'EXPIRED') {
    return { shouldSend: true };
  }

  return { shouldSend: false, reason: 'Not within reminder window' };
}

/**
 * Get credentials by status for an agency
 */
export async function getCredentialsByStatus(
  agencyId: string,
  status: DocumentStatus | DocumentStatus[],
  includeInactiveEmployees: boolean = false
): Promise<CredentialWithRelations[]> {
  const statusFilter = Array.isArray(status) ? { in: status } : status;

  const credentials = await prisma.staffCredential.findMany({
    where: {
      staffMember: {
        agencyId,
        ...(includeInactiveEmployees ? {} : { status: 'ACTIVE' }),
      },
      status: statusFilter,
    },
    include: {
      staffMember: true,
      documentType: true,
    },
    orderBy: [
      { expirationDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return credentials;
}

/**
 * Get compliance summary for an agency
 */
export async function getAgencyComplianceSummary(
  agencyId: string,
  includeInactiveEmployees: boolean = false
): Promise<ComplianceSummary> {
  const credentials = await prisma.staffCredential.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      staffMember: {
        agencyId,
        ...(includeInactiveEmployees ? {} : { status: 'ACTIVE' }),
      },
    },
    select: {
      status: true,
      isCompliant: true,
    },
  });

  const total = credentials.length;
  const valid = credentials.filter((c) => c.status === 'ACTIVE' && c.isCompliant).length;
  const expiringSoon = credentials.filter((c) => c.status === 'EXPIRING_SOON').length;
  const expired = credentials.filter((c) => c.status === 'EXPIRED').length;
  const missing = credentials.filter((c) => c.status === 'MISSING').length;
  const pendingReview = credentials.filter((c) => c.status === 'PENDING_REVIEW').length;

  const complianceRate = total > 0 ? (valid / total) * 100 : 0;

  return {
    total,
    valid,
    expiringSoon,
    expired,
    missing,
    pendingReview,
    complianceRate: Math.round(complianceRate * 100) / 100,
  };
}

/**
 * Get compliance status for a specific employee
 */
export async function getEmployeeComplianceStatus(
  employeeId: string
): Promise<EmployeeComplianceStatus | null> {
  const staffMember = await prisma.staffMember.findUnique({
    where: { id: employeeId },
    include: {
      credentials: {
        where: { status: { not: 'ARCHIVED' } },
        select: {
          status: true,
          isCompliant: true,
        },
      },
    },
  });

  if (!staffMember) {
    return null;
  }

  const total = staffMember.credentials.length;
  const valid = staffMember.credentials.filter(
    (d) => d.status === 'ACTIVE' && d.isCompliant
  ).length;
  const expiring = staffMember.credentials.filter((d) => d.status === 'EXPIRING_SOON').length;
  const expired = staffMember.credentials.filter((d) => d.status === 'EXPIRED').length;
  const missing = staffMember.credentials.filter((d) => d.status === 'MISSING').length;

  const complianceRate = total > 0 ? (valid / total) * 100 : 0;
  const isCompliant = expired === 0 && missing === 0;

  return {
    employeeId: staffMember.id,
    employeeName: `${staffMember.firstName} ${staffMember.lastName}`,
    department: staffMember.department,
    position: staffMember.position,
    totalCredentials: total,
    validCredentials: valid,
    expiringCredentials: expiring,
    expiredCredentials: expired,
    missingCredentials: missing,
    isCompliant,
    complianceRate: Math.round(complianceRate * 100) / 100,
  };
}

/**
 * Get employees with compliance issues (expired or missing credentials)
 */
export async function getNonCompliantEmployees(
  agencyId: string
): Promise<EmployeeComplianceStatus[]> {
  const staffMembers = await prisma.staffMember.findMany({
    where: {
      agencyId,
      status: 'ACTIVE',
    },
    include: {
      credentials: true,
    },
  });

  const complianceStatuses: EmployeeComplianceStatus[] = [];

  for (const staffMember of staffMembers) {
    const total = staffMember.credentials.length;
    const valid = staffMember.credentials.filter(
      (d) => d.status === 'ACTIVE' && d.isCompliant
    ).length;
    const expiring = staffMember.credentials.filter((d) => d.status === 'EXPIRING_SOON').length;
    const expired = staffMember.credentials.filter((d) => d.status === 'EXPIRED').length;
    const missing = staffMember.credentials.filter((d) => d.status === 'MISSING').length;

    // Only include if they have compliance issues
    if (expired > 0 || missing > 0) {
      const complianceRate = total > 0 ? (valid / total) * 100 : 0;

      complianceStatuses.push({
        employeeId: staffMember.id,
        employeeName: `${staffMember.firstName} ${staffMember.lastName}`,
        department: staffMember.department,
        position: staffMember.position,
        totalCredentials: total,
        validCredentials: valid,
        expiringCredentials: expiring,
        expiredCredentials: expired,
        missingCredentials: missing,
        isCompliant: false,
        complianceRate: Math.round(complianceRate * 100) / 100,
      });
    }
  }

  // Sort by compliance rate (worst first)
  return complianceStatuses.sort((a, b) => a.complianceRate - b.complianceRate);
}

/**
 * Update credential compliance status
 */
export async function updateCredentialCompliance(
  credentialId: string
): Promise<void> {
  const credential = await prisma.staffCredential.findUnique({
    where: { id: credentialId },
    include: {
      staffMember: {
        include: {
          agency: true,
        },
      },
    },
  });

  if (!credential) {
    throw new Error('Credential not found');
  }

  // Calculate current status
  const warningDays = credential.staffMember.agency.credentialWarningDays;
  const newStatus = calculateCredentialStatus(credential.expirationDate, warningDays);

  // Determine if compliant
  const isCompliant = isCredentialCompliant(
    newStatus,
    credential.reviewStatus,
    credential.expirationDate
  );

  // Update the credential
  await prisma.staffCredential.update({
    where: { id: credentialId },
    data: {
      status: newStatus,
      isCompliant,
      complianceCheckedAt: new Date(),
    },
  });
}

/**
 * Batch update compliance status for all credentials in an agency
 */
export async function batchUpdateAgencyCompliance(agencyId: string): Promise<number> {
  const credentials = await prisma.staffCredential.findMany({
    where: {
      staffMember: {
        agencyId,
      },
    },
    include: {
      staffMember: {
        include: {
          agency: true,
        },
      },
    },
  });

  let updatedCount = 0;

  for (const credential of credentials) {
    const warningDays = credential.staffMember.agency.credentialWarningDays;
    const newStatus = calculateCredentialStatus(credential.expirationDate, warningDays);
    const isCompliant = isCredentialCompliant(
      newStatus,
      credential.reviewStatus,
      credential.expirationDate
    );

    // Only update if status or compliance changed
    if (credential.status !== newStatus || credential.isCompliant !== isCompliant) {
      await prisma.staffCredential.update({
        where: { id: credential.id },
        data: {
          status: newStatus,
          isCompliant,
          complianceCheckedAt: new Date(),
        },
      });

      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Find credentials needing reminders for an agency
 */
export async function findCredentialsNeedingReminders(
  agencyId: string
): Promise<CredentialWithRelations[]> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      credentialWarningDays: true,
      autoReminderEnabled: true,
    },
  });

  if (!agency || !agency.autoReminderEnabled) {
    return [];
  }

  const credentials = await prisma.staffCredential.findMany({
    where: {
      staffMember: {
        agencyId,
        status: 'ACTIVE',
      },
      status: {
        in: ['EXPIRING_SOON', 'EXPIRED'],
      },
      expirationDate: {
        not: null,
      },
    },
    include: {
      staffMember: true,
      documentType: true,
    },
  });

  // Filter to only those that actually need reminders
  const needingReminders = credentials.filter((credential) => {
    const reminderDays = credential.documentType.reminderDays;
    const result = shouldSendReminder(
      credential.expirationDate,
      credential.status,
      reminderDays,
      credential.lastReminderSent
    );
    return result.shouldSend;
  });

  return needingReminders;
}

/**
 * Get credential statistics by type for an agency
 */
export async function getCredentialStatsByType(agencyId: string): Promise<
  Array<{
    typeName: string;
    total: number;
    valid: number;
    expiringSoon: number;
    expired: number;
    complianceRate: number;
  }>
> {
  const credentials = await prisma.staffCredential.findMany({
    where: {
      staffMember: {
        agencyId,
        status: 'ACTIVE',
      },
    },
    include: {
      documentType: true,
    },
  });

  // Group by type
  const statsByType = new Map<
    string,
    {
      typeName: string;
      total: number;
      valid: number;
      expiringSoon: number;
      expired: number;
    }
  >();

  for (const credential of credentials) {
    const typeName = credential.documentType.name;

    if (!statsByType.has(typeName)) {
      statsByType.set(typeName, {
        typeName,
        total: 0,
        valid: 0,
        expiringSoon: 0,
        expired: 0,
      });
    }

    const stats = statsByType.get(typeName)!;
    stats.total++;

    if (credential.status === 'ACTIVE' && credential.isCompliant) {
      stats.valid++;
    } else if (credential.status === 'EXPIRING_SOON') {
      stats.expiringSoon++;
    } else if (credential.status === 'EXPIRED') {
      stats.expired++;
    }
  }

  // Convert to array and add compliance rate
  return Array.from(statsByType.values()).map((stats) => ({
    ...stats,
    complianceRate:
      stats.total > 0
        ? Math.round((stats.valid / stats.total) * 100 * 100) / 100
        : 0,
  }));
}

/**
 * Check if an employee has all required credentials
 */
export async function hasAllRequiredCredentials(
  employeeId: string,
  agencyId: string
): Promise<{ hasAll: boolean; missing: string[] }> {
  // Get all required credential types for this agency
  const requiredTypes = await prisma.documentType.findMany({
    where: {
      OR: [
        { agencyId, isRequired: true, isActive: true },
        { isGlobal: true, isRequired: true, isActive: true },
      ],
    },
  });

  // Get employee's credentials
  const employeeCredentials = await prisma.staffCredential.findMany({
    where: {
      staffMemberId: employeeId,
      status: {
        not: 'ARCHIVED',
      },
    },
    select: {
      documentTypeId: true,
    },
  });

  const employeeTypeIds = new Set(employeeCredentials.map((c) => c.documentTypeId));
  const missing: string[] = [];

  for (const type of requiredTypes) {
    if (!employeeTypeIds.has(type.id)) {
      missing.push(type.name);
    }
  }

  return {
    hasAll: missing.length === 0,
    missing,
  };
}

/**
 * Find or auto-create a StaffMember credential record for an AGENCY_USER.
 * Admin roles (AGENCY_ADMIN, PLATFORM_ADMIN, SUPERADMIN) are never tracked as staff
 * and will always receive null — they manage staff, they are not staff.
 * Returns null if the user has no agency association or is an admin role.
 */
export async function getOrCreateStaffRecord(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, agencyId: true, role: true },
  });

  // Only AGENCY_USER staff members have credential tracking records
  if (!dbUser?.agencyId || dbUser.role !== 'AGENCY_USER') return null;

  let record = await prisma.staffMember.findUnique({
    where: { userId },
    select: { id: true, agencyId: true, firstName: true, lastName: true },
  });

  if (!record) {
    const nameParts = (dbUser.name || '').trim().split(/\s+/);
    record = await prisma.staffMember.create({
      data: {
        agencyId: dbUser.agencyId,
        userId,
        firstName: nameParts[0] || dbUser.name || 'Staff',
        lastName: nameParts.slice(1).join(' ') || 'Member',
        email: dbUser.email || '',
        status: 'ACTIVE',
      },
      select: { id: true, agencyId: true, firstName: true, lastName: true },
    });
  }

  return record;
}

/**
 * Detect credential gaps for a staff member.
 * A gap exists for a document type when recheckCadenceDays is set (meaning
 * the type requires continuous coverage) AND no approved ACTIVE or EXPIRING_SOON
 * credential currently exists for that type.
 */
export async function detectCredentialGaps(
  staffMemberId: string,
  agencyId: string
): Promise<Array<{ documentTypeId: string; documentTypeName: string; recheckCadenceDays: number }>> {
  // Fetch all document types for this agency that require periodic renewal
  const requiredTypes = await prisma.documentType.findMany({
    where: {
      OR: [{ isGlobal: true }, { agencyId }],
      isActive: true,
      recheckCadenceDays: { not: null },
    },
    select: { id: true, name: true, recheckCadenceDays: true },
  });

  if (requiredTypes.length === 0) return [];

  // Find which of those types the staff member currently has covered
  const activeCredentials = await prisma.staffCredential.findMany({
    where: {
      staffMemberId,
      documentTypeId: { in: requiredTypes.map((t) => t.id) },
      reviewStatus: 'APPROVED',
      status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
    },
    select: { documentTypeId: true },
  });

  const coveredTypeIds = new Set(activeCredentials.map((c) => c.documentTypeId));

  return requiredTypes
    .filter((t) => !coveredTypeIds.has(t.id))
    .map((t) => ({
      documentTypeId: t.id,
      documentTypeName: t.name,
      recheckCadenceDays: t.recheckCadenceDays!,
    }));
}
