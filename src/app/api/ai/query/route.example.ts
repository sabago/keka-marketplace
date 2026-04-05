/**
 * AI Query Handler - Example Integration with Subscription System
 *
 * This example shows how to integrate query limit enforcement
 * into your AI query endpoints.
 *
 * POST /api/ai/query
 */

import { NextResponse } from 'next/server';
import {
  enforceQueryLimit,
  incrementQueryCount,
  SubscriptionError,
} from '@/lib/subscriptionHelpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agencyId, query } = body;

    // Validate input
    if (!agencyId || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: agencyId, query' },
        { status: 400 }
      );
    }

    // ============================================================
    // STEP 1: Enforce query limit BEFORE processing
    // ============================================================
    try {
      await enforceQueryLimit(agencyId);
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Return appropriate error response based on error code
        switch (error.code) {
          case 'QUERY_LIMIT_REACHED':
            return NextResponse.json(
              {
                error: error.message,
                code: 'QUERY_LIMIT_REACHED',
                action: 'upgrade',
                upgradeUrl: '/pricing',
              },
              { status: 429 } // Too Many Requests
            );

          case 'SUBSCRIPTION_INACTIVE':
            return NextResponse.json(
              {
                error: error.message,
                code: 'SUBSCRIPTION_INACTIVE',
                action: 'update_payment',
                billingUrl: '/dashboard/subscription',
              },
              { status: 402 } // Payment Required
            );

          default:
            return NextResponse.json(
              {
                error: error.message,
                code: error.code,
              },
              { status: 400 }
            );
        }
      }

      // Re-throw non-subscription errors
      throw error;
    }

    // ============================================================
    // STEP 2: Process the AI query
    // ============================================================

    // Example: Call your AI service (OpenAI, Claude, etc.)
    const aiResponse = await processAIQuery(query);

    // ============================================================
    // STEP 3: Increment query count AFTER successful processing
    // ============================================================
    await incrementQueryCount(agencyId);

    // Return successful response
    return NextResponse.json({
      success: true,
      response: aiResponse,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error) {
    console.error('Error processing AI query:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process query',
      },
      { status: 500 }
    );
  }
}

// Example AI processing function
async function processAIQuery(query: string) {
  // Your AI processing logic here
  // This could be OpenAI API, Claude API, etc.

  // Simulated response
  return {
    answer: 'AI generated response...',
    tokensUsed: 150,
    sources: [],
  };
}
