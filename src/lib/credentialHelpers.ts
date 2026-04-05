/**
 * Credential Helper Utilities
 * Helper functions for credential status calculation, compliance checking, and management
 */

import { DocumentStatus, ReviewStatus, EmployeeStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

// Type for credential with related data
export type CredentialWithRelations = Prisma.EmployeeDocumentGetPayload<{
  include: {
    employee: true;
    documentType: true;
  };
}>;

// Type for compliance summary
export interface ComplianceSummary {
  total: number;
  valid: number;
  expiringS

oon: number;
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

  const credentials = await prisma.employeeDocument.findMany({
    where: {
      employee: {
        agencyId,
        ...(includeInactiveEmployees ? {} : { status: 'ACTIVE' }),
      },
      status: statusFilter,
    },
    include: {
      employee: true,
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
  const credentials = await prisma.employeeDocument.findMany({
    where: {
      employee: {
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
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      documents: {
        select: {
          status: true,
          isCompliant: true,
        },
      },
    },
  });

  if (!employee) {
    return null;
  }

  const total = employee.documents.length;
  const valid = employee.documents.filter(
    (d) => d.status === 'ACTIVE' && d.isCompliant
  ).length;
  const expiring = employee.documents.filter((d) => d.status === 'EXPIRING_SOON').length;
  const expired = employee.documents.filter((d) => d.status === 'EXPIRED').length;
  const missing = employee.documents.filter((d) => d.status === 'MISSING').length;

  const complianceRate = total > 0 ? (valid / total) * 100 : 0;
  const isCompliant = expired === 0 && missing === 0;

  return {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    department: employee.department,
    position: employee.position,
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
  const employees = await prisma.employee.findMany({
    where: {
      agencyId,
      status: 'ACTIVE',
    },
    include: {
      documents: true,
    },
  });

  const complianceStatuses: EmployeeComplianceStatus[] = [];

  for (const employee of employees) {
    const total = employee.documents.length;
    const valid = employee.documents.filter(
      (d) => d.status === 'ACTIVE' && d.isCompliant
    ).length;
    const expiring = employee.documents.filter((d) => d.status === 'EXPIRING_SOON').length;
    const expired = employee.documents.filter((d) => d.status === 'EXPIRED').length;
    const missing = employee.documents.filter((d) => d.status === 'MISSING').length;

    // Only include if they have compliance issues
    if (expired > 0 || missing > 0) {
      const complianceRate = total > 0 ? (valid / total) * 100 : 0;

      complianceStatuses.push({
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
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
  const credential = await prisma.employeeDocument.findUnique({
    where: { id: credentialId },
    include: {
      employee: {
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
  const warningDays = credential.employee.agency.credentialWarningDays;
  const newStatus = calculateCredentialStatus(credential.expirationDate, warningDays);

  // Determine if compliant
  const isCompliant = isCredentialCompliant(
    newStatus,
    credential.reviewStatus,
    credential.expirationDate
  );

  // Update the credential
  await prisma.employeeDocument.update({
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
  const credentials = await prisma.employeeDocument.findMany({
    where: {
      employee: {
        agencyId,
      },
    },
    include: {
      employee: {
        include: {
          agency: true,
        },
      },
    },
  });

  let updatedCount = 0;

  for (const credential of credentials) {
    const warningDays = credential.employee.agency.credentialWarningDays;
    const newStatus = calculateCredentialStatus(credential.expirationDate, warningDays);
    const isCompliant = isCredentialCompliant(
      newStatus,
      credential.reviewStatus,
      credential.expirationDate
    );

    // Only update if status or compliance changed
    if (credential.status !== newStatus || credential.isCompliant !== isCompliant) {
      await prisma.employeeDocument.update({
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

  const credentials = await prisma.employeeDocument.findMany({
    where: {
      employee: {
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
      employee: true,
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
  const credentials = await prisma.employeeDocument.findMany({
    where: {
      employee: {
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
  const employeeCredentials = await prisma.employeeDocument.findMany({
    where: {
      employeeId,
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
