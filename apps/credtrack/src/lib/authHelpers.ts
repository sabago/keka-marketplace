import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@mhc/db';
import type { CredTrackPlan } from '@/types/next-auth';

export class HttpError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface CredTrackSessionUser {
  id: string;
  email: string;
  name: string | null;
  orgId: string | null;
  role: string;
  credtrackPlan: CredTrackPlan;
  isBundled: boolean;
}

/**
 * Require any authenticated session (no org required).
 * Used as the base for SUPERADMIN and PLATFORM_ADMIN helpers.
 */
export async function requireAuth(): Promise<{ user: CredTrackSessionUser }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new HttpError('Unauthenticated', 401);

  const { id, email, name, orgId, role, credtrackPlan, isBundled } =
    session.user as CredTrackSessionUser & { id: string };

  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (dbUser && !dbUser.isActive) {
    throw new HttpError('Your account has been deactivated', 403);
  }

  return {
    user: { id, email, name, orgId: orgId ?? null, role, credtrackPlan, isBundled },
  };
}

/**
 * Require PLATFORM_ADMIN role.
 */
export async function requirePlatformAdmin(): Promise<{ user: CredTrackSessionUser }> {
  const { user } = await requireAuth();
  if (user.role !== 'PLATFORM_ADMIN') {
    throw new HttpError('Platform admin access required', 403);
  }
  return { user };
}

/**
 * Require SUPERADMIN or PLATFORM_ADMIN role.
 */
export async function requireSuperadmin(): Promise<{ user: CredTrackSessionUser }> {
  const { user } = await requireAuth();
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'SUPERADMIN') {
    throw new HttpError('Superadmin access required', 403);
  }
  return { user };
}

/**
 * Require an authenticated CredTrack session with a resolved org.
 * The orgId returned IS Agency.id — all Prisma queries filter by agencyId: orgId.
 */
export async function requireOrg(): Promise<{
  user: CredTrackSessionUser;
  orgId: string;
  plan: CredTrackPlan;
  isBundled: boolean;
}> {
  const { user } = await requireAuth();

  if (!user.orgId) throw new HttpError('No organization associated with this account', 403);

  return {
    user,
    orgId: user.orgId,
    plan: user.credtrackPlan,
    isBundled: user.isBundled,
  };
}

/**
 * Require org + admin role (AGENCY_ADMIN or higher).
 */
export async function requireOrgAdmin(): Promise<{
  user: CredTrackSessionUser;
  orgId: string;
  plan: CredTrackPlan;
  isBundled: boolean;
}> {
  const result = await requireOrg();

  if (!['AGENCY_ADMIN', 'SUPERADMIN', 'PLATFORM_ADMIN'].includes(result.user.role)) {
    throw new HttpError('Admin access required', 403);
  }

  return result;
}
