import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { ApprovalStatus } from '@prisma/client';
import { z } from 'zod';

const suspendSchema = z.object({
  reason: z.string().min(10, 'Suspension reason must be at least 10 characters'),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/agencies/[id]/suspend
 *
 * Suspend an active agency
 * Body: { reason: string, notes?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require platform admin authentication
    const admin = await requireSuperadmin();

    const body = await request.json();
    const validation = suspendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { reason, notes } = validation.data;

    // Get the agency
    const agency = await prisma.agency.findUnique({
      where: { id: params.id },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    if (agency.approvalStatus === ApprovalStatus.SUSPENDED) {
      return NextResponse.json(
        { error: 'Agency is already suspended' },
        { status: 400 }
      );
    }

    // Update agency and log action in transaction
    await prisma.$transaction(async (tx) => {
      // Update agency to suspended
      await tx.agency.update({
        where: { id: params.id },
        data: {
          approvalStatus: ApprovalStatus.SUSPENDED,
          rejectionReason: reason,
        },
      });

      // Log admin action
      await tx.adminAction.create({
        data: {
          adminId: admin.id,
          actionType: 'SUSPEND_AGENCY',
          targetAgencyId: params.id,
          notes: notes || reason,
        },
      });
    });

    // TODO: Send suspension notification email in Phase 8
    // This would inform the agency of the suspension

    return NextResponse.json({
      success: true,
      message: 'Agency suspended successfully',
    });

  } catch (error) {
    console.error('Error suspending agency:', error);

    if (error instanceof Error && error.message.includes('Platform admin')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to suspend agency' },
      { status: 500 }
    );
  }
}
