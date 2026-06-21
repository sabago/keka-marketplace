import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/pricing',
  '/api/auth',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Read JWT from our custom cookie name
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
    cookieName: 'next-auth.credtrack.session-token',
  });

  if (!token) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as string | undefined;

  // /admin/* requires PLATFORM_ADMIN or SUPERADMIN
  if (pathname.startsWith('/admin')) {
    if (role !== 'PLATFORM_ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // /agency/* requires AGENCY_ADMIN, PLATFORM_ADMIN, or SUPERADMIN
  if (pathname.startsWith('/agency')) {
    const adminRoles = ['AGENCY_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN'];
    if (!adminRoles.includes(role ?? '')) {
      return NextResponse.redirect(new URL('/my-credentials', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
