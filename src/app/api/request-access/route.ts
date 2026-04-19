import { NextRequest, NextResponse } from 'next/server';
import { sendAccessRequestNotification } from '@/lib/email';

const EIN_REGEX = /^\d{2}-\d{7}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{10,}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agencyName,
      licenseNumber,
      taxId,
      state,
      contactName,
      contactEmail,
      contactPhone,
      hearAboutUs,
    } = body;

    // Validate required fields
    if (!agencyName?.trim()) {
      return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
    }
    if (!licenseNumber?.trim()) {
      return NextResponse.json({ error: 'License number is required' }, { status: 400 });
    }
    if (!taxId?.trim() || !EIN_REGEX.test(taxId.trim())) {
      return NextResponse.json({ error: 'Tax ID must be in format XX-XXXXXXX' }, { status: 400 });
    }
    if (!state?.trim()) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 });
    }
    if (!contactName?.trim()) {
      return NextResponse.json({ error: 'Contact name is required' }, { status: 400 });
    }
    if (!contactEmail?.trim() || !EMAIL_REGEX.test(contactEmail.trim())) {
      return NextResponse.json({ error: 'Valid contact email is required' }, { status: 400 });
    }
    if (!contactPhone?.trim() || !PHONE_REGEX.test(contactPhone.trim())) {
      return NextResponse.json({ error: 'Valid contact phone is required' }, { status: 400 });
    }

    await sendAccessRequestNotification({
      agencyName: agencyName.trim(),
      licenseNumber: licenseNumber.trim(),
      taxId: taxId.trim(),
      state: state.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      hearAboutUs: hearAboutUs?.trim() || '',
    });

    return NextResponse.json({ message: 'Request submitted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing access request:', error);
    return NextResponse.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 });
  }
}
