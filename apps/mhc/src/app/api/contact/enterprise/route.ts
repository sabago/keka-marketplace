import { NextResponse } from 'next/server';
import { sendEnterpriseInquiryEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, agencyName, phone, message } = body;

    if (!name || !email || !agencyName) {
      return NextResponse.json(
        { error: 'Name, email, and agency name are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    await sendEnterpriseInquiryEmail({ name, email, agencyName, phone, message });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending enterprise inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to send inquiry. Please try again.' },
      { status: 500 }
    );
  }
}
