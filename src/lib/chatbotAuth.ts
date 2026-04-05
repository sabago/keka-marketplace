/**
 * Chatbot Authentication Utilities
 * Server-side authentication helpers for RAG chatbot API routes
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getQueryLimit } from '@/lib/subscriptionHelpers';

export interface AuthenticatedChatbotUser {
  userId: string;
  email: string;
  agencyId: string;
  role: string;
}

/**
 * Get authenticated user from NextAuth session
 * Returns user info or null if not authenticated
 */
export async function getChatbotUser(
  request: NextRequest
): Promise<AuthenticatedChatbotUser | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return null;
    }

    const user = session.user as any;

    if (!user.id || !user.agencyId) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email || '',
      agencyId: user.agencyId,
      role: user.role || 'AGENCY_USER',
    };
  } catch (error) {
    console.error('Chatbot authentication error:', error);
    return null;
  }
}

/**
 * Require authentication for chatbot
 * Throws error if user is not authenticated
 */
export async function requireChatbotAuth(
  request: NextRequest
): Promise<AuthenticatedChatbotUser> {
  const user = await getChatbotUser(request);

  if (!user) {
    throw new Error('Authentication required');
  }

  if (!user.agencyId) {
    throw new Error('Agency association required');
  }

  return user;
}

/**
 * Check if agency has exceeded query limit
 */
export async function checkQueryLimit(agencyId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
  upgradeRequired: boolean;
}> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
  });

  if (!agency) {
    throw new Error('Agency not found');
  }

  // Get query limit from centralized subscription helpers
  const limit = getQueryLimit(agency.subscriptionPlan as any);

  // For unlimited plans (limit = -1), always allow
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1, // Unlimited
      limit: -1,
      plan: agency.subscriptionPlan,
      upgradeRequired: false,
    };
  }

  const remaining = Math.max(0, limit - agency.queriesThisMonth);
  const allowed = remaining > 0;
  const upgradeRequired = !allowed && agency.subscriptionPlan !== 'ENTERPRISE' && agency.subscriptionPlan !== 'BUSINESS';

  return {
    allowed,
    remaining,
    limit,
    plan: agency.subscriptionPlan,
    upgradeRequired,
  };
}

/**
 * Increment agency query count
 */
export async function incrementQueryCount(agencyId: string): Promise<void> {
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      queriesThisMonth: { increment: 1 },
      queriesAllTime: { increment: 1 },
    },
  });
}

/**
 * Log chatbot query to database
 */
export async function logChatbotQuery(data: {
  agencyId: string;
  query: string;
  response: string;
  tokensUsed: number;
  modelUsed: string;
  responseTime: number;
  sourcesReturned: any;
  userRating?: number;
}): Promise<void> {
  await prisma.chatbotQuery.create({
    data: {
      agencyId: data.agencyId,
      query: data.query,
      response: data.response,
      tokensUsed: data.tokensUsed,
      modelUsed: data.modelUsed,
      responseTime: data.responseTime,
      sourcesReturned: data.sourcesReturned,
      userRating: data.userRating,
    },
  });
}

/**
 * Reset monthly query counts for all agencies
 * Should be run as a cron job on the 1st of each month
 */
export async function resetMonthlyQueryCounts(): Promise<number> {
  const result = await prisma.agency.updateMany({
    data: {
      queriesThisMonth: 0,
      lastQueryReset: new Date(),
      billingPeriodStart: new Date(),
    },
  });

  return result.count;
}
