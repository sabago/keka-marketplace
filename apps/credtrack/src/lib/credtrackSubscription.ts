import { prisma } from '@mhc/db';
import type { CredTrackPlan } from '@/types/next-auth';

export interface ResolvedCredTrackPlan {
  plan: CredTrackPlan;
  isBundled: boolean;
  aiEnabled: boolean;
  staffLimit: number; // -1 = unlimited
  aiParseLimit: number; // -1 = unlimited, per month
}

const BUNDLED_MHC_PLANS = ['PRO', 'BUSINESS', 'ENTERPRISE'] as const;

/**
 * Resolve the effective CredTrack plan for an org.
 * Resolution order:
 *   1. MHC bundle (PRO/BUSINESS/ENTERPRISE + ACTIVE) → BUNDLED
 *   2. CredTrackSubscription row → STARTER/GROWTH/ENTERPRISE
 *   3. Default → STARTER (free)
 */
export async function getCredTrackPlan(agencyId: string): Promise<ResolvedCredTrackPlan> {
  const [agency, ctSub] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: agencyId },
      select: { subscriptionPlan: true, subscriptionStatus: true },
    }),
    prisma.credTrackSubscription.findUnique({
      where: { agencyId },
      select: { plan: true, status: true },
    }),
  ]);

  // 1. MHC bundle check
  if (
    agency &&
    (BUNDLED_MHC_PLANS as readonly string[]).includes(agency.subscriptionPlan) &&
    agency.subscriptionStatus === 'ACTIVE'
  ) {
    return { plan: 'BUNDLED', isBundled: true, aiEnabled: true, staffLimit: -1, aiParseLimit: -1 };
  }

  // 2. Standalone CredTrack subscription
  if (ctSub && ctSub.status === 'ACTIVE') {
    if (ctSub.plan === 'ENTERPRISE') {
      return { plan: 'ENTERPRISE', isBundled: false, aiEnabled: true, staffLimit: -1, aiParseLimit: -1 };
    }
    if (ctSub.plan === 'GROWTH') {
      return { plan: 'GROWTH', isBundled: false, aiEnabled: true, staffLimit: 50, aiParseLimit: 100 };
    }
  }

  // 3. Default: STARTER (free)
  return { plan: 'STARTER', isBundled: false, aiEnabled: false, staffLimit: 5, aiParseLimit: 0 };
}

export async function canUseAIParsing(agencyId: string): Promise<boolean> {
  const resolved = await getCredTrackPlan(agencyId);
  return resolved.aiEnabled;
}

export async function canAddStaff(
  agencyId: string
): Promise<{ canAdd: boolean; currentCount: number; limit: number }> {
  const [resolved, currentCount] = await Promise.all([
    getCredTrackPlan(agencyId),
    prisma.staffMember.count({ where: { agencyId, status: 'ACTIVE' } }),
  ]);

  if (resolved.staffLimit === -1) {
    return { canAdd: true, currentCount, limit: -1 };
  }

  return {
    canAdd: currentCount < resolved.staffLimit,
    currentCount,
    limit: resolved.staffLimit,
  };
}
