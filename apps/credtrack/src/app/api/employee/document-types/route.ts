import { NextResponse } from 'next/server';
import { requireOrg, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';

/**
 * GET /api/employee/document-types
 * Returns document types available for upload by the logged-in AGENCY_USER.
 * Also returns their staffRecordId so the upload modal can reference it.
 */
export async function GET() {
  try {
    const { user, orgId } = await requireOrg();

    const employee = await prisma.staffMember.findFirst({
      where: { agencyId: orgId, email: user.email },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'No staff record found for your account. Contact your administrator.' },
        { status: 404 }
      );
    }

    const documentTypes = await prisma.documentType.findMany({
      where: {
        isActive: true,
        OR: [{ isGlobal: true }, { agencyId: orgId }],
      },
      orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      staffRecordId: employee.id,
      documentTypes,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/employee/document-types error:', err);
    return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 });
  }
}
