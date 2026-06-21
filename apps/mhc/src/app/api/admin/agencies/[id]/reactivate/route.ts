import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { ApprovalStatus } from '@prisma/client';

/**
 * POST /api/admin/agencies/[id]/reactivate
 *
 * Reactivate a suspended agency
 * Body: { notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require platform admin authentication
    const admin = await requireSuperadmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Get the agency
    const agency = await prisma.agency.findUnique({
      where: { id },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    if (agency.approvalStatus !== ApprovalStatus.SUSPENDED) {
      return NextResponse.json(
        { error: 'Only suspended agencies can be reactivated' },
        { status: 400 }
      );
    }

    // Update agency and log action in transaction
    await prisma.$transaction(async (tx) => {
      // Reactivate agency
      await tx.agency.update({
        where: { id: id },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          rejectionReason: null,
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: admin.id,
          actionType: 'REACTIVATE_AGENCY',
          targetAgencyId: id,
          notes: notes || null,
        },
      });
    });

    // TODO: Send reactivation notification email in Phase 8

    return NextResponse.json({
      success: true,
      message: 'Agency reactivated successfully',
    });

  } catch (error) {
    console.error('Error reactivating agency:', error);

    if (error instanceof Error && error.message.includes('Platform admin')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reactivate agency' },
      { status: 500 }
    );
  }
}
