/**
 * Credential Reminder System
 *
 * Processes credentials and sends expiration reminders
 * Called by cron job daily
 */

import { prisma } from './db';
import {
  sendCredentialExpiringReminder,
  sendCredentialExpiredNotification,
} from './credentialEmails';

// Configuration
const REMINDER_DAYS = [30, 7]; // Send reminders at 30 and 7 days before expiration
const MIN_DAYS_BETWEEN_REMINDERS = 7; // Don't spam - wait at least 7 days

/**
 * Check if we should send a reminder based on employee preferences
 */
function shouldSendBasedOnPreferences(
  prefs: any,
  reminderType: 'expiring' | 'expired'
): boolean {
  if (!prefs) return true; // No preferences set, send by default

  // Check if email notifications are enabled
  if (!prefs.emailEnabled) return false;

  // Check specific reminder type preferences
  if (reminderType === 'expiring' && !prefs.emailExpiringReminders) return false;
  if (reminderType === 'expired' && !prefs.emailExpiredReminders) return false;

  // Check quiet hours (only applies to non-critical reminders)
  if (prefs.quietHoursEnabled && reminderType === 'expiring') {
    const currentHour = new Date().getHours();
    const start = prefs.quietHoursStart || 22;
    const end = prefs.quietHoursEnd || 8;

    // Check if current hour is within quiet hours
    if (start > end) {
      // Quiet hours span midnight (e.g., 22:00 to 08:00)
      if (currentHour >= start || currentHour < end) {
        return false; // In quiet hours
      }
    } else {
      // Quiet hours don't span midnight (e.g., 13:00 to 17:00)
      if (currentHour >= start && currentHour < end) {
        return false; // In quiet hours
      }
    }
  }

  return true;
}

/**
 * Get reminder frequency multiplier based on preferences
 */
function getReminderDays(prefs: any): number[] {
  if (!prefs || prefs.reminderFrequency === 'STANDARD') {
    return [30, 7]; // Standard reminders
  }

  if (prefs.reminderFrequency === 'MINIMAL') {
    return [7]; // Only 7 days before expiration
  }

  if (prefs.reminderFrequency === 'FREQUENT') {
    return [30, 14, 7, 3, 1]; // More frequent reminders
  }

  return [30, 7]; // Default
}

/**
 * Process all credentials and send reminders where appropriate
 *
 * @returns Processing summary
 */
export async function processCredentialReminders(): Promise<{
  checked: number;
  remindersSent: number;
  expiredNotificationsSent: number;
  errors: number;
  details: string[];
}> {
  const startTime = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checked = 0;
  let remindersSent = 0;
  let expiredNotificationsSent = 0;
  let errors = 0;
  const details: string[] = [];

  try {
    console.log('[REMINDERS] Starting credential reminder processing...');

    // Get all active, approved credentials with expiration dates
    const credentials = await prisma.employeeDocument.findMany({
      where: {
        expirationDate: { not: null },
        reviewStatus: 'APPROVED',
        status: { in: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            agencyId: true,
            notificationPreferences: true,
          },
        },
        documentType: {
          select: {
            name: true,
          },
        },
        reminders: {
          where: {
            reminderType: { in: ['EXPIRING_SOON', 'EXPIRED'] },
          },
          orderBy: {
            sentAt: 'desc',
          },
          take: 1,
        },
      },
    });

    checked = credentials.length;
    console.log(`[REMINDERS] Found ${checked} credentials to check`);

    for (const credential of credentials) {
      try {
        // Calculate days until expiration
        const expirationDate = new Date(credential.expirationDate!);
        expirationDate.setHours(0, 0, 0, 0);

        const daysUntilExpiration = Math.floor(
          (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if credential is expired
        if (daysUntilExpiration < 0) {
          // Credential is expired
          const shouldSendExpired = await shouldSendExpiredNotification(
            credential.id,
            credential.reminders[0]?.sentAt
          );

          // Check notification preferences
          const prefsAllow = shouldSendBasedOnPreferences(
            credential.employee.notificationPreferences,
            'expired'
          );

          if (shouldSendExpired && prefsAllow) {
            const sent = await sendCredentialExpiredNotification(
              {
                firstName: credential.employee.firstName,
                lastName: credential.employee.lastName,
                email: credential.employee.email,
              },
              {
                id: credential.id,
                documentTypeName: credential.documentType.name,
                expirationDate: credential.expirationDate!,
                licenseNumber: credential.licenseNumber,
              }
            );

            if (sent) {
              // Log reminder in database
              await prisma.credentialReminder.create({
                data: {
                  documentId: credential.id,
                  employeeId: credential.employee.id,
                  agencyId: credential.employee.agencyId,
                  reminderType: 'EXPIRED',
                  channel: 'EMAIL',
                  sentTo: [credential.employee.email || ''],
                  daysBeforeExpiry: daysUntilExpiration,
                  sentAt: new Date(),
                },
              });

              expiredNotificationsSent++;
              details.push(
                `Sent EXPIRED notification for ${credential.documentType.name} to ${credential.employee.email}`
              );
            } else {
              errors++;
              details.push(
                `Failed to send EXPIRED notification for ${credential.documentType.name} to ${credential.employee.email}`
              );
            }
          }
        } else {
          // Check if this is a reminder day based on employee preferences
          const employeeReminderDays = getReminderDays(
            credential.employee.notificationPreferences
          );

          if (employeeReminderDays.includes(daysUntilExpiration)) {
            // Credential is expiring soon at a reminder threshold
            const shouldSend = await shouldSendReminder(
              credential.id,
              daysUntilExpiration,
              credential.reminders[0]?.sentAt
            );

            // Check notification preferences
            const prefsAllow = shouldSendBasedOnPreferences(
              credential.employee.notificationPreferences,
              'expiring'
            );

            if (shouldSend && prefsAllow) {
              const sent = await sendCredentialExpiringReminder(
              {
                firstName: credential.employee.firstName,
                lastName: credential.employee.lastName,
                email: credential.employee.email,
              },
              {
                id: credential.id,
                documentTypeName: credential.documentType.name,
                expirationDate: credential.expirationDate!,
                licenseNumber: credential.licenseNumber,
              },
              daysUntilExpiration
            );

            if (sent) {
              // Log reminder in database
              await prisma.credentialReminder.create({
                data: {
                  documentId: credential.id,
                  employeeId: credential.employee.id,
                  agencyId: credential.employee.agencyId,
                  reminderType: 'EXPIRING_SOON',
                  channel: 'EMAIL',
                  sentTo: [credential.employee.email || ''],
                  daysBeforeExpiry: daysUntilExpiration,
                  sentAt: new Date(),
                },
              });

              remindersSent++;
              details.push(
                `Sent EXPIRING reminder (${daysUntilExpiration} days) for ${credential.documentType.name} to ${credential.employee.email}`
              );
            } else {
              errors++;
              details.push(
                `Failed to send reminder for ${credential.documentType.name} to ${credential.employee.email}`
              );
            }
          }
          }
        }
      } catch (error) {
        console.error(`Error processing credential ${credential.id}:`, error);
        errors++;
        details.push(`Error processing credential ${credential.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const processingTime = Date.now() - startTime;

    console.log('[REMINDERS] Processing complete:', {
      checked,
      remindersSent,
      expiredNotificationsSent,
      errors,
      processingTime,
    });

    return {
      checked,
      remindersSent,
      expiredNotificationsSent,
      errors,
      details,
    };
  } catch (error) {
    console.error('[REMINDERS] Fatal error during processing:', error);
    throw error;
  }
}

/**
 * Determine if a reminder should be sent for expiring credential
 *
 * @param credentialId Credential ID
 * @param daysUntilExpiration Days until expiration
 * @param lastReminderDate Date of last reminder sent
 * @returns True if reminder should be sent
 */
async function shouldSendReminder(
  credentialId: string,
  daysUntilExpiration: number,
  lastReminderDate: Date | undefined
): Promise<boolean> {
  // If no previous reminder, send it
  if (!lastReminderDate) {
    return true;
  }

  // Check if enough time has passed since last reminder
  const daysSinceLastReminder = Math.floor(
    (Date.now() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastReminder < MIN_DAYS_BETWEEN_REMINDERS) {
    console.log(
      `[REMINDERS] Skipping credential ${credentialId}: Only ${daysSinceLastReminder} days since last reminder`
    );
    return false;
  }

  // Check if we already sent a reminder for this specific day threshold
  const existingReminder = await prisma.credentialReminder.findFirst({
    where: {
      documentId: credentialId,
      daysBeforeExpiry: daysUntilExpiration,
      reminderType: 'EXPIRING_SOON',
    },
  });

  if (existingReminder) {
    console.log(
      `[REMINDERS] Skipping credential ${credentialId}: Already sent ${daysUntilExpiration}-day reminder`
    );
    return false;
  }

  return true;
}

/**
 * Determine if expired notification should be sent
 *
 * @param credentialId Credential ID
 * @param lastReminderDate Date of last reminder
 * @returns True if notification should be sent
 */
async function shouldSendExpiredNotification(
  credentialId: string,
  lastReminderDate: Date | undefined
): Promise<boolean> {
  // Check if we already sent an expired notification
  const existingExpiredReminder = await prisma.credentialReminder.findFirst({
    where: {
      documentId: credentialId,
      reminderType: 'EXPIRED',
    },
    orderBy: {
      sentAt: 'desc',
    },
  });

  // If we already sent an expired notification
  if (existingExpiredReminder) {
    const daysSinceExpiredNotification = Math.floor(
      (Date.now() - existingExpiredReminder.sentAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send weekly reminders for expired credentials
    if (daysSinceExpiredNotification < 7) {
      console.log(
        `[REMINDERS] Skipping expired notification for ${credentialId}: Only ${daysSinceExpiredNotification} days since last expired notification`
      );
      return false;
    }

    // Send weekly reminders (but max 4 times = 1 month)
    const totalExpiredReminders = await prisma.credentialReminder.count({
      where: {
        documentId: credentialId,
        reminderType: 'EXPIRED',
      },
    });

    if (totalExpiredReminders >= 4) {
      console.log(
        `[REMINDERS] Skipping expired notification for ${credentialId}: Already sent ${totalExpiredReminders} expired notifications`
      );
      return false;
    }
  }

  return true;
}

/**
 * Get reminder statistics for an agency
 *
 * @param agencyId Agency ID
 * @returns Reminder stats
 */
export async function getAgencyReminderStats(agencyId: string): Promise<{
  totalReminders: number;
  lastWeek: number;
  lastMonth: number;
  byType: Record<string, number>;
}> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  const [total, lastWeek, lastMonth, byType] = await Promise.all([
    prisma.credentialReminder.count({
      where: { agencyId },
    }),
    prisma.credentialReminder.count({
      where: {
        agencyId,
        sentAt: { gte: oneWeekAgo },
      },
    }),
    prisma.credentialReminder.count({
      where: {
        agencyId,
        sentAt: { gte: oneMonthAgo },
      },
    }),
    prisma.credentialReminder.groupBy({
      by: ['reminderType'],
      where: { agencyId },
      _count: true,
    }),
  ]);

  const byTypeMap: Record<string, number> = {};
  byType.forEach((item) => {
    byTypeMap[item.reminderType] = item._count;
  });

  return {
    totalReminders: total,
    lastWeek,
    lastMonth,
    byType: byTypeMap,
  };
}

/**
 * Get upcoming expiration counts for dashboard
 *
 * @param agencyId Agency ID
 * @returns Counts of credentials expiring at different thresholds
 */
export async function getUpcomingExpirations(agencyId: string): Promise<{
  expiringSoon: number; // 30 days or less
  expiringThisWeek: number; // 7 days or less
  expired: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(today.getDate() + 30);

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(today.getDate() + 7);

  const [expiringSoon, expiringThisWeek, expired] = await Promise.all([
    prisma.employeeDocument.count({
      where: {
        employee: { agencyId },
        expirationDate: {
          gte: today,
          lte: thirtyDaysOut,
        },
        reviewStatus: 'APPROVED',
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
    }),
    prisma.employeeDocument.count({
      where: {
        employee: { agencyId },
        expirationDate: {
          gte: today,
          lte: sevenDaysOut,
        },
        reviewStatus: 'APPROVED',
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
      },
    }),
    prisma.employeeDocument.count({
      where: {
        employee: { agencyId },
        expirationDate: { lt: today },
        reviewStatus: 'APPROVED',
        status: 'EXPIRED',
      },
    }),
  ]);

  return {
    expiringSoon,
    expiringThisWeek,
    expired,
  };
}
