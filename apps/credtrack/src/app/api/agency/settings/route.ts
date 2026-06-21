import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';

export async function GET() {
  try {
    const { orgId } = await requireOrgAdmin();

    const agency = await prisma.agency.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        agencyName: true,
        primaryContactName: true,
        primaryContactEmail: true,
        primaryContactPhone: true,
        primaryContactRole: true,
        licenseNumber: true,
        credentialWarningDays: true,
        autoReminderEnabled: true,
        reminderFrequency: true,
      },
    });

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found.' }, { status: 404 });
    }

    return NextResponse.json({ agency });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Agency settings GET error:', err);
    return NextResponse.json({ error: 'Failed to load agency settings.' }, { status: 500 });
  }
}

const SettingsSchema = z.object({
  agencyName: z.string().min(1).max(200).optional(),
  primaryContactName: z.string().min(1).max(200).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(50).optional().nullable(),
  primaryContactRole: z.string().max(100).optional(),
  credentialWarningDays: z.number().int().min(1).max(365).optional(),
  autoReminderEnabled: z.boolean().optional(),
  reminderFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();

    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid settings data.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.agency.update({
      where: { id: orgId },
      data: parsed.data,
      select: {
        id: true,
        agencyName: true,
        primaryContactName: true,
        primaryContactEmail: true,
        primaryContactPhone: true,
        primaryContactRole: true,
        licenseNumber: true,
        credentialWarningDays: true,
        autoReminderEnabled: true,
        reminderFrequency: true,
      },
    });

    return NextResponse.json({ agency: updated });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('Agency settings PUT error:', err);
    return NextResponse.json({ error: 'Failed to update agency settings.' }, { status: 500 });
  }
}
