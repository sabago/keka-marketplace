/**
 * GET /api/employee/notification-preferences
 * PUT /api/employee/notification-preferences
 *
 * Get and update notification preferences for authenticated employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const preferencesSchema = z.object({
  emailEnabled: z.boolean(),
  emailExpiringReminders: z.boolean(),
  emailExpiredReminders: z.boolean(),
  emailApprovalNotifications: z.boolean(),
  emailRejectionNotifications: z.boolean(),
  reminderFrequency: z.enum(['MINIMAL', 'STANDARD', 'FREQUENT']),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.number().min(0).max(23).nullable(),
  quietHoursEnd: z.number().min(0).max(23).nullable(),
  weeklyDigestEnabled: z.boolean(),
  weeklyDigestDay: z.number().min(0).max(6).nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Find employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        notificationPreferences: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // If preferences don't exist, create defaults
    if (!employee.notificationPreferences) {
      const defaultPreferences = await prisma.notificationPreferences.create({
        data: {
          employeeId: employee.id,
          emailEnabled: true,
          emailExpiringReminders: true,
          emailExpiredReminders: true,
          emailApprovalNotifications: true,
          emailRejectionNotifications: true,
          reminderFrequency: 'STANDARD',
          quietHoursEnabled: false,
          weeklyDigestEnabled: false,
        },
      });

      return NextResponse.json({
        success: true,
        preferences: defaultPreferences,
      });
    }

    return NextResponse.json({
      success: true,
      preferences: employee.notificationPreferences,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Parse and validate request body
    const body = await req.json();
    const validationResult = preferencesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid preferences data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const preferences = validationResult.data;

    // Validate quiet hours
    if (preferences.quietHoursEnabled) {
      if (
        preferences.quietHoursStart === null ||
        preferences.quietHoursEnd === null
      ) {
        return NextResponse.json(
          {
            error:
              'Quiet hours start and end times are required when quiet hours are enabled',
          },
          { status: 400 }
        );
      }
    }

    // Validate weekly digest
    if (preferences.weeklyDigestEnabled && preferences.weeklyDigestDay === null) {
      return NextResponse.json(
        {
          error: 'Weekly digest day is required when weekly digest is enabled',
        },
        { status: 400 }
      );
    }

    // Find employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    // Update or create preferences
    const updatedPreferences = await prisma.notificationPreferences.upsert({
      where: { employeeId: employee.id },
      create: {
        employeeId: employee.id,
        ...preferences,
      },
      update: preferences,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);

    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
