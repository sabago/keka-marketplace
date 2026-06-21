import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

/**
 * GET /api/agency/audit-log
 * Returns EventLog entries scoped to the authenticated agency admin's agency.
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 50, max 100)
 *   - eventType: string (optional filter)
 */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const eventType = searchParams.get('eventType') ?? undefined;
    const skip = (page - 1) * limit;

    const where = {
      agencyId: agency.id,
      ...(eventType ? { eventType } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          eventType: true,
          eventData: true,
          createdAt: true,
          // Omit ipHash and userAgent from agency-admin view (internal only)
        },
      }),
      prisma.eventLog.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching agency audit log:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
