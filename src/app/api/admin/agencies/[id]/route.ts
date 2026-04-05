import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';

/**
 * GET /api/admin/agencies/[id]
 *
 * Get detailed information about a specific agency
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require platform admin authentication
    await requireSuperadmin();

    const agency = await prisma.agency.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isPrimaryContact: true,
            createdAt: true,
            emailVerified: true,
          },
          orderBy: { isPrimaryContact: 'desc' },
        },
        adminActions: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Last 50 admin actions
        },
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agency });

  } catch (error) {
    console.error('Error fetching agency details:', error);

    if (error instanceof Error && error.message.includes('Platform admin')) {
      return NextResponse.json(
        { error: 'Platform admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch agency details' },
      { status: 500 }
    );
  }
}
