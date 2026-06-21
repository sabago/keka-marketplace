import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const eventType = searchParams.get('eventType') ?? undefined;

    const where = {
      agencyId: orgId,
      ...(eventType ? { eventType } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventType: true,
          eventData: true,
          createdAt: true,
        },
      }),
      prisma.eventLog.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Audit log error:', err);
    return NextResponse.json({ error: 'Failed to load audit log.' }, { status: 500 });
  }
}
