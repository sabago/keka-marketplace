import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // In production, get agencyId from authenticated session
    let agency = await prisma.agency.findFirst();

    if (!agency) {
      // Create a demo agency for development
      agency = await prisma.agency.create({
        data: {
          agencyName: "Demo Home Care Agency",
          licenseNumber: "MA-HCA-12345",
          subscriptionPlan: "PRO",
          subscriptionStatus: "ACTIVE",
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          servicesOffered: ["Home Health", "Personal Care"],
          serviceArea: ["MA", "Boston"],
          agencySize: "SMALL",
          primaryContactName: "John Smith",
          primaryContactRole: "Administrator",
          primaryContactEmail: "john@demohomecare.com",
          primaryContactPhone: "(617) 555-0100",
        },
      });
    }

    return NextResponse.json({
      agency: {
        agencyName: agency.agencyName,
        licenseNumber: agency.licenseNumber,
        primaryContactName: agency.primaryContactName,
        primaryContactRole: agency.primaryContactRole,
        primaryContactEmail: agency.primaryContactEmail,
        primaryContactPhone: agency.primaryContactPhone,
        servicesOffered: agency.servicesOffered,
        serviceArea: agency.serviceArea,
        agencySize: agency.agencySize,
        subscriptionPlan: agency.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error("Error fetching agency profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
