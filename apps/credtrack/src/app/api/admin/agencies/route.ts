import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin, HttpError } from '@/lib/authHelpers';
import { prisma } from '@mhc/db';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const CreateAgencySchema = z.object({
  agencyName: z.string().min(1),
  licenseNumber: z.string().min(1),
  primaryContactName: z.string().min(1),
  primaryContactEmail: z.string().email(),
});

/**
 * GET /api/admin/agencies
 * List agencies with pagination and filters.
 */
export async function GET(req: NextRequest) {
  try {
    await requireSuperadmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.approvalStatus = status;
    }
    if (search) {
      where.OR = [
        { agencyName: { contains: search, mode: 'insensitive' } },
        { primaryContactEmail: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: { id: true, name: true, email: true, role: true, isPrimaryContact: true },
          },
          _count: { select: { staffMembers: true } },
        },
      }),
      prisma.agency.count({ where }),
    ]);

    return NextResponse.json({ agencies, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('GET /api/admin/agencies error:', err);
    return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 });
  }
}

/**
 * POST /api/admin/agencies
 * Create agency + agency admin user. Auto-approves.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperadmin();

    const body = await req.json();
    const parsed = CreateAgencySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { agencyName, licenseNumber, primaryContactName, primaryContactEmail } = parsed.data;

    // Check for duplicate license number
    const existing = await prisma.agency.findUnique({ where: { licenseNumber } });
    if (existing) {
      return NextResponse.json({ error: 'An agency with this license number already exists' }, { status: 409 });
    }

    const now = new Date();
    const billingPeriodEnd = new Date(now);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

    const agency = await prisma.agency.create({
      data: {
        agencyName,
        licenseNumber,
        primaryContactName,
        primaryContactRole: 'Agency Admin',
        primaryContactEmail,
        approvalStatus: 'APPROVED',
        approvedAt: now,
        approvedBy: user.id,
        sourceApp: 'CREDTRACK',
        // Required fields with defaults
        agencySize: 'SMALL',
        servicesOffered: [],
        serviceArea: [],
        billingPeriodEnd,
        users: {
          create: {
            email: primaryContactEmail,
            name: primaryContactName,
            role: 'AGENCY_ADMIN',
            isPrimaryContact: true,
            isActive: true,
            // Temporary hashed password — user will set via invite token
            password: await bcrypt.hash(randomUUID(), 10),
            passwordSetupTokens: {
              create: {
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'CREATE_AGENCY',
        targetAgencyId: agency.id,
        details: { agencyName, licenseNumber },
      },
    });

    return NextResponse.json({ success: true, agency }, { status: 201 });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('POST /api/admin/agencies error:', err);
    return NextResponse.json({ error: 'Failed to create agency' }, { status: 500 });
  }
}
