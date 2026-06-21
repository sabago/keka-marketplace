import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { CredTrackSessionUser } from '@/lib/authHelpers';
import PricingClient from './PricingClient';

export const metadata = {
  title: 'Pricing — CredTrack by Mastering HomeCare',
};

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as CredTrackSessionUser | undefined;

  return (
    <PricingClient
      currentPlan={user?.credtrackPlan ?? null}
      isBundled={user?.isBundled ?? false}
      isLoggedIn={!!user}
    />
  );
}
