/**
 * POST /api/integrations/gusto/sync
 *
 * Inbound employee sync from Gusto.
 * Auth: API key (Authorization: Bearer <key>)
 *
 * Expected body:
 * {
 *   employees: [{
 *     uuid?: string,
 *     first_name: string,
 *     last_name: string,
 *     email?: string,
 *     department?: string,
 *     title?: string,
 *     start_date?: string (ISO),
 *     terminated?: boolean
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateApiKey,
  upsertEmployeeFromExternalSource,
  ExternalEmployee,
} from '@/lib/integrations/employeeSync';

interface GustoEmployee {
  uuid?: string;
  first_name: string;
  last_name: string;
  email?: string;
  department?: string;
  title?: string;
  start_date?: string;
  terminated?: boolean;
}

export async function POST(request: NextRequest) {
  const agencyId = await authenticateApiKey(request.headers.get('authorization'));
  if (!agencyId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  let body: { employees?: GustoEmployee[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.employees) || body.employees.length === 0) {
    return NextResponse.json({ error: '"employees" array is required' }, { status: 400 });
  }

  if (body.employees.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 employees per request' }, { status: 400 });
  }

  let synced = 0;
  let created = 0;
  let updated = 0;
  const errors: { employeeRef: string; reason: string }[] = [];

  for (const emp of body.employees) {
    const employeeRef = emp.email ?? emp.uuid ?? `${emp.first_name} ${emp.last_name}`;

    if (!emp.first_name || !emp.last_name) {
      errors.push({ employeeRef, reason: 'first_name and last_name are required' });
      continue;
    }

    const external: ExternalEmployee = {
      firstName: emp.first_name,
      lastName: emp.last_name,
      email: emp.email,
      employeeNumber: emp.uuid,
      department: emp.department,
      position: emp.title,
      hireDate: emp.start_date,
      terminated: emp.terminated,
    };

    try {
      const result = await upsertEmployeeFromExternalSource(external, agencyId);
      synced++;
      result.created ? created++ : updated++;
    } catch (err: any) {
      errors.push({ employeeRef, reason: err.message ?? 'Database error' });
    }
  }

  return NextResponse.json({ synced, created, updated, errors });
}
