/**
 * POST /api/integrations/zapier/webhook
 *
 * Generic inbound Zapier webhook for employee events.
 * Works with "Webhooks by Zapier" — no Zapier developer account needed.
 * Auth: API key (Authorization: Bearer <key>)
 *
 * Expected body:
 * {
 *   event: 'employee.created' | 'employee.updated' | 'employee.terminated',
 *   employee: {
 *     firstName: string,
 *     lastName: string,
 *     email?: string,
 *     employeeNumber?: string,
 *     department?: string,
 *     position?: string,
 *     hireDate?: string,
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateApiKey,
  upsertEmployeeFromExternalSource,
  ExternalEmployee,
} from '@/lib/integrations/employeeSync';

const VALID_EVENTS = ['employee.created', 'employee.updated', 'employee.terminated'] as const;
type ZapierEvent = (typeof VALID_EVENTS)[number];

export async function POST(request: NextRequest) {
  const agencyId = await authenticateApiKey(request.headers.get('authorization'));
  if (!agencyId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  let body: { event?: string; employee?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.event || !VALID_EVENTS.includes(body.event as ZapierEvent)) {
    return NextResponse.json(
      { error: `"event" must be one of: ${VALID_EVENTS.join(', ')}` },
      { status: 400 }
    );
  }

  const emp = body.employee;
  if (!emp || typeof emp !== 'object') {
    return NextResponse.json({ error: '"employee" object is required' }, { status: 400 });
  }

  if (!emp.firstName || !emp.lastName) {
    return NextResponse.json({ error: '"employee.firstName" and "employee.lastName" are required' }, { status: 400 });
  }

  const external: ExternalEmployee = {
    firstName: String(emp.firstName),
    lastName: String(emp.lastName),
    email: emp.email ? String(emp.email) : undefined,
    employeeNumber: emp.employeeNumber ? String(emp.employeeNumber) : undefined,
    department: emp.department ? String(emp.department) : undefined,
    position: emp.position ? String(emp.position) : undefined,
    hireDate: emp.hireDate ? String(emp.hireDate) : undefined,
    terminated: body.event === 'employee.terminated',
  };

  try {
    const result = await upsertEmployeeFromExternalSource(external, agencyId);
    return NextResponse.json({
      success: true,
      event: body.event,
      employeeId: result.employee.id,
      created: result.created,
    });
  } catch (err: any) {
    console.error('[zapier/webhook] Error:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to sync employee' }, { status: 500 });
  }
}
