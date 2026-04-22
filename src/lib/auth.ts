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

        // Find user by email — select only what authorize needs; agency row is not used here
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

        // Return user object with agency data
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
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
        token.email = user.email;
        token.name = user.name;
      }

      // Handle OAuth sign-in - fetch additional user data
      if (account?.provider === 'google' && user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, agencyId: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.agencyId = dbUser.agencyId;
        }
      }

      // Handle session updates (e.g., from client-side session update)
      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role;
        if (session.agencyId !== undefined) token.agencyId = session.agencyId;
      }

      return token;
    },

    async session({ session, token }) {
      // Attach token data to session for client access
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.agencyId = token.agencyId as string | null;
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
