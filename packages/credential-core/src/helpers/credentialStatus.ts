/**
 * Pure credential status helper functions.
 * No database dependencies — safe to import in any context.
 */

import type { DocumentStatus, ReviewStatus } from '@prisma/client';

export type { DocumentStatus, ReviewStatus };

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
 * Calculate credential status based on expiration date and agency warning days.
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
 * Check if a credential is compliant (valid and approved).
 */
export function isCredentialCompliant(
  status: DocumentStatus,
  reviewStatus: ReviewStatus,
  expirationDate: Date | null
): boolean {
  if (reviewStatus !== 'APPROVED' && reviewStatus !== 'PENDING_UPLOAD') {
    return false;
  }

  if (status === 'EXPIRED' || status === 'MISSING') {
    return false;
  }

  if (expirationDate && new Date() > expirationDate) {
    return false;
  }

  return true;
}

/**
 * Determine if a credential needs admin review based on AI confidence.
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
 * Check if a reminder should be sent for this credential.
 */
export function shouldSendReminder(
  expirationDate: Date | null,
  status: DocumentStatus,
  reminderDays: number[],
  lastReminderSent: Date | null,
  minDaysBetweenReminders: number = 7
): { shouldSend: boolean; reason?: string } {
  if (status === 'MISSING' || status === 'ARCHIVED') {
    return { shouldSend: false, reason: 'Not applicable for this status' };
  }

  if (!expirationDate) {
    return { shouldSend: false, reason: 'No expiration date' };
  }

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

  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (reminderDays.includes(daysUntilExpiration)) {
    return { shouldSend: true };
  }

  if (daysUntilExpiration < 0 && status === 'EXPIRED') {
    return { shouldSend: true };
  }

  return { shouldSend: false, reason: 'Not within reminder window' };
}
