/**
 * Credentials Chatbot API
 * POST /api/chatbot/credentials
 *
 * GPT-4 tool-calling loop for credential/compliance queries.
 * Requires authenticated agency user. Uses the same tool handlers
 * as /api/agent/credentials but wrapped in a conversational loop
 * that returns a natural-language answer.
 *
 * agencyId always comes from the session — never from the request body.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAgency } from '@/lib/authHelpers';
import { checkQueryLimit, incrementQueryCount, logChatbotQuery } from '@/lib/chatbotAuth';
import { logAuditEvent, getRequestMetadata } from '@/lib/auditLog';
import { CREDENTIAL_TOOLS } from '@/lib/agentTools/credentialTools';
import {
  handleSearchCredentials,
  handleGetEmployeeCredentials,
  handleGetComplianceSummary,
  handleSendCredentialReminders,
} from '@/lib/agentTools/credentialToolHandlers';
import { chatbotRateLimit, checkRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SYSTEM_PROMPT = `You are a compliance assistant for a Massachusetts home-care agency. \
You have tools to look up staff credentials, compliance status, and send reminders. \
Always use the tools to get real data before answering — never guess or fabricate numbers. \
Be concise, factual, and actionable. If the user asks to send reminders, confirm what you \
sent. Format lists clearly. Today's date is ${new Date().toISOString().slice(0, 10)}.`;

const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|above|all)\s+instructions?/i,
  /disregard\s+(previous|prior|above|all)\s+instructions?/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now\s+(a\s+)?(?!an?\s+assistant)/i,
  /system\s*prompt/i,
  /jailbreak/i,
  /\bdan\b.*mode/i,
];

type ToolName =
  | 'search_credentials'
  | 'get_employee_credentials'
  | 'get_compliance_summary'
  | 'send_credential_reminders';

async function executeTool(name: ToolName, args: Record<string, unknown>, agencyId: string) {
  switch (name) {
    case 'search_credentials':
      return handleSearchCredentials(args as Parameters<typeof handleSearchCredentials>[0], agencyId);
    case 'get_employee_credentials':
      return handleGetEmployeeCredentials(args as Parameters<typeof handleGetEmployeeCredentials>[0], agencyId);
    case 'get_compliance_summary':
      return handleGetComplianceSummary(args as Parameters<typeof handleGetComplianceSummary>[0], agencyId);
    case 'send_credential_reminders':
      return handleSendCredentialReminders(args as Parameters<typeof handleSendCredentialReminders>[0], agencyId);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 0. IP-level rate limit — blocks DDoS before any auth or DB work
    const rl = await checkRateLimit(chatbotRateLimit, getIP(request));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    // 1. Require authenticated agency user
    let user: any;
    let agency: any;
    try {
      const ctx = await requireAgency();
      user = ctx.user;
      agency = ctx.agency;
    } catch {
      return NextResponse.json(
        { error: 'LOGIN_REQUIRED', message: 'Sign in to use the credentials assistant.' },
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
    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return NextResponse.json({ error: 'Message too short' }, { status: 400 });
    }

    // 3. Prompt injection guard
    if (INJECTION_PATTERNS.some((p) => p.test(message))) {
      void logAuditEvent(
        'security_alert',
        { userId: user.id, agencyId: agency.id, action: 'prompt_injection_attempt', metadata: { queryLength: message.length } },
        getRequestMetadata(request)
      ).catch(() => {});
      return NextResponse.json(
        { error: 'Message contains content that cannot be processed.' },
        { status: 400 }
      );
    }

    // 4. Check query limit
    const limitCheck = await checkQueryLimit(agency.id, user.role);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'QUERY_LIMIT_REACHED',
          message: limitCheck.message,
          plan: limitCheck.plan,
          remaining: 0,
          limit: limitCheck.limit,
          upgradeRequired: limitCheck.upgradeRequired,
        },
        { status: 429 }
      );
    }

    // 5. Tool-calling loop (max 3 rounds to prevent runaway spend)
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message.trim() },
    ];

    let answer = '';
    let tokensUsed = 0;

    for (let round = 0; round < 3; round++) {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4-turbo',
        max_tokens: 800,
        messages,
        tools: CREDENTIAL_TOOLS,
        tool_choice: 'auto',
      });

      const choice = completion.choices[0];
      tokensUsed += (completion.usage?.total_tokens ?? 0);

      if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
        answer = choice.message.content ?? "I couldn't generate a response. Please try again.";
        break;
      }

      // Execute all tool calls in parallel
      const assistantMsg: OpenAI.Chat.ChatCompletionMessageParam = {
        role: 'assistant',
        content: choice.message.content ?? null,
        tool_calls: choice.message.tool_calls,
      };
      messages.push(assistantMsg);

      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (tc) => {
          const toolCall = tc as { id: string; function: { name: string; arguments: string } };
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(toolCall.function.arguments); } catch {}
          const result = await executeTool(toolCall.function.name as ToolName, args, agency.id);
          return { id: toolCall.id, result };
        })
      );

      for (const { id, result } of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!answer) {
      answer = "I wasn't able to complete that request. Please try rephrasing.";
    }

    // 6. Increment query count + log
    await incrementQueryCount(agency.id);

    try {
      await logChatbotQuery({
        agencyId: agency.id,
        query: message.substring(0, 500),
        response: answer.substring(0, 2000),
        tokensUsed,
        modelUsed: 'gpt-4-turbo',
        responseTime: Date.now() - startTime,
        sourcesReturned: {},
      });
    } catch (err) {
      console.error('Error logging credentials chatbot query:', err);
    }

    // 7. Return response (no sources for credentials mode)
    return NextResponse.json({
      answer,
      sources: [],
      queriesRemaining: limitCheck.remaining !== null ? limitCheck.remaining - 1 : null,
      limit: limitCheck.limit,
      plan: agency.subscriptionPlan ?? 'FREE',
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Credentials chatbot error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
