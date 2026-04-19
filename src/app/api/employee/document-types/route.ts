/**
 * GET /api/employee/document-types
 *
 * Get available document types for employee's agency
 * Returns both global and agency-specific document types
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { getOrCreateStaffRecord } from '@/lib/credentialHelpers';

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    const employee = await getOrCreateStaffRecord(user.id);
    if (!employee) {
      return NextResponse.json(
        { error: 'No agency association found. Please contact your administrator.' },
        { status: 404 }
      );
    }

    // Get document types (global + agency-specific)
    const documentTypes = await prisma.documentType.findMany({
      where: {
        isActive: true,
        OR: [
          { isGlobal: true },
          { agencyId: employee.agencyId },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        expirationDays: true,
        isRequired: true,
        isGlobal: true,
      },
      orderBy: [
        { isRequired: 'desc' }, // Required first
        { name: 'asc' },        // Then alphabetically
      ],
    });

    // Group by required/optional for better UX
    const required = documentTypes.filter((dt) => dt.isRequired);
    const optional = documentTypes.filter((dt) => !dt.isRequired);

    return NextResponse.json({
      success: true,
      documentTypes,
      grouped: {
        required,
        optional,
      },
      total: documentTypes.length,
    });
  } catch (error) {
    console.error('Error fetching document types:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch document types' },
      { status: 500 }
    );
  }
}
