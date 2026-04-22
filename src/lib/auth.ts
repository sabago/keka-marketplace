import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db';
import { compare } from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // Credentials Provider (Email/Password)
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

        // Find user by email — select only what authorize needs
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            agencyId: true,
            image: true,
            isActive: true,
            agency: {
              select: { approvalStatus: true },
            },
          },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Block deactivated users
        if (!user.isActive) {
          throw new Error('Your account has been deactivated. Please contact your agency admin.');
        }

        // Block login for suspended/rejected agencies (non-platform-admins only)
        if (user.agency && user.role !== 'PLATFORM_ADMIN' && user.role !== 'SUPERADMIN') {
          const status = user.agency.approvalStatus;
          if (status === 'SUSPENDED') {
            throw new Error('Your agency account has been suspended. Please contact support.');
          }
          if (status === 'REJECTED') {
            throw new Error('Your agency application was not approved. Please contact support.');
          }
        }

        // Return user object with agency data
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
          agencyApprovalStatus: user.agency?.approvalStatus ?? null,
          image: user.image,
        };
      },
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true, // Allow linking accounts with same email
    }),
  ],

  // Session strategy
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT callbacks
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in - attach user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
        token.agencyId = user.agencyId || null;
        token.agencyApprovalStatus = (user as any).agencyApprovalStatus ?? null;
        token.email = user.email;
        token.name = user.name;
      }

      // Handle OAuth sign-in - fetch additional user data
      if (account?.provider === 'google' && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            agencyId: true,
            agency: { select: { approvalStatus: true } },
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.agencyId = dbUser.agencyId;
          token.agencyApprovalStatus = dbUser.agency?.approvalStatus ?? null;
        }
      }

      // Periodically re-validate agency approval status from DB to enforce
      // suspension/rejection mid-session without a DB hit on every request.
      // Trade-off: up to 5-minute window between suspension and enforcement for active sessions.
      // Lower STATUS_CHECK_INTERVAL_MS if compliance requirements demand faster enforcement.
      const STATUS_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      const lastChecked = (token.agencyStatusCheckedAt as number) ?? 0;
      const isAgencyUser =
        token.agencyId &&
        token.role !== UserRole.PLATFORM_ADMIN &&
        token.role !== UserRole.SUPERADMIN;

      if (isAgencyUser && now - lastChecked > STATUS_CHECK_INTERVAL_MS) {
        const agencyRow = await prisma.agency.findUnique({
          where: { id: token.agencyId as string },
          select: { approvalStatus: true },
        });
        if (agencyRow) {
          token.agencyApprovalStatus = agencyRow.approvalStatus;
        }
        token.agencyStatusCheckedAt = now;
      }

      // Periodically re-validate isActive from DB so deactivated users are reflected
      // in the session without requiring a logout. Same 5-minute window.
      if (token.id && now - ((token.userStatusCheckedAt as number) ?? 0) > STATUS_CHECK_INTERVAL_MS) {
        const userRow = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isActive: true },
        });
        if (userRow) {
          token.isActive = userRow.isActive;
        }
        token.userStatusCheckedAt = now;
      }

      // Handle session updates (e.g., from client-side session update)
      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role;
        if (session.agencyId !== undefined) token.agencyId = session.agencyId;
        if (session.agencyApprovalStatus !== undefined) token.agencyApprovalStatus = session.agencyApprovalStatus;
      }

      return token;
    },

    async session({ session, token }) {
      // Attach token data to session for client access
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.agencyId = token.agencyId as string | null;
        (session.user as any).agencyApprovalStatus = token.agencyApprovalStatus as string | null;
        (session.user as any).isActive = token.isActive ?? true;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  // Custom pages
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    // verifyRequest: '/auth/verify-request',
    // newUser: '/auth/new-user',
  },

  // Debug mode only when explicitly requested — always-on debug adds overhead on every session call
  debug: process.env.NEXTAUTH_DEBUG === 'true',

  // Secret for JWT encryption
  secret: process.env.NEXTAUTH_SECRET,

  // Events for logging
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`User signed in: ${user.email} via ${account?.provider || 'credentials'}`);

      if (isNewUser) {
        console.log(`New user created: ${user.email}`);
      }
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
  },
};
