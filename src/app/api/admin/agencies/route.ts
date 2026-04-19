import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { ApprovalStatus, UserRole, AgencySize } from '@prisma/client';
import { z } from 'zod';
import { generatePasswordSetupToken, sendAgencyApprovalEmail } from '@/lib/email';

/**
 * GET /api/admin/agencies
 *
 * List all agencies with optional filtering
 * Query params:
 * - status: PENDING | APPROVED | REJECTED | SUSPENDED
 * - search: Search by name, license, or email
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    // Require superadmin or platform admin authentication
    await requireSuperadmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by approval status
    if (status && Object.values(ApprovalStatus).includes(status as ApprovalStatus)) {
      where.approvalStatus = status as ApprovalStatus;
    }

    // Search filter
    if (search) {
      where.OR = [
        { agencyName: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { primaryContactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get agencies with pagination
    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { isPrimaryContact: true },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      prisma.agency.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      agencies,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });

  } catch (error) {
    console.error('Error fetching agencies:', error);

    if (error instanceof Error && (error.message.includes('Platform admin') || error.message.includes('Superadmin'))) {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch agencies' },
      { status: 500 }
    );
  }
}

/**
 * Validation schema for admin agency creation
 */
const adminAgencyCreationSchema = z.object({
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
 * POST /api/admin/agencies
 *
 * Platform admin creates a new agency
 * Unlike public signup, this can auto-approve the agency
 */
export async function POST(request: NextRequest) {
  try {
    // Require superadmin or platform admin authentication
    const adminUser = await requireSuperadmin();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = adminAgencyCreationSchema.safeParse(body);

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

    // Allow platform admin to assign themselves as agency admin
    const isSelfAssignment =
      existingUser &&
      adminUser.email.toLowerCase() === data.contactEmail.toLowerCase();

    if (existingUser && !isSelfAssignment) {
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
      // Create the agency
      const agency = await tx.agency.create({
        data: {
          agencyName: data.agencyName,
          licenseNumber: data.licenseNumber,
          taxId: data.taxId,

          // Required subscription fields
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now

          // Profile data
          servicesOffered: [],
          serviceArea: [data.state],
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

          // Admin-created agencies are auto-approved; self-assignments link immediately
          approvalStatus: ApprovalStatus.APPROVED,
          approvalEmailSent: false,
          approvedAt: new Date(),
          approvedBy: adminUser.id,
        },
      });

      let user;
      if (isSelfAssignment && existingUser) {
        // Link the existing platform/super admin to the new agency — preserve their original role
        const preserveRole = existingUser.role === UserRole.PLATFORM_ADMIN || existingUser.role === UserRole.SUPERADMIN;
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            agencyId: agency.id,
            isPrimaryContact: true,
            role: preserveRole ? existingUser.role : data.contactRole as UserRole,
          },
        });
      } else {
        // Create the primary contact user (no password yet, will be set via password setup flow)
        user = await tx.user.create({
          data: {
            email: data.contactEmail.toLowerCase(),
            name: data.contactName,
            password: null, // No password until user sets it
            role: data.contactRole as UserRole,
            agencyId: agency.id,
            isPrimaryContact: true,
            emailVerified: null, // Not verified until agency is approved
          },
        });
      }

      return { agency, user };
    });

    // For invite mode (non-self-assignment), send invitation email immediately
    let emailSent = false;
    if (!isSelfAssignment) {
      const token = await generatePasswordSetupToken(result.user.id);
      if (token) {
        emailSent = await sendAgencyApprovalEmail(
          { email: result.user.email, name: result.user.name || 'User' },
          token,
          result.agency.agencyName
        );
        if (emailSent) {
          await prisma.agency.update({
            where: { id: result.agency.id },
            data: { approvalEmailSent: true },
          });
        }
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Agency created successfully',
        agency: result.agency,
        user: result.user,
        emailSent,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Admin agency creation error:', error);

    if (error instanceof Error && (error.message.includes('Platform admin') || error.message.includes('Superadmin'))) {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }

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
      { error: 'Failed to create agency. Please try again later.' },
      { status: 500 }
    );
  }
}
