import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// This secret key should match the one in the WordPress plugin
const JWT_SECRET = process.env.WP_JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    // Get payload from request body
    const body = await request.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json(
        { error: "No payload provided" },
        { status: 400 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(payload, JWT_SECRET);
    
    // Return token
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating test token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
