import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "6months";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "3months":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "12months":
        startDate.setMonth(now.getMonth() - 12);
        break;
      case "all":
        startDate = new Date(2020, 0, 1); // Start from 2020
        break;
    }

    // Mock data for demo
    // In production, query actual database

    return NextResponse.json({
      referralsByMonth: [
        { month: "Jan", count: 12 },
        { month: "Feb", count: 19 },
        { month: "Mar", count: 15 },
        { month: "Apr", count: 25 },
        { month: "May", count: 22 },
        { month: "Jun", count: 30 },
      ],
      topSources: [
        { name: "Mass General Hospital", count: 45 },
        { name: "Hebrew Rehab Center", count: 38 },
        { name: "VNA Care Network", count: 32 },
        { name: "Beth Israel Deaconess", count: 28 },
        { name: "Brigham and Women's", count: 24 },
      ],
      statusBreakdown: [
        { name: "Accepted", value: 45 },
        { name: "Pending", value: 28 },
        { name: "Responded", value: 18 },
        { name: "Declined", value: 9 },
      ],
      responseTimeByDay: [
        { day: "Mon", avgTime: 24 },
        { day: "Tue", avgTime: 18 },
        { day: "Wed", avgTime: 22 },
        { day: "Thu", avgTime: 20 },
        { day: "Fri", avgTime: 28 },
        { day: "Sat", avgTime: 36 },
        { day: "Sun", avgTime: 42 },
      ],
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
