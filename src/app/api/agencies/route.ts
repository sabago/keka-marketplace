import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApprovalStatus } from '@prisma/client';

/**
 * GET /api/agencies
 *
 * Public endpoint to list APPROVED agencies for the directory
 * Only returns public-facing information (no sensitive data)
 * Query params:
 * - search: Search by name, city, or state
 * - state: Filter by state
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const stateFilter = searchParams.get('state');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause - only show APPROVED agencies
    const where: any = {
      approvalStatus: ApprovalStatus.APPROVED,
    };

    // Search filter
    if (search) {
      where.OR = [
        { agencyName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ];
    }

    // State filter
    if (stateFilter) {
      where.state = stateFilter;
    }

    // Get agencies with pagination
    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where,
        skip,
        take: limit,
        orderBy: { agencyName: 'asc' },
        select: {
          id: true,
          agencyName: true,
          licenseNumber: true,
          city: true,
          state: true,
          phoneNumber: true,
          primaryContactEmail: true,
          websiteUrl: true,
          servicesOffered: true,
          serviceArea: true,
          agencySize: true,
        },
      }),
      prisma.agency.count({ where }),
    ]);

    // Format response with only public information
    const publicAgencies = agencies.map((agency) => ({
      id: agency.id,
      agencyName: agency.agencyName,
      licenseNumber: agency.licenseNumber,
      city: agency.city,
      state: agency.state,
      phone: agency.phoneNumber,
      email: agency.primaryContactEmail,
      website: agency.websiteUrl,
      services: agency.servicesOffered,
      serviceArea: agency.serviceArea,
      size: agency.agencySize,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      agencies: publicAgencies,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });

  } catch (error) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agencies' },
      { status: 500 }
    );
  }
}
