import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/status
 * Returns the approval status of the authenticated user's linked agency.
 * Used by the Header component to detect mid-session suspension for platform/super admins.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const isPlatformOrSuper = user.role === 'PLATFORM_ADMIN' || user.role === 'SUPERADMIN';

  // For platform/super admins always do a live DB lookup — their agencyId can be
  // changed mid-session by another admin, so the JWT value is unreliable in both
  // directions (assigned when JWT says none, removed when JWT still has old id).
  let agencyId: string | null = user.agencyId ?? null;
  if (isPlatformOrSuper) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id as string },
      select: { agencyId: true },
    });
    agencyId = dbUser?.agencyId ?? null;
  }

  console.log('[agency/status] user:', user.id, 'role:', user.role, 'jwtAgencyId:', user.agencyId, 'resolvedAgencyId:', agencyId);

  if (!agencyId) {
    console.log('[agency/status] no agency found → returning null');
    return NextResponse.json({ approvalStatus: null });
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { approvalStatus: true },
  });

  console.log('[agency/status] agency approvalStatus:', agency?.approvalStatus);
  return NextResponse.json({ approvalStatus: agency?.approvalStatus ?? null, agencyId });
}
