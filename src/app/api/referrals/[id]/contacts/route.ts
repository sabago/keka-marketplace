import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function verifyOwnership(referralId: string, agencyId: string | null, userId: string | null) {
  const referral = await prisma.referralTracking.findUnique({ where: { id: referralId } });
  if (!referral) return null;
  const isOwner =
    (agencyId && referral.agencyId === agencyId) ||
    (userId && referral.loggedByUserId === userId);
  return isOwner ? referral : false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const { id } = await params;
    const agencyId = session.user.agencyId ?? null;
    const userId = (session.user as any).id ?? null;

    const owned = await verifyOwnership(id, agencyId, userId);
    if (owned === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (owned === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { contactedAt, contactName, method, outcome, notes } = body;

    if (!contactedAt) {
      return NextResponse.json({ error: "contactedAt is required" }, { status: 400 });
    }

    // Log the contact attempt as a note on the referral
    const updated = await prisma.referralTracking.update({
      where: { id },
      data: {
        notes: [
          owned.notes,
          `[Contact log ${new Date(contactedAt).toLocaleDateString()}] ${contactName ? `Contact: ${contactName}. ` : ''}${method ? `Method: ${method}. ` : ''}${outcome ? `Outcome: ${outcome}. ` : ''}${notes || ''}`,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    });

    return NextResponse.json({ success: true, log: updated });
  } catch (error) {
    console.error("Error adding contact log:", error);
    return NextResponse.json({ error: "Failed to add contact log" }, { status: 500 });
  }
}
