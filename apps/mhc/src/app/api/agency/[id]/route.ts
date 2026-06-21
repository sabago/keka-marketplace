import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

/**
 * GET /api/agency/[id]
 * Fetch agency details by ID
 * Used for account status pages to display agency info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authentication token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: agencyId } = await params;

    // Verify that the user is accessing their own agency data or is a platform admin
    if (
      token.agencyId !== agencyId &&
      token.role !== UserRole.PLATFORM_ADMIN
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch agency data
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        agencyName: true,
        licenseNumber: true,
        approvalStatus: true,
        rejectionReason: true,
        primaryContactEmail: true,
        primaryContactName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(agency);
  } catch (error) {
    console.error('Error fetching agency data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agency data' },
      { status: 500 }
    );
  }
}
