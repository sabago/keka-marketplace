import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * POST /api/admin/agencies/[id]/reactivate
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSuperadmin();
    const { id } = await params;

    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const updated = await prisma.agency.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: user.id,
        rejectionReason: null,
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'REACTIVATE_AGENCY',
        targetAgencyId: id,
        details: { previousStatus: agency.approvalStatus },
      },
    });

    return NextResponse.json({ success: true, agency: updated });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to reactivate agency' }, { status: 500 });
  }
}
