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

    // Phase 1: fetch staffRecord, staffUser, and documentTypes in parallel (all independent)
    const [staffRecord, staffUser, documentTypes] = await Promise.all([
      prisma.staffMember.findFirst({
        where: { userId, agencyId: agency.id },
      }),
      prisma.user.findFirst({
        where: { id: userId, agencyId: agency.id },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.documentType.findMany({
        where: {
          OR: [{ isGlobal: true }, { agencyId: agency.id }],
          isActive: true,
        },
        orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      }),
    ]);

    if (!staffUser) {
      return NextResponse.json(
        { error: 'Staff member not found in your agency' },
        { status: 404 }
      );
    }

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

    // Phase 2: fetch all credential data in parallel (all depend on staffRecord.id)
    const [documents, archivedCredentials, gaps, parsingQueue] = await Promise.all([
      // Current credentials (non-archived) — main list
      prisma.staffCredential.findMany({
        where: {
          staffMemberId: staffRecord.id,
          status: { not: 'ARCHIVED' },
        },
        include: {
          documentType: true,
          parsingJob: { select: { id: true, status: true } },
        },
        orderBy: [{ status: 'desc' }, { expirationDate: 'asc' }],
      }),
      // Archived credentials — history, grouped by documentTypeId
      prisma.staffCredential.findMany({
        where: {
          staffMemberId: staffRecord.id,
          status: 'ARCHIVED',
        },
        include: { documentType: { select: { id: true, name: true } } },
        orderBy: { expirationDate: 'desc' },
      }),
      // Gap detection — types with recheckCadenceDays but no active approved credential
      detectCredentialGaps(staffRecord.id, agency.id),
      // Count jobs currently queued or processing for this agency (for the queue depth card).
      // Exclude jobs that have processingCompletedAt set but were never updated to COMPLETED
      // (can happen if the server crashed mid-update).
      prisma.credentialParsingJob.count({
        where: {
          agencyId: agency.id,
          status: { in: ['PENDING', 'PROCESSING'] },
          processingCompletedAt: null,
        },
      }),
    ]);

    const credentialHistory = archivedCredentials.reduce<Record<string, typeof archivedCredentials>>(
      (acc, c) => {
        (acc[c.documentTypeId] ??= []).push(c);
        return acc;
      },
      {}
    );

    const stats = {
      total: documents.length,
      active: documents.filter((d) => d.status === 'ACTIVE' && d.reviewStatus === 'APPROVED').length,
      expiringSoon: documents.filter((d) => d.status === 'EXPIRING_SOON' && d.reviewStatus === 'APPROVED').length,
      expired: documents.filter((d) => d.status === 'EXPIRED').length,
      pendingReview: documents.filter((d) => d.reviewStatus === 'PENDING_REVIEW').length,
      parsingQueue,
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
