import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { canAddStaff } from '@/lib/subscriptionHelpers';

/**
 * GET /api/agency/staff/limit
 * Returns the current staff count and limit for the agency
 */
export async function GET(req: NextRequest) {
  try {
    const { agency } = await requireAgencyAdmin();

    const result = await canAddStaff(agency.id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching staff limit:', error);

    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error.message?.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch staff limit' },
      { status: 500 }
    );
  }
}
