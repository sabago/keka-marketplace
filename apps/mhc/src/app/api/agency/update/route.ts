import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agencyName,
      primaryContactName,
      primaryContactRole,
      primaryContactEmail,
      primaryContactPhone,
      servicesOffered,
      serviceArea,
      agencySize,
    } = body;

    // In production, get agencyId from authenticated session
    let agency = await prisma.agency.findFirst();

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    // Update agency profile
    const updatedAgency = await prisma.agency.update({
      where: {
        id: agency.id,
      },
      data: {
        agencyName,
        primaryContactName,
        primaryContactRole,
        primaryContactEmail,
        primaryContactPhone,
        servicesOffered,
        serviceArea,
        agencySize,
      },
    });

    return NextResponse.json({
      success: true,
      agency: updatedAgency,
    });
  } catch (error) {
    console.error("Error updating agency profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
