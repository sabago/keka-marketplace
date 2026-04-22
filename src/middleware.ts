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
    '/api/webhook',
    '/api/contact',
    '/api/products',
    '/api/categories',
    '/api/knowledge-base',
    '/api/agencies',
    '/pending-approval',
    '/account-suspended',
    '/request-access',
    '/api/request-access',
    '/privacy',
    '/terms',
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

  if (token && token.agencyId) {
    const isPlatformOrSuper = token.role === UserRole.PLATFORM_ADMIN || token.role === UserRole.SUPERADMIN;

    // Routes blocked for ALL roles when agency is suspended/rejected/pending.
    // Platform/super admins are still blocked from chatbot (AI queries tracked per agency)
    // but NOT from /admin/* or /agency/* (they need those to manage the platform).
    const chatbotRoutes = ['/api/chatbot'];

    // Routes blocked only for non-platform-admin roles
    const agencyFeatureRoutes = [
      '/agency',
      '/api/agency',
      '/api/dashboard',
      // Note: /account is intentionally excluded — it's user-level, not agency-gated
    ];

    const routesToCheck = isPlatformOrSuper
      ? chatbotRoutes
      : [...chatbotRoutes, ...agencyFeatureRoutes];

    const requiresApproval = routesToCheck.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );

    if (requiresApproval) {
      // Read approval status directly from the JWT — it's set at login and cached in the token.
      // This avoids an HTTP loopback fetch + DB query on every request.
      // Trade-off: status reflects at next login after an admin changes it (acceptable).
      const approvalStatus = token.agencyApprovalStatus as string | null;

      const isBlocked =
        approvalStatus === 'SUSPENDED' ||
        approvalStatus === 'REJECTED' ||
        (!isPlatformOrSuper && approvalStatus === 'PENDING');

      if (isBlocked) {
        if (pathname.startsWith('/api')) {
          const messages: Record<string, string> = {
            PENDING: 'Your agency is currently under review.',
            REJECTED: 'Your agency application was not approved.',
            SUSPENDED: 'Your agency account has been suspended.',
          };
          return NextResponse.json(
            { error: messages[approvalStatus ?? ''] ?? 'Access denied' },
            { status: 403, headers: { 'X-Agency-Status': approvalStatus ?? '' } }
          );
        }
        // Page redirects (only for non-platform-admin roles)
        if (!isPlatformOrSuper) {
          if (approvalStatus === 'PENDING') {
            return NextResponse.redirect(new URL('/pending-approval', request.url));
          }
          return NextResponse.redirect(new URL('/account-suspended', request.url));
        }
      }
    }
  }

  // ============================================================================
  // BLOCK AGENCY-SCOPED FEATURES FOR PLATFORM/SUPER ADMINS WITHOUT AN AGENCY
  // Credential parsing and AI assistant are tracked under agencyId — no agency = no access
  // ============================================================================
  if (
    token &&
    (token.role === UserRole.PLATFORM_ADMIN || token.role === UserRole.SUPERADMIN) &&
    !token.agencyId
  ) {
    const agencyOnlyRoutes = [
      '/api/chatbot/credentials',
      '/api/agency/credentials',
      '/api/employee/credentials/upload',
      '/api/agent',
    ];
    const isAgencyOnlyRoute = agencyOnlyRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/')
    );
    if (isAgencyOnlyRoute) {
      return NextResponse.json(
        {
          error: 'Agency required',
          message: 'This feature requires an agency association. Platform administrators must be assigned to an agency to use credential parsing and AI assistant features.',
        },
        { status: 403 }
      );
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
