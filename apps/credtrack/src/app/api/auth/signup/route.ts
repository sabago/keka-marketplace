import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mhc/db';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const SignupSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { orgName, email, password, name } = parsed.data;

    // Check if email already in use
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    // Create Agency + User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const billingPeriodEnd = new Date();
      billingPeriodEnd.setDate(billingPeriodEnd.getDate() + 30);

      const agency = await tx.agency.create({
        data: {
          agencyName: orgName,
          // Unique synthetic license number — never collides with real MA license numbers
          licenseNumber: `credtrack-${randomUUID()}`,
          sourceApp: 'CREDTRACK',
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'ACTIVE',
          approvalStatus: 'PENDING', // Blocks MHC features; irrelevant for CredTrack
          agencySize: 'SMALL',
          billingPeriodEnd,
          // Required non-null fields — placeholder values for CredTrack orgs
          servicesOffered: [],
          serviceArea: [],
          primaryContactName: name,
          primaryContactRole: 'Admin',
          primaryContactEmail: email,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'AGENCY_ADMIN',
          agencyId: agency.id,
          isActive: true,
        },
      });

      // Create a STARTER CredTrackSubscription row
      await tx.credTrackSubscription.create({
        data: {
          agencyId: agency.id,
          plan: 'STARTER',
          status: 'ACTIVE',
          billingPeriodEnd,
        },
      });

      return { user, agency };
    });

    return NextResponse.json(
      { message: 'Account created successfully', userId: result.user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
