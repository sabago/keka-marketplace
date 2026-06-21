import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';

const RejectSchema = z.object({ reason: z.string().min(1) });

/**
 * POST /api/admin/agencies/[id]/reject
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireSuperadmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = RejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const updated = await prisma.agency.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: parsed.data.reason,
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'REJECT_AGENCY',
        targetAgencyId: id,
        notes: parsed.data.reason,
        details: { previousStatus: agency.approvalStatus },
      },
    });

    return NextResponse.json({ success: true, agency: updated });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to reject agency' }, { status: 500 });
  }
}
