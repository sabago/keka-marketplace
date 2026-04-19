/**
 * Handlers for the credential agent tool calls.
 *
 * Each handler takes params from the OpenAI tool call + the agencyId from
 * the authenticated session. agencyId is NEVER taken from params directly.
 */

import { prisma } from '@/lib/db';
import {
  getAgencyComplianceSummary,
  getEmployeeComplianceStatus,
  findCredentialsNeedingReminders,
} from '@/lib/credentialHelpers';
import {
  sendCredentialExpiringReminder,
  sendCredentialExpiredNotification,
} from '@/lib/credentialEmails';
import { DocumentStatus, ReviewStatus, Prisma } from '@prisma/client';

type ToolResult = { success: boolean; data: unknown; error?: string };

// ─── search_credentials ─────────────────────────────────────────────────────

export async function handleSearchCredentials(
  params: {
    status?: string;
    reviewStatus?: string;
    credentialType?: string;
    employeeNameQuery?: string;
    expirationBefore?: string;
    limit?: number;
  },
  agencyId: string
): Promise<ToolResult> {
  try {
    const take = Math.min(params.limit ?? 20, 50);

    const where: Prisma.StaffCredentialWhereInput = {
      staffMember: { agencyId },
    };

    if (params.status) where.status = params.status as DocumentStatus;
    if (params.reviewStatus) where.reviewStatus = params.reviewStatus as ReviewStatus;
    if (params.expirationBefore) where.expirationDate = { lte: new Date(params.expirationBefore) };

    if (params.credentialType) {
      where.documentType = { name: { contains: params.credentialType, mode: 'insensitive' } };
    }

    if (params.employeeNameQuery) {
      (where.staffMember as Prisma.StaffMemberWhereInput) = {
        agencyId,
        OR: [
          { firstName: { contains: params.employeeNameQuery, mode: 'insensitive' } },
          { lastName: { contains: params.employeeNameQuery, mode: 'insensitive' } },
        ],
      };
    }

    const credentials = await prisma.staffCredential.findMany({
      where,
      include: {
        staffMember: {
          select: { id: true, firstName: true, lastName: true, email: true, department: true },
        },
        documentType: { select: { name: true } },
      },
      orderBy: { expirationDate: 'asc' },
      take,
    });

    return {
      success: true,
      data: credentials.map((c) => ({
        id: c.id,
        employeeName: `${c.staffMember.firstName} ${c.staffMember.lastName}`,
        employeeId: c.staffMember.id,
        email: c.staffMember.email,
        department: c.staffMember.department,
        credentialType: c.documentType?.name ?? 'Unknown',
        issuer: c.issuer,
        licenseNumber: c.licenseNumber,
        expirationDate: c.expirationDate?.toISOString().split('T')[0] ?? null,
        status: c.status,
        reviewStatus: c.reviewStatus,
        isCompliant: c.isCompliant,
      })),
    };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
}

// ─── get_employee_credentials ────────────────────────────────────────────────

export async function handleGetEmployeeCredentials(
  params: { employeeId?: string; employeeNameQuery?: string },
  agencyId: string
): Promise<ToolResult> {
  try {
    let employee: { id: string } | null = null;

    if (params.employeeId) {
      employee = await prisma.staffMember.findFirst({
        where: { id: params.employeeId, agencyId },
        select: { id: true },
      });
    } else if (params.employeeNameQuery) {
      employee = await prisma.staffMember.findFirst({
        where: {
          agencyId,
          OR: [
            { firstName: { contains: params.employeeNameQuery, mode: 'insensitive' } },
            { lastName: { contains: params.employeeNameQuery, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
    }

    if (!employee) {
      return { success: false, data: null, error: 'Employee not found' };
    }

    const [complianceStatus, documents] = await Promise.all([
      getEmployeeComplianceStatus(employee.id),
      prisma.staffCredential.findMany({
        where: { staffMemberId: employee.id },
        include: { documentType: { select: { name: true } } },
        orderBy: { expirationDate: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        complianceStatus,
        credentials: documents.map((d) => ({
          id: d.id,
          credentialType: d.documentType?.name ?? 'Unknown',
          issuer: d.issuer,
          licenseNumber: d.licenseNumber,
          issuedAt: d.issueDate?.toISOString().split('T')[0] ?? null,
          expirationDate: d.expirationDate?.toISOString().split('T')[0] ?? null,
          status: d.status,
          reviewStatus: d.reviewStatus,
          isCompliant: d.isCompliant,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
}

// ─── get_compliance_summary ──────────────────────────────────────────────────

export async function handleGetComplianceSummary(
  params: { includeInactiveEmployees?: boolean },
  agencyId: string
): Promise<ToolResult> {
  try {
    const summary = await getAgencyComplianceSummary(agencyId, params.includeInactiveEmployees ?? false);
    return { success: true, data: summary };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
}

// ─── send_credential_reminders ───────────────────────────────────────────────

export async function handleSendCredentialReminders(
  params: { credentialIds?: string[]; dryRun?: boolean },
  agencyId: string
): Promise<ToolResult> {
  try {
    const dryRun = params.dryRun ?? false;

    let credentialsToRemind: Awaited<ReturnType<typeof findCredentialsNeedingReminders>>;

    if (params.credentialIds?.length) {
      credentialsToRemind = await prisma.staffCredential.findMany({
        where: {
          id: { in: params.credentialIds },
          staffMember: { agencyId },
          status: { in: ['EXPIRING_SOON', 'EXPIRED'] },
        },
        include: { staffMember: true, documentType: true },
      });
    } else {
      credentialsToRemind = await findCredentialsNeedingReminders(agencyId);
    }

    if (dryRun) {
      return {
        success: true,
        data: {
          dryRun: true,
          wouldNotify: credentialsToRemind.map((c) => ({
            credentialId: c.id,
            employeeName: `${c.staffMember.firstName} ${c.staffMember.lastName}`,
            credentialType: c.documentType?.name ?? 'Unknown',
            status: c.status,
            expirationDate: c.expirationDate?.toISOString().split('T')[0] ?? null,
          })),
          count: credentialsToRemind.length,
        },
      };
    }

    let sent = 0;
    let failed = 0;
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    for (const cred of credentialsToRemind) {
      if (!cred.staffMember.email || !cred.expirationDate) continue;

      const daysUntil = Math.ceil((cred.expirationDate.getTime() - today.getTime()) / msPerDay);
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
        const ok =
          cred.status === 'EXPIRED'
            ? await sendCredentialExpiredNotification(employee, credential)
            : await sendCredentialExpiringReminder(employee, credential, daysUntil);

        if (ok) {
          await prisma.credentialReminder.create({
            data: {
              documentId: cred.id,
              staffMemberId: cred.staffMember.id,
              agencyId: cred.staffMember.agencyId,
              reminderType: cred.status === 'EXPIRED' ? 'EXPIRED' : 'EXPIRING_SOON',
              channel: 'EMAIL',
              sentTo: [cred.staffMember.email ?? ''],
              daysBeforeExpiry: daysUntil,
              sentAt: new Date(),
            },
          });
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { success: true, data: { sent, failed, total: credentialsToRemind.length } };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
}
