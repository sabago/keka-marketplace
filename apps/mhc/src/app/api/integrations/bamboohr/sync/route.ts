/**
 * POST /api/integrations/bamboohr/sync
 *
 * Inbound employee sync from BambooHR.
 * Auth: API key (Authorization: Bearer <key>)
 *
 * Expected body:
 * {
 *   employees: [{
 *     id?: string,
 *     firstName: string,
 *     lastName: string,
 *     workEmail?: string,
 *     department?: string,
 *     jobTitle?: string,
 *     hireDate?: string (ISO),
 *     employmentStatus?: string  // "Terminated" → inactive
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateApiKey,
  upsertEmployeeFromExternalSource,
  ExternalEmployee,
} from '@/lib/integrations/employeeSync';

interface BambooHREmployee {
  id?: string;
  firstName: string;
  lastName: string;
  workEmail?: string;
  department?: string;
  jobTitle?: string;
  hireDate?: string;
  employmentStatus?: string;
}

export async function POST(request: NextRequest) {
  const agencyId = await authenticateApiKey(request.headers.get('authorization'));
  if (!agencyId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  let body: { employees?: BambooHREmployee[] };
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
    const employeeRef = emp.workEmail ?? emp.id ?? `${emp.firstName} ${emp.lastName}`;

    if (!emp.firstName || !emp.lastName) {
      errors.push({ employeeRef, reason: 'firstName and lastName are required' });
      continue;
    }

    const external: ExternalEmployee = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.workEmail,
      employeeNumber: emp.id,
      department: emp.department,
      position: emp.jobTitle,
      hireDate: emp.hireDate,
      terminated: emp.employmentStatus?.toLowerCase() === 'terminated',
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
