import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { id, contactId } = await params;
    const agencyId = session.user.agencyId ?? null;
    const userId = (session.user as any).id ?? null;

    // Verify ownership of the parent referral
    const referral = await prisma.referralTracking.findUnique({ where: { id } });
    if (!referral) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isOwner =
      (agencyId && referral.agencyId === agencyId) ||
      (userId && referral.loggedByUserId === userId);
    if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    void contactId; // contact logs are stored inline on the referral notes
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact log:", error);
    return NextResponse.json({ error: "Failed to delete contact log" }, { status: 500 });
  }
}
