import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApprovalStatus, UserRole, AgencySize } from '@prisma/client';
import { z } from 'zod';
import { sendAdminNewAgencyNotification } from '@/lib/email';

/**
 * Validation schema for agency signup
 */
const agencySignupSchema = z.object({
  // Agency Information
  agencyName: z.string().min(2, 'Agency name must be at least 2 characters'),
  licenseNumber: z.string().min(1, 'License number is required'),
  taxId: z.string().regex(/^\d{2}-\d{7}$/, 'Tax ID must be in format XX-XXXXXXX'),

  // Address
  streetAddress: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789'),

  // Contact Information
  phoneNumber: z.string().min(10, 'Phone number is required'),
  websiteUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),

  // Primary Contact
  contactName: z.string().min(2, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactRole: z.enum(['AGENCY_ADMIN', 'AGENCY_USER'], {
    error: () => ({ message: 'Role must be either AGENCY_ADMIN or AGENCY_USER' }),
  }),

  // Optional
  agencySize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),

  // Intake Analytics
  intakeMethods: z.array(z.string()).min(1, 'At least one intake method is required'),
  intakeTrackingDescription: z.string().optional().or(z.literal('')),
  followUpFrequency: z.string().optional().or(z.literal('')),
  followUpMethods: z.array(z.string()).min(1, 'At least one follow-up method is required'),
});

/**
 * POST /api/auth/agency-signup
 *
 * Handles passwordless agency self-registration.
 * Creates agency with PENDING approval status and user without password.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = agencySignupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.contactEmail.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate license number
    const existingAgency = await prisma.agency.findFirst({
      where: { licenseNumber: data.licenseNumber },
    });

    if (existingAgency) {
      return NextResponse.json(
        { error: 'An agency with this license number is already registered' },
        { status: 409 }
      );
    }

    // Create agency and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the agency with PENDING approval status
      const agency = await tx.agency.create({
        data: {
          agencyName: data.agencyName,
          licenseNumber: data.licenseNumber,
          taxId: data.taxId,

          // Required subscription fields
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now

          // Profile data (using defaults for now, can be updated later)
          servicesOffered: [], // Can be filled in onboarding or profile update
          serviceArea: [data.state], // Use the state from address
          agencySize: data.agencySize
            ? (data.agencySize as AgencySize)
            : AgencySize.SMALL,

          // Primary contact info
          primaryContactName: data.contactName,
          primaryContactRole: data.contactRole,
          primaryContactEmail: data.contactEmail,
          primaryContactPhone: data.phoneNumber,

          // Intake analytics
          intakeMethods: data.intakeMethods,
          intakeTrackingDescription: data.intakeTrackingDescription || null,
          followUpFrequency: data.followUpFrequency || null,
          followUpMethods: data.followUpMethods,

          // Approval/Moderation fields
          approvalStatus: ApprovalStatus.PENDING,
          approvalEmailSent: false,
        },
      });

      // Create the primary contact user (no password yet!)
      const user = await tx.user.create({
        data: {
          email: data.contactEmail.toLowerCase(),
          name: data.contactName,
          password: null, // No password until agency is approved
          role: data.contactRole as UserRole,
          agencyId: agency.id,
          isPrimaryContact: true,
          emailVerified: null, // Not verified yet
        },
      });

      return { agency, user };
    });

    // Send notification email to platform admins about new agency signup
    await sendAdminNewAgencyNotification(
      {
        id: result.agency.id,
        name: result.agency.agencyName,
        licenseNumber: result.agency.licenseNumber,
        city: data.city, // From form data
        state: data.state, // From form data
      },
      {
        name: result.user.name,
        email: result.user.email,
      }
    ).catch(err => {
      // Log error but don't fail the registration
      console.error('Failed to send admin notification email:', err);
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Agency application submitted successfully',
        email: result.user.email,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Agency signup error:', error);

    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'An account with this information already exists' },
          { status: 409 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: 'Failed to submit agency application. Please try again later.' },
      { status: 500 }
    );
  }
}
