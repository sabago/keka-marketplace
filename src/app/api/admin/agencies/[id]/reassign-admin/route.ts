import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperadmin } from '@/lib/authHelpers';
import { generatePasswordSetupToken, sendStaffInvitationEmail } from '@/lib/email';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const reassignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/admin/agencies/[id]/reassign-admin
 *
 * Reassign the agency admin to a new person.
 * - Demotes current AGENCY_ADMIN to AGENCY_USER
 * - Promotes or creates the new admin
 * - Sends password setup email
 *
 * Requires: SUPERADMIN or PLATFORM_ADMIN
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminUser = await requireSuperadmin();

    const body = await request.json();
    const validation = reassignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Run in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch agency
      const agency = await tx.agency.findUnique({
        where: { id },
        select: { id: true, agencyName: true },
      });

      if (!agency) {
        throw Object.assign(new Error('Agency not found'), { statusCode: 404 });
      }

      // 2. Find and demote current AGENCY_ADMIN
      const currentAdmin = await tx.user.findFirst({
        where: { agencyId: id, role: UserRole.AGENCY_ADMIN },
      });

      if (currentAdmin) {
        await tx.user.update({
          where: { id: currentAdmin.id },
          data: { role: UserRole.AGENCY_USER, isPrimaryContact: false },
        });
      }

      // 3. Check if the new email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      let newAdmin;

      if (existingUser) {
        if (existingUser.agencyId && existingUser.agencyId !== id) {
          throw Object.assign(
            new Error('Email already associated with another agency'),
            { statusCode: 409 }
          );
        }

        // Existing user in this agency (or unlinked) → promote
        newAdmin = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            role: UserRole.AGENCY_ADMIN,
            isPrimaryContact: true,
            agencyId: id,
            name: existingUser.name || name.trim(),
          },
        });
      } else {
        // Create new user
        newAdmin = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: name.trim(),
            role: UserRole.AGENCY_ADMIN,
            agencyId: id,
            isPrimaryContact: true,
            password: null,
          },
        });
      }

      // 4. Log admin action
      await tx.adminAction.create({
        data: {
          adminId: adminUser.id,
          actionType: 'AGENCY_ADMIN_REASSIGNED',
          targetAgencyId: id,
          notes: JSON.stringify({
            newAdminEmail: normalizedEmail,
            newAdminName: name,
            previousAdminId: currentAdmin?.id ?? null,
          }),
        },
      });

      return { agency, newAdmin };
    });

    // 5. Generate password setup token and send email (outside transaction)
    const needsPasswordSetup = !result.newAdmin.password;
    let emailSent = false;

    if (needsPasswordSetup) {
      const token = await generatePasswordSetupToken(result.newAdmin.id);

      if (token) {
        emailSent = await sendStaffInvitationEmail(
          { email: result.newAdmin.email, name: result.newAdmin.name },
          token,
          result.agency.agencyName,
          adminUser.name || adminUser.email
        );

        if (!emailSent) {
          console.error('[REASSIGN-ADMIN] Failed to send invitation email to:', normalizedEmail);
        }
      } else {
        console.error('[REASSIGN-ADMIN] Failed to generate password setup token');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Agency admin reassigned successfully',
      emailSent,
    });
  } catch (error) {
    console.error('[REASSIGN-ADMIN] Error:', error);

    if (error instanceof Error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode;

      if (statusCode === 404) {
        return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
      }

      if (statusCode === 409) {
        return NextResponse.json(
          { error: 'Email already associated with another agency' },
          { status: 409 }
        );
      }

      if (
        error.message.includes('Platform admin') ||
        error.message.includes('Superadmin')
      ) {
        return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to reassign agency admin. Please try again.' },
      { status: 500 }
    );
  }
}
