import { prisma } from '@mhc/db';

const BUNDLED_MHC_PLANS = ['PRO', 'BUSINESS', 'ENTERPRISE'] as const;

/**
 * Check if an MHC agency's subscription plan includes CredTrack access.
 * Single PK lookup — fast and cheap. Run once at login, then cached in JWT.
 */
export async function resolveMhcBundleAccess(
  agencyId: string
): Promise<{ isBundled: boolean }> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });

  if (!agency) return { isBundled: false };

  const isBundled =
    (BUNDLED_MHC_PLANS as readonly string[]).includes(agency.subscriptionPlan) &&
    agency.subscriptionStatus === 'ACTIVE';

  return { isBundled };
}
