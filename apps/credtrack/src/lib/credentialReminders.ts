/**
 * CredTrack credential reminder processor.
 * Same logic as apps/mhc/src/lib/credentialReminders.ts — differences:
 *   - imports prisma from @mhc/db
 *   - imports email functions from @mhc/credential-core
 *   - passes CREDTRACK_BRAND to all email sends
 */

import { prisma } from '@mhc/db';
import {
  sendCredentialExpiringReminder,
  sendCredentialExpiredNotification,
  CREDTRACK_BRAND,
} from '@mhc/credential-core';

const REMINDER_DAYS = [30, 7];
const MIN_DAYS_BETWEEN_REMINDERS = 7;

function shouldSendBasedOnPreferences(prefs: any, type: 'expiring' | 'expired'): boolean {
  if (!prefs) return true;
  if (!prefs.emailEnabled) return false;
  if (type === 'expiring' && !prefs.emailExpiringReminders) return false;
  if (type === 'expired'  && !prefs.emailExpiredReminders)  return false;
  return true;
}

function getReminderDays(prefs: any): number[] {
  if (!prefs || prefs.reminderFrequency === 'STANDARD') return [30, 7];
  if (prefs.reminderFrequency === 'MINIMAL')  return [7];
  if (prefs.reminderFrequency === 'FREQUENT') return [30, 14, 7, 3, 1];
  return [30, 7];
}

async function shouldSendReminder(
  credentialId: string,
  daysUntil: number,
  lastSentAt?: Date
): Promise<boolean> {
  if (!lastSentAt) return true;
  const daysSinceLast = Math.floor((Date.now() - lastSentAt.getTime()) / 86400000);
  return daysSinceLast >= MIN_DAYS_BETWEEN_REMINDERS;
}

async function shouldSendExpiredNotification(
  credentialId: string,
  lastSentAt?: Date
): Promise<boolean> {
  if (!lastSentAt) return true;
  const daysSinceLast = Math.floor((Date.now() - lastSentAt.getTime()) / 86400000);
  return daysSinceLast >= 7;
}

export async function processCredentialReminders(): Promise<{
  checked: number;
  remindersSent: number;
  expiredNotificationsSent: number;
  errors: number;
  details: string[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checked = 0, remindersSent = 0, expiredNotificationsSent = 0, errors = 0;
  const details: string[] = [];

  const BATCH = 500;
  let cursor: string | undefined;

  const query = (afterCursor?: string) =>
    prisma.staffCredential.findMany({
      where: {
        expirationDate: { not: null },
        reviewStatus: 'APPROVED',
        status: { in: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'] },
        // Only process credentials belonging to CredTrack orgs
        staffMember: { agency: { sourceApp: 'CREDTRACK' } },
      },
      include: {
        staffMember: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            agencyId: true, notificationPreferences: true,
          },
        },
        documentType: { select: { name: true } },
        reminders: {
          where: { reminderType: { in: ['EXPIRING_SOON', 'EXPIRED'] } },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(afterCursor ? { cursor: { id: afterCursor }, skip: 1 } : {}),
    });

  let credentials = await query();

  while (credentials.length > 0) {
    checked += credentials.length;
    cursor = credentials[credentials.length - 1].id;

    for (const cred of credentials) {
      try {
        const expDate = new Date(cred.expirationDate!);
        expDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.floor((expDate.getTime() - today.getTime()) / 86400000);

        const employee = {
          firstName: cred.staffMember.firstName,
          lastName:  cred.staffMember.lastName,
          email:     cred.staffMember.email ?? '',
        };
        const credential = {
          id: cred.id,
          documentTypeName: cred.documentType.name,
          expirationDate:   cred.expirationDate!,
          licenseNumber:    cred.licenseNumber,
        };

        if (daysUntil < 0) {
          const ok = await shouldSendExpiredNotification(cred.id, cred.reminders[0]?.sentAt);
          const prefsOk = shouldSendBasedOnPreferences(cred.staffMember.notificationPreferences, 'expired');
          if (ok && prefsOk) {
            const sent = await sendCredentialExpiredNotification(employee, credential, CREDTRACK_BRAND);
            if (sent) {
              await prisma.credentialReminder.create({
                data: {
                  documentId:    cred.id,
                  staffMemberId: cred.staffMember.id,
                  agencyId:      cred.staffMember.agencyId,
                  reminderType:  'EXPIRED',
                  channel:       'EMAIL',
                  sentTo:        [cred.staffMember.email ?? ''],
                  daysBeforeExpiry: daysUntil,
                  sentAt:        new Date(),
                },
              });
              expiredNotificationsSent++;
              details.push(`EXPIRED: ${cred.documentType.name} → ${employee.email}`);
            } else {
              errors++;
            }
          }
        } else {
          const reminderDays = getReminderDays(cred.staffMember.notificationPreferences);
          if (reminderDays.includes(daysUntil)) {
            const ok = await shouldSendReminder(cred.id, daysUntil, cred.reminders[0]?.sentAt);
            const prefsOk = shouldSendBasedOnPreferences(cred.staffMember.notificationPreferences, 'expiring');
            if (ok && prefsOk) {
              const sent = await sendCredentialExpiringReminder(employee, credential, daysUntil, CREDTRACK_BRAND);
              if (sent) {
                await prisma.credentialReminder.create({
                  data: {
                    documentId:    cred.id,
                    staffMemberId: cred.staffMember.id,
                    agencyId:      cred.staffMember.agencyId,
                    reminderType:  'EXPIRING_SOON',
                    channel:       'EMAIL',
                    sentTo:        [cred.staffMember.email ?? ''],
                    daysBeforeExpiry: daysUntil,
                    sentAt:        new Date(),
                  },
                });
                remindersSent++;
                details.push(`EXPIRING (${daysUntil}d): ${cred.documentType.name} → ${employee.email}`);
              } else {
                errors++;
              }
            }
          }
        }
      } catch (err) {
        errors++;
        details.push(`Error on credential ${cred.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    if (credentials.length < BATCH) break;
    credentials = await query(cursor);
  }

  return { checked, remindersSent, expiredNotificationsSent, errors, details };
}
