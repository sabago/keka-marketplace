/**
 * POST /api/admin/credentials/bulk-action
 *
 * Bulk operations on credentials: approve, reject, or send reminders.
 * Auth: SUPERADMIN or PLATFORM_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { checkRateLimit, adminRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';
import { calculateCredentialStatus, isCredentialCompliant } from '@/lib/credentialHelpers';
import {
  sendCredentialExpiringReminder,
  sendCredentialExpiredNotification,
} from '@/lib/credentialEmails';

const bodySchema = z.object({
  action: z.enum(['bulk-approve', 'bulk-reject', 'bulk-remind']),
  credentialIds: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireSuperadmin();

    const rl = await checkRateLimit(adminRateLimit, getIP(req));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { action, credentialIds, reason } = parsed.data;

    if (action === 'bulk-reject' && !reason) {
      return NextResponse.json({ error: 'reason is required for bulk-reject' }, { status: 400 });
    }

    if (action === 'bulk-approve') {
      const credentials = await prisma.staffCredential.findMany({
        where: { id: { in: credentialIds } },
        include: { staffMember: { include: { agency: { select: { credentialWarningDays: true } } } } },
      });

      await prisma.$transaction(async (tx) => {
        for (const cred of credentials) {
          const warningDays = cred.staffMember.agency?.credentialWarningDays ?? 30;
          const status = calculateCredentialStatus(cred.expirationDate, warningDays);
          const compliant = isCredentialCompliant(status, 'APPROVED', cred.expirationDate);
          await tx.staffCredential.update({
            where: { id: cred.id },
            data: {
              reviewStatus: 'APPROVED',
              status,
              isCompliant: compliant,
              reviewedAt: new Date(),
              reviewedBy: user.id,
              complianceCheckedAt: new Date(),
            },
          });
        }

        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'BULK_CREDENTIAL_APPROVE',
            details: { credentialIds, count: credentials.length },
          },
        });
      });

      return NextResponse.json({ success: true, processed: credentials.length, failed: 0 });
    }

    if (action === 'bulk-reject') {
      await prisma.$transaction([
        prisma.staffCredential.updateMany({
          where: { id: { in: credentialIds } },
          data: {
            reviewStatus: 'REJECTED',
            reviewNotes: reason,
            isCompliant: false,
            reviewedAt: new Date(),
            reviewedBy: user.id,
          },
        }),
        prisma.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'BULK_CREDENTIAL_REJECT',
            details: { credentialIds, reason, count: credentialIds.length },
          },
        }),
      ]);

      return NextResponse.json({ success: true, processed: credentialIds.length, failed: 0 });
    }

    // bulk-remind
    const credentials = await prisma.staffCredential.findMany({
      where: { id: { in: credentialIds }, status: { in: ['EXPIRING_SOON', 'EXPIRED'] } },
      include: {
        staffMember: { select: { id: true, firstName: true, lastName: true, email: true, agencyId: true } },
        documentType: { select: { name: true } },
      },
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const details: { credentialId: string; result: string }[] = [];

    for (const cred of credentials) {
      if (!cred.staffMember.email || !cred.expirationDate) {
        skipped++;
        details.push({ credentialId: cred.id, result: 'skipped: no email or expiration date' });
        continue;
      }

      const today = new Date();
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntil = Math.ceil(
        (cred.expirationDate.getTime() - today.getTime()) / msPerDay
      );

      const employee = {
        firstName: cred.staffMember.firstName,
        lastName: cred.staffMember.lastName,
        email: cred.staffMember.email,
      };
      const credential = {
        id: cred.id,
        documentTypeName: cred.documentType?.name ?? 'Credential',
        expirationDate: cred.expirationDate,
        licenseNumber: cred.licenseNumber,
      };

      try {
        let ok: boolean;
        if (cred.status === 'EXPIRED') {
          ok = await sendCredentialExpiredNotification(employee, credential);
        } else {
          ok = await sendCredentialExpiringReminder(employee, credential, daysUntil);
        }

        if (ok) {
          await prisma.credentialReminder.create({
            data: {
              documentId: cred.id,
              staffMemberId: cred.staffMember.id,
              agencyId: cred.staffMember.agencyId ?? '',
              reminderType: cred.status === 'EXPIRED' ? 'EXPIRED' : 'EXPIRING_SOON',
              channel: 'EMAIL',
              sentTo: [cred.staffMember.email],
              daysBeforeExpiry: daysUntil,
              sentAt: new Date(),
            },
          });
          sent++;
          details.push({ credentialId: cred.id, result: 'sent' });
        } else {
          failed++;
          details.push({ credentialId: cred.id, result: 'failed: email send returned false' });
        }
      } catch {
        failed++;
        details.push({ credentialId: cred.id, result: 'failed: email error' });
      }
    }

    skipped += credentialIds.length - credentials.length;

    return NextResponse.json({ success: true, sent, failed, skipped, details });
  } catch (error: any) {
    if (error.message?.includes('access required') || error.message?.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Bulk action error:', error);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
