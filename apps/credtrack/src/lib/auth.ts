import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@mhc/db';
import { compare } from 'bcryptjs';
import { getCredTrackPlan } from '@/lib/credtrackSubscription';
import type { CredTrackPlan } from '@/types/next-auth';

const STATUS_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            isActive: true,
            agencyId: true,
            image: true,
            role: true,
          },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) throw new Error('Invalid email or password');

        if (!user.isActive) {
          throw new Error('Your account has been deactivated. Please contact support.');
        }

        // SUPERADMIN and PLATFORM_ADMIN may have no agencyId
        const adminRoles = ['SUPERADMIN', 'PLATFORM_ADMIN'];
        if (!user.agencyId && !adminRoles.includes(user.role)) {
          throw new Error('No organization associated with this account.');
        }

        const resolved = user.agencyId
          ? await getCredTrackPlan(user.agencyId)
          : { plan: 'STARTER' as const, isBundled: false };

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          orgId: user.agencyId ?? null,
          role: user.role,
          credtrackPlan: resolved.plan,
          isBundled: resolved.isBundled,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Isolate cookies from MHC to prevent cross-app session bleed
  cookies: {
    sessionToken: {
      name: 'next-auth.credtrack.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in
      if (user) {
        token.id = user.id;
        token.orgId = (user as any).orgId;
        token.role = (user as any).role;
        token.credtrackPlan = (user as any).credtrackPlan as CredTrackPlan;
        token.isBundled = (user as any).isBundled;
        token.email = user.email;
        token.name = user.name;
      }

      // Periodically re-validate plan (catches MHC downgrades mid-session)
      const now = Date.now();
      const lastChecked = (token.orgStatusCheckedAt as number) ?? 0;
      const orgId = token.orgId as string | null | undefined;
      if (orgId && now - lastChecked > STATUS_CHECK_INTERVAL_MS) {
        const resolved = await getCredTrackPlan(orgId);
        token.credtrackPlan = resolved.plan;
        token.isBundled = resolved.isBundled;
        token.orgStatusCheckedAt = now;
      }

      // Handle client-side session updates
      if (trigger === 'update' && session) {
        if (session.credtrackPlan) token.credtrackPlan = session.credtrackPlan;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.orgId = token.orgId as string;
        session.user.role = token.role as string;
        session.user.credtrackPlan = token.credtrackPlan as CredTrackPlan;
        session.user.isBundled = token.isBundled as boolean;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.includes('/auth/signin') || url.includes('/auth/signout')) {
        return `${baseUrl}/dashboard`;
      }
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};
