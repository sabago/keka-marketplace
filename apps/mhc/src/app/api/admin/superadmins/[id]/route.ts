/**
 * PATCH /api/admin/superadmins/[id] — update agency association or deactivate
 * DELETE /api/admin/superadmins/[id] — permanently delete superadmin
 * Platform admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const PatchSchema = z.object({
  agencyId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;

    const body = await req.json();
    const validation = PatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { agencyId, isActive } = validation.data;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!target || target.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Superadmin not found' }, { status: 404 });
    }

    // Validate agency exists if provided
    if (agencyId) {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: { id: true },
      });
      if (!agency) {
        return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (agencyId !== undefined) updateData.agencyId = agencyId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, agencyId: true, isActive: true },
    });

    const notes: string[] = [];
    if (agencyId !== undefined) notes.push(`agencyId set to ${agencyId ?? 'none'}`);
    if (isActive !== undefined) notes.push(`isActive set to ${isActive}`);

    await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'SUPERADMIN_UPDATED',
        notes: `Updated superadmin ${target.email}: ${notes.join(', ')}`,
      },
    });

    return NextResponse.json({ success: true, superadmin: updated });
  } catch (error: any) {
    console.error('Error updating superadmin:', error);
    if (error.message?.includes('Platform administrator')) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update superadmin' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePlatformAdmin();
    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!target || target.role !== UserRole.SUPERADMIN) {
      return NextResponse.json({ error: 'Superadmin not found' }, { status: 404 });
    }

    await prisma.adminAction.create({
      data: {
        adminId: adminUser.id,
        actionType: 'SUPERADMIN_DELETED',
        notes: `Deleted superadmin ${target.email} (${target.name})`,
      },
    });

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting superadmin:', error);
    if (error.message?.includes('Platform administrator')) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete superadmin' }, { status: 500 });
  }
}
