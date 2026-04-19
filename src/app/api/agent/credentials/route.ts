/**
 * POST /api/agent/credentials
 *
 * Execute a single credential agent tool call.
 * Used by the chatbot's credential-domain branch.
 *
 * Auth: Same as chatbot endpoint (agency users + admins).
 * agencyId always comes from the session — never from the request body
 * (except PLATFORM_ADMIN/SUPERADMIN who may pass an explicit agencyId).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireChatbotAuth } from '@/lib/chatbotAuth';
import { checkRateLimit, agencyRateLimit, getIP, createRateLimitResponse } from '@/lib/rateLimit';
import {
  handleSearchCredentials,
  handleGetEmployeeCredentials,
  handleGetComplianceSummary,
  handleSendCredentialReminders,
} from '@/lib/agentTools/credentialToolHandlers';

const bodySchema = z.object({
  toolName: z.enum([
    'search_credentials',
    'get_employee_credentials',
    'get_compliance_summary',
    'send_credential_reminders',
  ]),
  params: z.record(z.string(), z.unknown()).default({}),
  // Only honored for PLATFORM_ADMIN / SUPERADMIN
  agencyId: z.string().optional(),
});

const ADMIN_ROLES = ['PLATFORM_ADMIN', 'SUPERADMIN'];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    let user: Awaited<ReturnType<typeof requireChatbotAuth>>;
    try {
      user = await requireChatbotAuth(request);
    } catch {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rl = await checkRateLimit(agencyRateLimit, getIP(request));
    if (!rl.success) return createRateLimitResponse(rl.reset, rl.limit, rl.remaining);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { toolName, params } = parsed.data;

    // Determine effective agencyId
    let agencyId = user.agencyId;
    if (ADMIN_ROLES.includes(user.role ?? '') && parsed.data.agencyId) {
      agencyId = parsed.data.agencyId;
    }

    if (!agencyId) {
      return NextResponse.json({ error: 'Agency context required' }, { status: 400 });
    }

    let result: { success: boolean; data: unknown; error?: string };

    switch (toolName) {
      case 'search_credentials':
        result = await handleSearchCredentials(params as any, agencyId);
        break;
      case 'get_employee_credentials':
        result = await handleGetEmployeeCredentials(params as any, agencyId);
        break;
      case 'get_compliance_summary':
        result = await handleGetComplianceSummary(params as any, agencyId);
        break;
      case 'send_credential_reminders':
        result = await handleSendCredentialReminders(params as any, agencyId);
        break;
    }

    return NextResponse.json({
      success: result.success,
      result: result.data,
      error: result.error,
      toolName,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Credential agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
