import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole, ApprovalStatus } from '@prisma/client';
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
import { prisma } from '@/lib/db';

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
  ];

  // Allow public GET requests to settings (reading is public, writing requires admin)
  if (pathname === '/api/admin/settings' && request.method === 'GET') {
    return NextResponse.next();
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

  // Check agency approval status for users with agency association (except platform admins)
  if (token && token.agencyId && token.role !== UserRole.PLATFORM_ADMIN) {
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
        // Fetch agency approval status from database
        const agency = await prisma.agency.findUnique({
          where: { id: token.agencyId as string },
          select: {
            approvalStatus: true,
            rejectionReason: true,
            agencyName: true,
          },
        });

        if (agency) {
          const { approvalStatus } = agency;

          // Handle PENDING status
          if (approvalStatus === ApprovalStatus.PENDING) {
            if (pathname.startsWith('/api')) {
              return NextResponse.json(
                {
                  error: 'Agency approval pending',
                  message: 'Your agency is currently under review. You will receive an email once approved.',
                },
                {
                  status: 403,
                  headers: {
                    'X-Agency-Status': 'PENDING',
                  },
                }
              );
            }
            return NextResponse.redirect(new URL('/pending-approval', request.url));
          }

          // Handle REJECTED status
          if (approvalStatus === ApprovalStatus.REJECTED) {
            if (pathname.startsWith('/api')) {
              return NextResponse.json(
                {
                  error: 'Agency application not approved',
                  message: 'Your agency application was not approved.',
                  reason: agency.rejectionReason || undefined,
                },
                {
                  status: 403,
                  headers: {
                    'X-Agency-Status': 'REJECTED',
                  },
                }
              );
            }
            return NextResponse.redirect(new URL('/account-suspended', request.url));
          }

          // Handle SUSPENDED status
          if (approvalStatus === ApprovalStatus.SUSPENDED) {
            if (pathname.startsWith('/api')) {
              return NextResponse.json(
                {
                  error: 'Account suspended',
                  message: 'Your agency account has been suspended.',
                  reason: agency.rejectionReason || undefined,
                },
                {
                  status: 403,
                  headers: {
                    'X-Agency-Status': 'SUSPENDED',
                  },
                }
              );
            }
            return NextResponse.redirect(new URL('/account-suspended', request.url));
          }

          // APPROVED status - allow access (continue to next checks)
        }
      } catch (error) {
        console.error('Error checking agency approval status:', error);
        // On error, allow the request to continue (fail open for availability)
        // But log the error for monitoring
      }
    }
  }

  // Platform admin routes - only accessible to PLATFORM_ADMIN
  if (pathname.startsWith('/admin')) {
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

  // Agency admin routes - require AGENCY_ADMIN or PLATFORM_ADMIN
  if (pathname.startsWith('/agency/settings') || pathname.startsWith('/agency/users')) {
    if (token?.role !== UserRole.AGENCY_ADMIN && token?.role !== UserRole.PLATFORM_ADMIN) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Agency administrator access required' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url));
    }
  }

  // Agency routes - require agency association (except platform admins)
  if (pathname.startsWith('/agency') || pathname.startsWith('/dashboard')) {
    if (!token?.agencyId && token?.role !== UserRole.PLATFORM_ADMIN) {
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

  // General API rate limiting: 200 requests/hour per IP
  if (pathname.startsWith('/api') && !rateLimitResult) {
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
     */
    '/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)',
  ],
};
