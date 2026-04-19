import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@prisma/client';
import {
  chatbotRateLimit,
  authRateLimit,
  agencyRateLimit,
  generalRateLimit,
  getIP,
  checkRateLimit,
  createRateLimitResponse,
  createRateLimitHeaders,
} from '@/lib/rateLimit';

/**
 * Middleware for authentication, authorization, rate limiting and security
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getIP(request);

  // Get authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION CHECKS
  // ============================================================================

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth',
    '/products',
    '/marketplace',
    '/categories',
    '/knowledge-base',
    '/directory',
    '/about',
    '/contact',
    '/kb',
    '/pricing',
    '/api/webhooks',
    '/api/products',
    '/api/categories',
    '/api/knowledge-base',
    '/api/agencies',
    '/pending-approval',
    '/account-suspended',
    '/request-access',
    '/api/request-access',
  ];

  // Allow public GET requests to settings (reading is public, writing requires admin)
  if (pathname === '/api/admin/settings' && request.method === 'GET') {
    return NextResponse.next();
  }

  // Redirect signed-in users away from the marketing pricing page
  if (pathname === '/pricing' && token) {
    const role = token.role as string;
    if (role === 'AGENCY_ADMIN') {
      return NextResponse.redirect(new URL('/agency/subscription', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isPublicRoute = publicRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );

  // Protected routes require authentication
  if (!isPublicRoute && !token) {
    // Redirect to sign in for protected pages
    if (!pathname.startsWith('/api')) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // ============================================================================
  // AGENCY APPROVAL STATUS CHECKS
  // ============================================================================

  // Check agency approval status for users with agency association (except platform/super admins)
  if (token && token.agencyId && token.role !== UserRole.PLATFORM_ADMIN && token.role !== UserRole.SUPERADMIN) {
    // Routes that require approved agency status
    const protectedFeatureRoutes = [
      '/dashboard',
      '/agency',
      '/directory',
      '/referrals',
      '/chatbot',
      '/api/chatbot',
      '/api/agency',
      '/api/dashboard',
      '/api/referrals',
      '/api/recommendations',
      '/api/favorites',
    ];

    const requiresApproval = protectedFeatureRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );

    if (requiresApproval) {
      try {
        // Fetch agency approval status via internal API (Prisma cannot run in Edge Runtime)
        const statusUrl = new URL('/api/internal/agency-status', request.url);
        statusUrl.searchParams.set('id', token.agencyId as string);
        const statusRes = await fetch(statusUrl.toString(), {
          headers: {
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
        });

        if (statusRes.ok) {
          const { agency } = await statusRes.json();

          if (agency) {
            const { approvalStatus } = agency;

            // Handle PENDING status
            if (approvalStatus === 'PENDING') {
              if (pathname.startsWith('/api')) {
                return NextResponse.json(
                  {
                    error: 'Agency approval pending',
                    message: 'Your agency is currently under review. You will receive an email once approved.',
                  },
                  { status: 403, headers: { 'X-Agency-Status': 'PENDING' } }
                );
              }
              return NextResponse.redirect(new URL('/pending-approval', request.url));
            }

            // Handle REJECTED status
            if (approvalStatus === 'REJECTED') {
              if (pathname.startsWith('/api')) {
                return NextResponse.json(
                  {
                    error: 'Agency application not approved',
                    message: 'Your agency application was not approved.',
                    reason: agency.rejectionReason || undefined,
                  },
                  { status: 403, headers: { 'X-Agency-Status': 'REJECTED' } }
                );
              }
              return NextResponse.redirect(new URL('/account-suspended', request.url));
            }

            // Handle SUSPENDED status
            if (approvalStatus === 'SUSPENDED') {
              if (pathname.startsWith('/api')) {
                return NextResponse.json(
                  {
                    error: 'Account suspended',
                    message: 'Your agency account has been suspended.',
                    reason: agency.rejectionReason || undefined,
                  },
                  { status: 403, headers: { 'X-Agency-Status': 'SUSPENDED' } }
                );
              }
              return NextResponse.redirect(new URL('/account-suspended', request.url));
            }

            // APPROVED status - allow access (continue to next checks)
          }
        }
      } catch (error) {
        console.error('Error checking agency approval status:', error);
        // On error, allow the request to continue (fail open for availability)
      }
    }
  }

  // /admin/superadmins - PLATFORM_ADMIN only
  if (pathname.startsWith('/admin/superadmins') || pathname.startsWith('/api/admin/invite-superadmin')) {
    if (token?.role !== UserRole.PLATFORM_ADMIN) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Platform administrator access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url));
    }
  }

  // All other /admin routes - PLATFORM_ADMIN or SUPERADMIN
  if (pathname.startsWith('/admin') || (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/invite-superadmin'))) {
    if (token?.role !== UserRole.PLATFORM_ADMIN && token?.role !== UserRole.SUPERADMIN) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Administrator access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url));
    }
  }

  // Agency admin routes - require AGENCY_ADMIN, PLATFORM_ADMIN, or SUPERADMIN
  if (pathname.startsWith('/agency/settings') || pathname.startsWith('/agency/users')) {
    if (token?.role !== UserRole.AGENCY_ADMIN && token?.role !== UserRole.PLATFORM_ADMIN && token?.role !== UserRole.SUPERADMIN) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Agency administrator access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url));
    }
  }

  // Agency routes - require agency association (except platform/super admins)
  if (pathname.startsWith('/agency') || pathname.startsWith('/dashboard')) {
    if (!token?.agencyId && token?.role !== UserRole.PLATFORM_ADMIN && token?.role !== UserRole.SUPERADMIN) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Agency association required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/auth/error?error=NoAgency', request.url));
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  let rateLimitResult = null;

  // Skip all rate limiting for localhost in development
  const isLocalhost = ip === '127.0.0.1' || ip === '::1';
  if (!isLocalhost) {
    // Chatbot API: 50 requests/hour per IP
    if (pathname.startsWith('/api/chatbot')) {
      rateLimitResult = await checkRateLimit(chatbotRateLimit, ip);

      if (!rateLimitResult.success) {
        return createRateLimitResponse(
          rateLimitResult.reset,
          rateLimitResult.limit,
          rateLimitResult.remaining
        );
      }
    }

    // Auth signin: 5 attempts/15min per IP
    if (pathname.startsWith('/api/auth/signin') || pathname.startsWith('/api/auth/login')) {
      rateLimitResult = await checkRateLimit(authRateLimit, ip);

      if (!rateLimitResult.success) {
        return createRateLimitResponse(
          rateLimitResult.reset,
          rateLimitResult.limit,
          rateLimitResult.remaining
        );
      }
    }

    // Agency API: 100 requests/hour per agency (use agency ID if available)
    if (pathname.startsWith('/api/agency')) {
      // Try to get agency ID from token, header, or fall back to IP
      const agencyId = (token?.agencyId as string) || request.headers.get('x-agency-id') || ip;
      rateLimitResult = await checkRateLimit(agencyRateLimit, agencyId);

      if (!rateLimitResult.success) {
        return createRateLimitResponse(
          rateLimitResult.reset,
          rateLimitResult.limit,
          rateLimitResult.remaining
        );
      }
    }
  }

  // General API rate limiting: 200 requests/hour per IP
  // Skip for admin routes (handled separately) and localhost dev
  if (pathname.startsWith('/api') && !rateLimitResult && !pathname.startsWith('/api/admin') && !isLocalhost) {
    rateLimitResult = await checkRateLimit(generalRateLimit, ip);

    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.reset,
        rateLimitResult.limit,
        rateLimitResult.remaining
      );
    }
  }

  // ============================================================================
  // RESPONSE WITH HEADERS
  // ============================================================================

  const response = NextResponse.next();

  // Add rate limit headers if we checked rate limits
  if (rateLimitResult) {
    const headers = createRateLimitHeaders(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset
    );

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// Configure the middleware to run on all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     * - api/auth (NextAuth routes)
     * - api/internal (internal server-to-server routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api/auth|api/internal|api/cron|api/dev).*)',
  ],
};
