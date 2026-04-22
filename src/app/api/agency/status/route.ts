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

  const agencyId = (session.user as any).agencyId as string | null;
  if (!agencyId) {
    return NextResponse.json({ approvalStatus: null });
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { approvalStatus: true },
  });

  return NextResponse.json({ approvalStatus: agency?.approvalStatus ?? null });
}
