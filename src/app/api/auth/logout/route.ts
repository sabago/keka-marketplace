import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * 
 * This endpoint is called by the WordPress plugin when a user logs out of WordPress.
 * It sets a special cookie that will be read by the client-side code to clear the session.
 */
export async function POST() {
  try {
    // Set a cookie that will be read by the client-side code
    const response = NextResponse.json({ success: true });
    
    // Set the cookie with a short expiration (1 hour)
    // This cookie will be read by the authContext.tsx to clear the session
    response.cookies.set({
      name: 'wp_marketplace_logout',
      value: '1',
      path: '/',
      maxAge: 60 * 60, // 1 hour
      httpOnly: false, // Must be accessible from JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error("Error in logout endpoint:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
