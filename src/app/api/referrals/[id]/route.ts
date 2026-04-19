import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getOwned(id: string, agencyId: string | null, userId: string | null) {
  const existing = await prisma.referralTracking.findUnique({ where: { id } });
  if (!existing) return null;
  const isOwner =
    (agencyId && existing.agencyId === agencyId) ||
    (userId && existing.loggedByUserId === userId);
  return isOwner ? existing : false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { id } = await params;
    const agencyId = session.user.agencyId ?? null;
    const userId = (session.user as any).id ?? null;

    const owned = await getOwned(id, agencyId, userId);
    if (owned === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (owned === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const referral = await prisma.referralTracking.findUnique({
      where: { id },
      include: { statusHistory: { orderBy: { changedAt: "asc" } } },
    });

    return NextResponse.json({ referral });
  } catch (error) {
    console.error("Error fetching referral:", error);
    return NextResponse.json({ error: "Failed to fetch referral" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { id } = await params;
    const agencyId = session.user.agencyId ?? null;
    const userId = (session.user as any).id ?? null;

    const existing = await getOwned(id, agencyId, userId);
    if (existing === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { status, notes, responseTime, accepted, patientStarted } = body;

    const statusChanged = status !== undefined && status !== existing.status;

    const updated = await prisma.referralTracking.update({
      where: { id },
      data: {
        ...(status !== undefined && { status, statusUpdatedAt: new Date() }),
        ...(notes !== undefined && { notes }),
        ...(responseTime !== undefined && { responseTime: responseTime === "" ? null : Number(responseTime) }),
        ...(accepted !== undefined && { accepted }),
        ...(patientStarted !== undefined && { patientStarted }),
      },
    });

    // Log the status change to history
    if (statusChanged) {
      await prisma.referralStatusHistory.create({
        data: {
          referralId: id,
          status,
          notes: notes || null,
        },
      });
    }

    return NextResponse.json({ success: true, referral: updated });
  } catch (error) {
    console.error("Error updating referral:", error);
    return NextResponse.json({ error: "Failed to update referral" }, { status: 500 });
  }
}
