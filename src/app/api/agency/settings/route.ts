import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyAdmin , HttpError } from '@/lib/authHelpers';
import { prisma } from '@/lib/db';
import { AgencySize, IntakeMethod } from '@prisma/client';

/**
 * GET /api/agency/settings
 * Get agency settings
 */
export async function GET(req: NextRequest) {
  try {
    const { agency: { id: agencyId, agencyName, licenseNumber } } = await requireAgencyAdmin();

    const agencyData = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        agencySize: true,
        servicesOffered: true,
        serviceArea: true,
        primaryContactName: true,
        primaryContactRole: true,
        primaryContactEmail: true,
        primaryContactPhone: true,
        intakeMethod: true,
        intakeMethods: true,
        followUpFrequency: true,
        followUpMethods: true,
        avgReferralsPerMonth: true,
        specializations: true,
      },
    });

    return NextResponse.json(
      {
        agency: {
          id: agencyId,
          agencyName,
          licenseNumber,
          agencySize: agencyData?.agencySize,
          servicesOffered: agencyData?.servicesOffered,
          serviceArea: agencyData?.serviceArea,
          primaryContactName: agencyData?.primaryContactName,
          primaryContactRole: agencyData?.primaryContactRole,
          primaryContactEmail: agencyData?.primaryContactEmail,
          primaryContactPhone: agencyData?.primaryContactPhone,
          intakeMethod: agencyData?.intakeMethod,
          intakeMethods: agencyData?.intakeMethods,
          followUpFrequency: agencyData?.followUpFrequency,
          followUpMethods: agencyData?.followUpMethods,
          avgReferralsPerMonth: agencyData?.avgReferralsPerMonth,
          specializations: agencyData?.specializations,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching agency settings:', error);

    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch agency settings. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agency/settings
 * Update agency settings
 */
export async function PUT(req: NextRequest) {
  try {
    const { user, agency } = await requireAgencyAdmin();
    const body = await req.json();

    const {
      agencySize,
      servicesOffered,
      serviceArea,
      primaryContactName,
      primaryContactRole,
      primaryContactEmail,
      primaryContactPhone,
      intakeMethod,
      intakeMethods,
      followUpFrequency,
      followUpMethods,
      avgReferralsPerMonth,
      specializations,
    } = body;

    // Validate agency size if provided
    if (agencySize && !Object.values(AgencySize).includes(agencySize)) {
      return NextResponse.json(
        { error: 'Invalid agency size' },
        { status: 400 }
      );
    }

    // Validate intake method if provided
    if (intakeMethod && !Object.values(IntakeMethod).includes(intakeMethod)) {
      return NextResponse.json(
        { error: 'Invalid intake method' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (primaryContactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(primaryContactEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};

    if (agencySize !== undefined) updateData.agencySize = agencySize;
    if (servicesOffered !== undefined) updateData.servicesOffered = servicesOffered;
    if (serviceArea !== undefined) updateData.serviceArea = serviceArea;
    if (primaryContactName !== undefined)
      updateData.primaryContactName = primaryContactName;
    if (primaryContactRole !== undefined)
      updateData.primaryContactRole = primaryContactRole;
    if (primaryContactEmail !== undefined)
      updateData.primaryContactEmail = primaryContactEmail;
    if (primaryContactPhone !== undefined)
      updateData.primaryContactPhone = primaryContactPhone;
    if (intakeMethod !== undefined) updateData.intakeMethod = intakeMethod;
    if (intakeMethods !== undefined) updateData.intakeMethods = intakeMethods;
    if (followUpFrequency !== undefined)
      updateData.followUpFrequency = followUpFrequency;
    if (followUpMethods !== undefined) updateData.followUpMethods = followUpMethods;
    if (avgReferralsPerMonth !== undefined)
      updateData.avgReferralsPerMonth = avgReferralsPerMonth;
    if (specializations !== undefined) updateData.specializations = specializations;

    // Update the agency — select only what we need in the response below
    const updatedAgency = await prisma.agency.update({
      where: { id: agency.id },
      data: updateData,
      select: {
        id: true,
        agencyName: true,
        agencySize: true,
        servicesOffered: true,
        serviceArea: true,
        primaryContactName: true,
        primaryContactRole: true,
        primaryContactEmail: true,
        primaryContactPhone: true,
      },
    });

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: user.id,
        actionType: 'AGENCY_SETTINGS_UPDATED',
        targetAgencyId: agency.id,
        details: {
          updatedFields: Object.keys(updateData),
          agencyName: updatedAgency.agencyName,
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Agency settings updated successfully',
        agency: {
          id: updatedAgency.id,
          agencyName: updatedAgency.agencyName,
          agencySize: updatedAgency.agencySize,
          servicesOffered: updatedAgency.servicesOffered,
          serviceArea: updatedAgency.serviceArea,
          primaryContactName: updatedAgency.primaryContactName,
          primaryContactRole: updatedAgency.primaryContactRole,
          primaryContactEmail: updatedAgency.primaryContactEmail,
          primaryContactPhone: updatedAgency.primaryContactPhone,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating agency settings:', error);

    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error.message.includes('required')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update agency settings. Please try again.' },
      { status: 500 }
    );
  }
}
