/**
 * Employee Sync Helper
 *
 * Shared logic for upserting employees from external HR systems
 * (BambooHR, Gusto, Zapier, etc.).
 *
 * Resolves by email first, then employeeNumber. Only updates non-null
 * incoming fields to avoid overwriting locally managed data.
 */

import { prisma } from '@/lib/db';
import { StaffMember } from '@prisma/client';

export interface ExternalEmployee {
  firstName: string;
  lastName: string;
  email?: string;
  employeeNumber?: string;
  department?: string;
  position?: string;
  hireDate?: Date | string;
  /** If true, sets employee status to INACTIVE */
  terminated?: boolean;
}

export interface SyncResult {
  created: boolean;
  employee: StaffMember;
}

/**
 * Create or update an employee record from an external HR source.
 * agencyId always comes from the authenticated API key — never from the payload.
 */
export async function upsertEmployeeFromExternalSource(
  data: ExternalEmployee,
  agencyId: string
): Promise<SyncResult> {
  const status = data.terminated ? 'INACTIVE' : 'ACTIVE';
  const hireDate = data.hireDate ? new Date(data.hireDate) : undefined;

  // Attempt to resolve existing employee
  let existing: StaffMember | null = null;

  if (data.email) {
    existing = await prisma.staffMember.findFirst({
      where: { agencyId, email: data.email },
    });
  }

  if (!existing && data.employeeNumber) {
    existing = await prisma.staffMember.findFirst({
      where: { agencyId, staffNumber: data.employeeNumber },
    });
  }

  if (existing) {
    // Update — only overwrite fields that are explicitly provided
    const updated = await prisma.staffMember.update({
      where: { id: existing.id },
      data: {
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName ? { lastName: data.lastName } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.employeeNumber !== undefined ? { staffNumber: data.employeeNumber } : {}),
        ...(data.department !== undefined ? { department: data.department } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(hireDate !== undefined ? { hireDate } : {}),
        ...(data.terminated !== undefined ? { status } : {}),
      },
    });
    return { created: false, employee: updated };
  }

  // Create new employee
  const created = await prisma.staffMember.create({
    data: {
      agencyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      staffNumber: data.employeeNumber ?? null,
      department: data.department ?? null,
      position: data.position ?? null,
      hireDate: hireDate ?? null,
      status,
    },
  });
  return { created: true, employee: created };
}

/**
 * Authenticate an inbound request via API key.
 * Reads: Authorization: Bearer <rawKey>
 * Verifies via SHA-256 hash against ApiKey.keyHash.
 * Returns the agencyId on success.
 */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  const { hash } = await import('@/lib/encryption');
  const keyHash = hash(rawKey);

  const apiKey = await (prisma as any).apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    select: { agencyId: true, id: true },
  });

  if (!apiKey) return null;

  // Update lastUsedAt (fire-and-forget)
  (prisma as any).apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return apiKey.agencyId;
}
