import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      referralSourceSlug,
      submissionDate,
      submissionMethod,
      patientType,
      notes,
    } = body;

    // Validate required fields
    if (!referralSourceSlug || !submissionDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the referral source exists
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug: referralSourceSlug },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Invalid referral source" },
        { status: 400 }
      );
    }

    // In production, get agencyId from authenticated session
    // For now, create a mock agency if none exists
    let agency = await prisma.agency.findFirst();

    if (!agency) {
      // Create a mock agency for development
      agency = await prisma.agency.create({
        data: {
          agencyName: "Demo Agency",
          licenseNumber: "DEMO-001",
          subscriptionPlan: "PRO",
          subscriptionStatus: "ACTIVE",
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          servicesOffered: ["Home Care"],
          serviceArea: ["MA"],
          agencySize: "SMALL",
          primaryContactName: "Demo User",
          primaryContactRole: "Administrator",
          primaryContactEmail: "demo@example.com",
        },
      });
    }

    // Create the referral tracking record
    const referral = await prisma.referralTracking.create({
      data: {
        agencyId: agency.id,
        referralSourceSlug,
        submissionDate: new Date(submissionDate),
        submissionMethod: submissionMethod || "PORTAL",
        patientType,
        notes,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({
      success: true,
      referral,
    });
  } catch (error) {
    console.error("Error logging referral:", error);
    return NextResponse.json(
      { error: "Failed to log referral" },
      { status: 500 }
    );
  }
}
