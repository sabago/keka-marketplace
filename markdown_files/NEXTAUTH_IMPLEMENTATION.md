# NextAuth.js Authentication Implementation

## Overview

This document describes the complete NextAuth.js authentication system that has been implemented to replace the WordPress JWT authentication.

## Files Created

### 1. Core Configuration
- **`/Users/sandraabago/keka/marketplace/src/lib/auth.ts`**
  - NextAuth configuration with PrismaAdapter
  - Credentials provider (email/password)
  - Google OAuth provider (optional)
  - JWT callbacks with agency data
  - Session callbacks including role and agencyId

### 2. API Route Handler
- **`/Users/sandraabago/keka/marketplace/src/app/api/auth/[...nextauth]/route.ts`**
  - Export GET and POST handlers for NextAuth

### 3. Auth Helper Functions
- **`/Users/sandraabago/keka/marketplace/src/lib/authHelpers.ts`**
  - `getCurrentUser()` - Get current session user
  - `requireAuth()` - Throw if not authenticated
  - `requireAgency()` - Throw if no agency associated
  - `requireAgencyAdmin()` - Require agency admin or platform admin
  - `requirePlatformAdmin()` - Throw if not admin
  - `checkQueryLimit(agencyId)` - Check if agency has queries remaining
  - `incrementQueryCount(agencyId)` - Increment query count and enforce limits
  - `hasAgencyAccess(userId, agencyId)` - Check access permissions
  - `getUserWithAgency(userId)` - Get full user with agency details

### 4. Middleware Protection
- **`/Users/sandraabago/keka/marketplace/src/middleware.ts`**
  - Integrated NextAuth authentication with existing rate limiting
  - Protects `/dashboard/*`, `/agency/*`, `/admin/*` routes
  - Role-based access control for admin routes
  - Agency association verification
  - Rate limiting for `/api/chatbot/*` routes

### 5. Type Definitions
- **`/Users/sandraabago/keka/marketplace/src/types/next-auth.d.ts`**
  - Extended NextAuth types to include `role` and `agencyId` in session

### 6. Environment Variables
- **`/Users/sandraabago/keka/marketplace/.env.local`**
  - `NEXTAUTH_URL=http://localhost:3000`
  - `NEXTAUTH_SECRET=<generated-secret>`
  - `GOOGLE_CLIENT_ID=<optional>`
  - `GOOGLE_CLIENT_SECRET=<optional>`

## Dependencies Installed

```json
{
  "dependencies": {
    "next-auth": "^4.24.13",
    "@next-auth/prisma-adapter": "^1.0.7",
    "bcryptjs": "^3.0.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0"
  }
}
```

## Usage Examples

### 1. Server Component - Get Current User

```typescript
import { getCurrentUser } from '@/lib/authHelpers';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### 2. API Route - Require Authentication

```typescript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';

export async function GET() {
  try {
    const user = await requireAuth();

    return NextResponse.json({
      message: 'Authenticated',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

### 3. API Route - Require Agency

```typescript
import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/authHelpers';

export async function GET() {
  try {
    const { user, agency } = await requireAgency();

    return NextResponse.json({
      user,
      agency: {
        id: agency.id,
        agencyName: agency.agencyName,
        subscriptionPlan: agency.subscriptionPlan,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }
}
```

### 4. API Route - Check Query Limits

```typescript
import { NextResponse } from 'next/server';
import { requireAgency, checkQueryLimit, incrementQueryCount } from '@/lib/authHelpers';

export async function POST(request: Request) {
  try {
    const { user, agency } = await requireAgency();

    // Check if agency has queries remaining
    const limitStatus = await checkQueryLimit(agency.id);

    if (!limitStatus.hasQueriesRemaining) {
      return NextResponse.json(
        {
          error: `Query limit exceeded. Your ${limitStatus.plan} plan allows ${limitStatus.limit} queries per month.`,
          limitStatus,
        },
        { status: 429 }
      );
    }

    // Process the chatbot query...
    const body = await request.json();
    // ... your chatbot logic here

    // Increment query count
    await incrementQueryCount(agency.id);

    return NextResponse.json({
      response: 'Chatbot response here',
      queriesRemaining: limitStatus.queriesRemaining - 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes('limit exceeded') ? 429 : 403 }
    );
  }
}
```

### 5. API Route - Require Platform Admin

```typescript
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const admin = await requirePlatformAdmin();

    // Get all agencies for admin dashboard
    const agencies = await prisma.agency.findMany({
      include: {
        users: true,
      },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }
}
```

### 6. Client Component - Use Session

```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function ProfileButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <button onClick={() => signIn()}>Sign In</button>;
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <p>Role: {session.user.role}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### 7. Root Layout - Session Provider

```typescript
// app/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SessionProvider from '@/components/SessionProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 8. Session Provider Component

```typescript
// components/SessionProvider.tsx
'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export default function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
```

## Protected Routes

The middleware automatically protects the following routes:

### Public Routes (No Authentication Required)
- `/` - Home page
- `/auth/*` - Authentication pages
- `/products/*` - Product listings
- `/about` - About page
- `/contact` - Contact page
- `/kb/*` - Knowledge base articles
- `/api/webhooks/*` - Webhook endpoints

### Protected Routes (Authentication Required)
- `/dashboard/*` - User dashboard (requires agency association)
- `/agency/*` - Agency management (requires agency association)
- `/admin/*` - Platform administration (requires PLATFORM_ADMIN role)

### Role-Based Access
- **PLATFORM_ADMIN**: Full access to all routes including `/admin/*`
- **AGENCY_ADMIN**: Access to agency settings and user management
- **AGENCY_USER**: Access to dashboard and basic agency features

## Query Limits by Plan

The system enforces query limits based on subscription plan:

| Plan | Queries per Month |
|------|-------------------|
| FREE | 10 |
| PRO | 100 |
| BUSINESS | 500 |
| ENTERPRISE | Unlimited |

Use `checkQueryLimit()` and `incrementQueryCount()` helpers to enforce these limits in your API routes.

## Security Features

1. **JWT-based sessions** - Secure, stateless authentication
2. **Password hashing** - Using bcryptjs for password security
3. **Rate limiting** - Integrated with existing Upstash rate limiting
4. **Role-based access control** - Three-tier permission system
5. **Agency isolation** - Users can only access their own agency data
6. **Query limits** - Subscription-based usage limits

## Next Steps

To complete the authentication integration:

1. **Create Sign In Page** - `/app/auth/signin/page.tsx`
2. **Create Sign Up Page** - `/app/auth/signup/page.tsx`
3. **Create Error Page** - `/app/auth/error/page.tsx`
4. **Add User Registration API** - `/app/api/auth/register/route.ts`
5. **Update Existing API Routes** - Replace old JWT auth with NextAuth helpers
6. **Create SessionProvider** - Wrap your app with NextAuth SessionProvider
7. **Add Sign Out Button** - In your navigation/header component
8. **Test Authentication Flow** - Sign up, sign in, and access protected routes

## Migration from WordPress JWT

To migrate from the old WordPress JWT system:

1. Update all API routes to use NextAuth helpers instead of JWT verification
2. Replace JWT token checks with `requireAuth()` or `requireAgency()`
3. Update client-side code to use `useSession()` hook
4. Remove old JWT utility functions
5. Update any stored tokens in local storage to use NextAuth session

## Testing Checklist

- [ ] User can sign up with email/password
- [ ] User can sign in with email/password
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect to sign in
- [ ] Admin routes only accessible to PLATFORM_ADMIN
- [ ] Agency routes require agency association
- [ ] Query limits are enforced correctly
- [ ] Rate limiting works on auth endpoints
- [ ] Sign out works correctly
- [ ] OAuth with Google works (if configured)

## Troubleshooting

### "NEXTAUTH_SECRET is not set"
Make sure `.env.local` has `NEXTAUTH_SECRET` set to a secure random string.

### "Invalid session"
Clear cookies and sign in again. Check that `NEXTAUTH_URL` matches your app URL.

### "Agency association required"
User needs to be linked to an agency. Platform admin can assign users to agencies.

### "Query limit exceeded"
Agency has reached their monthly query limit. They need to upgrade their plan.

### Middleware not protecting routes
Check that the middleware `matcher` config includes the routes you want to protect.

## Production Deployment

Before deploying to production:

1. Generate a new `NEXTAUTH_SECRET` for production
2. Update `NEXTAUTH_URL` to your production domain
3. Configure Google OAuth credentials (if using)
4. Test all authentication flows in production
5. Set up monitoring for failed authentication attempts
6. Configure SMTP for email verification (if needed)

---

**Status**: ✅ Authentication system fully implemented and ready for frontend integration.
