/**
 * Directory Chatbot API
 * POST /api/chatbot/directory
 *
 * Requires login + agency membership. Uses Claude 3.5 Sonnet + Pinecone RAG.
 * Query limit enforced at the agency level (shared across all agency members).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAgency, HttpError , requireActiveAgency} from '@/lib/authHelpers';
import { checkQueryLimit, incrementQueryCount, logChatbotQuery } from '@/lib/chatbotAuth';
import { ragRetrieve, DIRECTORY_SYSTEM_PROMPT } from '@/lib/rag';
import { logAuditEvent, getRequestMetadata } from '@/lib/auditLog';
import { chatbotRateLimit, checkRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 0. IP-level rate limit — blocks DDoS before any auth or DB work
    const rl = await checkRateLimit(chatbotRateLimit, getIP(request));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    // 1. Require authenticated user (agency member OR platform admin)
    let user: any;
    let agency: any = null;
    try {
      const session = await (await import('next-auth')).getServerSession(
        (await import('@/lib/auth')).authOptions
      );
      if (!session?.user) throw new Error('Not authenticated');
      user = session.user;

      // Always try to resolve agency — platform/super admins may also have one
      try {
        const agencyContext = await requireActiveAgency();
        user = agencyContext.user;
        agency = agencyContext.agency;
      } catch (agencyErr) {
        // Suspension/rejection blocks everyone, including platform/super admins
        if (agencyErr instanceof HttpError) throw agencyErr;
        // Platform/super admins without an agency can still use the chatbot, uncounted
        if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'SUPERADMIN') {
          throw new Error('Agency association required');
        }
      }
    } catch (authErr) {
      if (authErr instanceof HttpError) {
        return NextResponse.json({ error: authErr.message }, { status: authErr.statusCode });
      }
      return NextResponse.json(
        {
          error: 'LOGIN_REQUIRED',
          message: 'Sign in to use the AI assistant. Browse and read all guides for free.',
        },
        { status: 401 }
      );
    }

    // 2. Parse body
    let body: { message?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
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

    if (INJECTION_PATTERNS.some((p) => p.test(message))) {
      void logAuditEvent(
        'security_alert',
        { userId: user.id, agencyId: agency?.id, action: 'prompt_injection_attempt', metadata: { queryLength: message.length } },
        getRequestMetadata(request)
      ).catch(() => {});
      return NextResponse.json(
        { error: 'Message contains content that cannot be processed.' },
        { status: 400 }
      );
    }

    // 3. Check agency query limit (skip for platform admins)
    let limitCheck: any = { allowed: true, remaining: null, limit: null, plan: 'UNLIMITED' };
    if (agency) {
      limitCheck = await checkQueryLimit(agency.id, user.role);

      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: 'QUERY_LIMIT_REACHED',
            message: limitCheck.message,
            plan: limitCheck.plan,
            remaining: 0,
            limit: limitCheck.limit,
            isLifetime: limitCheck.isLifetime,
            upgradeRequired: limitCheck.upgradeRequired,
          },
          { status: 429 }
        );
      }
    }

    // 4. Retrieve relevant chunks from Pinecone
    // For short messages that don't yield meaningful embeddings, retrieval returns empty chunks
    // and Claude responds with a prompt to ask a real question — query still counts.
    let retrieval: Awaited<ReturnType<typeof ragRetrieve>>;
    try {
      retrieval = await ragRetrieve(message.trim(), 5);
    } catch (error) {
      console.error('RAG retrieval error:', error);
      return NextResponse.json(
        { error: 'Failed to search the knowledge base. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Generate answer with Claude 3.5 Sonnet
    let answer: string;
    let tokensUsed = 0;

    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });

      const userPrompt =
        retrieval.chunks.length > 0
          ? `Context from knowledge base:\n\n${retrieval.context}\n\n---\n\nQuestion: ${message.trim()}\n\nProvide a helpful, actionable answer based on the context above. Cite the sources by name.`
          : `Question: ${message.trim()}\n\nI don't have specific guides in the knowledge base that match this question. Please let the user know and suggest they browse the Referral Directory or rephrase their question.`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: DIRECTORY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      answer =
        response.content[0].type === 'text'
          ? response.content[0].text
          : "I wasn't able to generate an answer. Please try again.";
      tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    } catch (error) {
      console.error('Claude API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate an answer. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Increment query count
    if (agency) {
      await incrementQueryCount(agency.id);
    }

    // 7. Log to database (skip for platform admins who have no agency)
    try {
      if (agency) await logChatbotQuery({
        agencyId: agency.id,
        query: message.substring(0, 500),
        response: answer.substring(0, 2000),
        tokensUsed,
        modelUsed: 'claude-sonnet-4-6',
        responseTime: Date.now() - startTime,
        sourcesReturned: {
          sources: retrieval.sources,
          sourceTitles: retrieval.sourceTitles,
        },
      });
    } catch (err) {
      console.error('Error logging directory chatbot query:', err);
    }

    // 8. Return response
    return NextResponse.json({
      answer,
      sources: retrieval.sources.map((slug, i) => ({
        slug,
        title: retrieval.sourceTitles[i] || slug,
      })),
      queriesRemaining: limitCheck.remaining !== null ? limitCheck.remaining - 1 : null,
      limit: limitCheck.limit,
      plan: agency?.subscriptionPlan ?? 'UNLIMITED',
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Directory chatbot error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
