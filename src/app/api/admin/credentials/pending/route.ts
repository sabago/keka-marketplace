/**
 * GET /api/admin/credentials/pending
 *
 * List all credentials pending review
 * Supports filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAgencyAdmin } from '@/lib/authHelpers';

export async function GET(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const agencyId = searchParams.get('agencyId'); // Platform admins can filter by agency
    const status = searchParams.get('status') || 'PENDING_REVIEW';

    // Build where clause
    const where: any = {
      reviewStatus: status,
    };

    // Agency admins only see their agency's credentials
    // Platform admins can see all or filter by agency
    if (user.role === 'AGENCY_ADMIN') {
      where.staffMember = {
        agencyId: agency.id,
      };
    } else if (agencyId) {
      where.staffMember = {
        agencyId,
      };
    }

    // Get total count
    const total = await prisma.staffCredential.count({ where });

    // Get credentials with employee and document type info
    const credentials = await prisma.staffCredential.findMany({
      where,
      include: {
        staffMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            agencyId: true,
            agency: {
              select: {
                id: true,
                agencyName: true,
              },
            },
          },
        },
        documentType: true,
      },
      orderBy: [
        { aiConfidence: 'asc' }, // Low confidence first
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Add statistics
    const stats = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json({
      success: true,
      credentials,
      stats,
    });
  } catch (error) {
    console.error('Error fetching pending credentials:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch pending credentials' },
      { status: 500 }
    );
  }
}
