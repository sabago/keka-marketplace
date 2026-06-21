import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/admin/agencies/[id]
 * Agency detail with users and recent admin actions.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperadmin();
    const { id } = await params;

    const agency = await prisma.agency.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isPrimaryContact: true,
            isActive: true,
            createdAt: true,
          },
        },
        adminActions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            admin: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { staffMembers: true } },
      },
    });

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: 'Failed to fetch agency' }, { status: 500 });
  }
}
