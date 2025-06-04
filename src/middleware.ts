import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware will only run on localhost to bypass authentication for admin routes
export function middleware(request: NextRequest) {
  // Only run this middleware on localhost
  if (request.headers.get('host')?.includes('localhost')) {
    // Check if the request is for an admin page
    if (request.nextUrl.pathname.startsWith('/admin')) {
      // For admin routes on localhost, we'll add a special header
      // This is just to mark that we're in dev mode and authentication is bypassed
      const response = NextResponse.next();
      response.headers.set('x-admin-dev-mode', 'true');
      return response;
    }
  }

  // For all other cases, just continue with the request
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    // Match all admin routes
    '/admin/:path*',
  ],
};
