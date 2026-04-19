import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { detectCredentialGaps } from '@/lib/credentialHelpers';

/**
 * GET /api/agency/staff/[id]/credentials
 * Get credentials for a staff member, looked up by User ID.
 * Returns staffRecord, documents (current only), credentialHistory (archived),
 * gaps (types with recheckCadenceDays but no active approved credential), stats, and documentTypes.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { agency } = await requireAgencyAdmin();
    const { id: userId } = await params;

    // Look up the staff credential record linked to this user within this agency
    const staffRecord = await prisma.staffMember.findFirst({
      where: { userId, agencyId: agency.id },
    });

    // Also look up the user's basic info for display
    const staffUser = await prisma.user.findFirst({
      where: { id: userId, agencyId: agency.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!staffUser) {
      return NextResponse.json(
        { error: 'Staff member not found in your agency' },
        { status: 404 }
      );
    }

    const documentTypes = await prisma.documentType.findMany({
      where: {
        OR: [{ isGlobal: true }, { agencyId: agency.id }],
        isActive: true,
      },
      orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    });

    if (!staffRecord) {
      // No credential tracking record yet — return empty state
      return NextResponse.json({
        staffRecord: null,
        staffUser,
        documents: [],
        credentialHistory: {},
        gaps: [],
        stats: { total: 0, active: 0, expiringSoon: 0, expired: 0, pendingReview: 0 },
        documentTypes,
      });
    }

    // Current credentials (non-archived) — main list
    const documents = await prisma.staffCredential.findMany({
      where: {
        staffMemberId: staffRecord.id,
        status: { not: 'ARCHIVED' },
      },
      include: { documentType: true },
      orderBy: [{ status: 'desc' }, { expirationDate: 'asc' }],
    });

    // Archived credentials — history, grouped by documentTypeId
    const archivedCredentials = await prisma.staffCredential.findMany({
      where: {
        staffMemberId: staffRecord.id,
        status: 'ARCHIVED',
      },
      include: { documentType: { select: { id: true, name: true } } },
      orderBy: { expirationDate: 'desc' },
    });

    const credentialHistory = archivedCredentials.reduce<Record<string, typeof archivedCredentials>>(
      (acc, c) => {
        (acc[c.documentTypeId] ??= []).push(c);
        return acc;
      },
      {}
    );

    // Gap detection — types with recheckCadenceDays but no active approved credential
    const gaps = await detectCredentialGaps(staffRecord.id, agency.id);

    const stats = {
      total: documents.length,
      active: documents.filter((d) => d.status === 'ACTIVE' && d.reviewStatus === 'APPROVED').length,
      expiringSoon: documents.filter((d) => d.status === 'EXPIRING_SOON' && d.reviewStatus === 'APPROVED').length,
      expired: documents.filter((d) => d.status === 'EXPIRED').length,
      pendingReview: documents.filter((d) => d.reviewStatus === 'PENDING_REVIEW').length,
    };

    return NextResponse.json({
      staffRecord,
      staffUser,
      documents,
      credentialHistory,
      gaps,
      stats,
      documentTypes,
    });
  } catch (error: any) {
    console.error('Error fetching staff credentials:', error);
    if (error.message?.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}
