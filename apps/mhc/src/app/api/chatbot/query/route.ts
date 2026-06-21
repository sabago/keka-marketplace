/**
 * Chatbot Query API Endpoint
 * POST /api/chatbot/query
 *
 * Handles RAG queries with authentication, rate limiting, and caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireChatbotAuth, checkQueryLimit, incrementQueryCount, logChatbotQuery } from '@/lib/chatbotAuth';
import { ragQuery } from '@/lib/rag';
import { getCachedQuery, setCachedQuery } from '@/lib/queryCache';
import { logAuditEvent, getRequestMetadata } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user and get agency
    let user;
    try {
      user = await requireChatbotAuth(request);
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to use the AI chatbot.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { query } = body;

    // 3. Validate query
    if (!query || typeof query !== 'string' || query.trim().length < 10) {
      return NextResponse.json(
        { error: 'Query must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Prompt injection guard
    const INJECTION_PATTERNS = [
      /ignore\s+(previous|prior|above|all)\s+instructions?/i,
      /disregard\s+(previous|prior|above|all)\s+instructions?/i,
      /forget\s+(everything|all|previous)/i,
      /you\s+are\s+now\s+(a\s+)?(?!an?\s+assistant)/i,
      /system\s*prompt/i,
      /jailbreak/i,
      /\bdan\b.*mode/i,
    ];

    if (INJECTION_PATTERNS.some((p) => p.test(query))) {
      void logAuditEvent(
        'security_alert',
        { userId: user.userId, agencyId: user.agencyId, action: 'prompt_injection_attempt', metadata: { queryLength: query.length } },
        getRequestMetadata(request)
      ).catch(() => {});
      return NextResponse.json(
        { error: 'Query contains content that cannot be processed.' },
        { status: 400 }
      );
    }

    // 4. Check query limit
    const limitCheck = await checkQueryLimit(user.agencyId, user.role);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Query limit exceeded',
          message: limitCheck.message,
          remaining: 0,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
          isLifetime: limitCheck.isLifetime,
          upgradeRequired: limitCheck.upgradeRequired,
        },
        { status: 429 }
      );
    }

    // 5. Check cache first
    const cachedResult = await getCachedQuery(query, 'gpt-4-turbo');

    if (cachedResult) {
      // Return cached result without incrementing counter
      return NextResponse.json({
        answer: cachedResult.answer,
        sources: cachedResult.sources,
        sourceTitles: cachedResult.sourceTitles,
        tokensUsed: 0, // No tokens used for cached response
        cached: true,
        remaining: limitCheck.remaining,
        limit: limitCheck.limit,
        plan: limitCheck.plan,
      });
    }

    // 6. Execute RAG query
    let ragResult;
    try {
      ragResult = await ragQuery(query, 5);
    } catch (error) {
      console.error('RAG query error:', error);
      return NextResponse.json(
        { error: 'Failed to process query. Please try again later.' },
        { status: 500 }
      );
    }

    // 7. Increment query count
    await incrementQueryCount(user.agencyId);

    // 8. Log query to database
    try {
      await logChatbotQuery({
        agencyId: user.agencyId,
        query: query.substring(0, 500), // Limit stored query length
        response: ragResult.answer.substring(0, 2000), // Limit stored response length
        tokensUsed: ragResult.tokensUsed,
        modelUsed: 'gpt-4-turbo',
        responseTime: Date.now() - startTime,
        sourcesReturned: {
          sources: ragResult.sources,
          sourceTitles: ragResult.sourceTitles,
          retrievedChunks: ragResult.retrievedChunks,
        },
      });
    } catch (error) {
      console.error('Error logging chatbot query:', error);
      // Don't fail the request if logging fails
    }

    // 9. Cache the result
    await setCachedQuery(query, 'gpt-4-turbo', {
      answer: ragResult.answer,
      sources: ragResult.sources,
      sourceTitles: ragResult.sourceTitles,
    });

    // 10. Return response
    return NextResponse.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      sourceTitles: ragResult.sourceTitles,
      tokensUsed: ragResult.tokensUsed,
      cached: false,
      remaining: limitCheck.remaining - 1, // Account for this query
      limit: limitCheck.limit,
      plan: limitCheck.plan,
      responseTime: ragResult.responseTime,
    });
  } catch (error) {
    console.error('Chatbot API error:', error);

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
