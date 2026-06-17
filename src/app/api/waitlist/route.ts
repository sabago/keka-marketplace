import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  agencyName: z.string().min(1).max(150),
  tool: z.string().min(1).max(100),
});

const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
  },
});

const isDev = process.env.NODE_ENV === 'development';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { name, email, agencyName, tool } = parsed.data;

    const subject = `Waitlist Signup: ${tool} — ${agencyName}`;
    const html = `
      <h2>New Waitlist Signup</h2>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
        <tr><td style="padding:8px;font-weight:bold;width:140px">Tool</td><td style="padding:8px">${tool}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold">Agency</td><td style="padding:8px">${agencyName}</td></tr>
      </table>
    `;
    const text = `Waitlist Signup\nTool: ${tool}\nName: ${name}\nEmail: ${email}\nAgency: ${agencyName}`;

    const TO = 'info@masteringhomecare.com';
    const FROM = process.env.SES_SENDER_EMAIL || 'noreply@masteringhomecare.com';

    if (isDev) {
      console.log('\n=== WAITLIST (dev) ===');
      console.log(text);
      console.log('=====================\n');
      return NextResponse.json({ ok: true });
    }

    const command = new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [TO] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    });
    await sesClient.send(command);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Waitlist error:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
