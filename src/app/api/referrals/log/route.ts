import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAgency } from "@/lib/authHelpers";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function articleExistsInFiles(slug: string): boolean {
  const contentDirs = [
    path.join(process.cwd(), "src/content/knowledge-base"),
    path.join(process.cwd(), "src/content/massachusetts"),
  ];
  for (const dir of contentDirs) {
    if (searchDirForSlug(dir, slug)) return true;
  }
  return false;
}

function searchDirForSlug(dir: string, slug: string): boolean {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir)) {
    const filePath = path.join(dir, entry);
    if (fs.statSync(filePath).isDirectory()) {
      if (searchDirForSlug(filePath, slug)) return true;
    } else if (entry.endsWith(".md")) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(raw);
        if (data.slug === slug) return true;
      } catch {
        // skip
      }
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { user, agency } = await requireAgency();
    const body = await request.json();
    const { referralSourceSlug, submissionDate, submissionMethod, patientType, notes } = body;

    if (!referralSourceSlug || !submissionDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the referral source exists in markdown files
    if (!articleExistsInFiles(referralSourceSlug)) {
      return NextResponse.json({ error: "Invalid referral source" }, { status: 400 });
    }

    const referral = await prisma.referralTracking.create({
      data: {
        agencyId: agency.id,
        loggedByUserId: user.id,
        referralSourceSlug,
        submissionDate: new Date(submissionDate),
        submissionMethod: submissionMethod || "PORTAL",
        patientType,
        notes,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error("Error logging referral:", error);
    return NextResponse.json({ error: "Failed to log referral" }, { status: 500 });
  }
}
