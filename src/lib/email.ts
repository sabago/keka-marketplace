import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { prisma } from '@/lib/db';

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
  },
});

// Get the site URL from environment
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const isDev = process.env.NODE_ENV === 'development';

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (isDev) {
    console.log('\n========== EMAIL (dev) ==========');
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${text}`);
    console.log('=================================\n');
    return true;
  }

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    });
    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send an Enterprise plan inquiry email to the sales team
 */
export async function sendEnterpriseInquiryEmail({
  name,
  email,
  agencyName,
  phone,
  message,
}: {
  name: string;
  email: string;
  agencyName: string;
  phone?: string;
  message?: string;
}): Promise<void> {
  const subject = `Enterprise Plan Inquiry — ${agencyName}`;
  const html = `
    <h2>New Enterprise Plan Inquiry</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${email}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Agency</td><td style="padding:8px">${agencyName}</td></tr>
      ${phone ? `<tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone}</td></tr>` : ''}
      ${message ? `<tr><td style="padding:8px;font-weight:bold">Message</td><td style="padding:8px">${message}</td></tr>` : ''}
    </table>
  `;
  const text = [
    'New Enterprise Plan Inquiry',
    `Name: ${name}`,
    `Email: ${email}`,
    `Agency: ${agencyName}`,
    phone ? `Phone: ${phone}` : '',
    message ? `Message: ${message}` : '',
  ].filter(Boolean).join('\n');

  await sendEmail('info@masteringhomecare.com', subject, html, text);
}

/**
 * Send an order confirmation email with download links
 * @param order Order details
 * @param downloads Download information
 */
export async function sendOrderConfirmationEmail(
  order: {
    id: string;
    customerEmail: string;
    totalAmount: number;
    orderItems: Array<{
      id: string;
      productId: string;
      price: number;
      product: {
        title: string;
      };
    }>;
  },
  downloads: Array<{
    downloadToken: string;
    productId: string;
    productTitle: string;
  }>
) {
  // Format the order total
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(order.totalAmount);

  // Create the email HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-bottom: 3px solid #007bff;
        }
        .content {
          padding: 20px;
        }
        .order-details {
          margin-bottom: 30px;
        }
        .downloads {
          background-color: #f0f7ff;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .download-item {
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #dee2e6;
        }
        .download-link {
          display: inline-block;
          background-color: #007bff;
          color: white;
          padding: 8px 15px;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 5px;
        }
        .footer {
          font-size: 12px;
          color: #6c757d;
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #dee2e6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Thank You for Your Purchase!</h1>
      </div>
      
      <div class="content">
        <div class="order-details">
          <h2>Order Details</h2>
          <p><strong>Order ID:</strong> ${order.id.substring(0, 8)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total:</strong> ${formattedTotal}</p>
        </div>
        
        <div class="downloads">
          <h2>Your Downloads</h2>
          <p>Your purchases are ready to download. Click the links below to access your files:</p>
          
          ${downloads.map(download => `
            <div class="download-item">
              <p><strong>${download.productTitle}</strong></p>
              <a href="https://keka-marketplace-production.up.railway.app/api/download/${download.downloadToken}" class="download-link">Download</a>
            </div>
          `).join('')}
          
          <p><em>Note: Download links will expire in 30 days.</em></p>
        </div>
        
        <p>If you have any questions about your order, please contact our support team.</p>
      </div>
      
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Your Digital Marketplace. All rights reserved.</p>
        <p>This email was sent to ${order.customerEmail}</p>
      </div>
    </body>
    </html>
  `;

  // Create text version of the email
  const textContent = `Thank you for your purchase! Order ID: ${order.id.substring(0, 8)}. Total: ${formattedTotal}. Your downloads are available at: ${downloads.map(d => `https://keka-marketplace-production.up.railway.app/api/download/${d.downloadToken}`).join(', ')}. Download links will expire in 30 days.`;

  return sendEmail(order.customerEmail, `Your Purchase Receipt - Order #${order.id.substring(0, 8)}`, htmlContent, textContent);
}

/**
 * Generate a password setup token for a user
 * @param userId User ID to create token for
 * @returns Token string or null if failed
 */
export async function generatePasswordSetupToken(userId: string): Promise<string | null> {
  try {
    // Token expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const tokenRecord = await prisma.passwordSetupToken.create({
      data: {
        userId,
        expiresAt,
        used: false,
      },
    });

    return tokenRecord.token;
  } catch (error) {
    console.error('Error generating password setup token:', error);
    return null;
  }
}

/**
 * Send agency approval email with password setup link
 * @param user User details
 * @param token Password setup token
 * @param agencyName Name of the approved agency
 */
export async function sendAgencyApprovalEmail(
  user: { email: string; name: string | null },
  token: string,
  agencyName: string
): Promise<boolean> {
  const passwordSetupUrl = `${SITE_URL}/auth/set-password?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Agency Approved!</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #0B4F96 0%, #48ccbc 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 30px 20px;
        }
        .cta-button {
          display: inline-block;
          background-color: #48ccbc;
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .info-box {
          background-color: #f0f7ff;
          border-left: 4px solid #0B4F96;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          font-size: 12px;
          color: #6c757d;
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #dee2e6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Your Agency Has Been Approved!</h1>
      </div>

      <div class="content">
        <p>Hi ${user.name || 'there'},</p>

        <p>Great news! <strong>${agencyName}</strong> has been approved to join our platform.</p>

        <p>You can now set up your password and start using all our platform features.</p>

        <div style="text-align: center;">
          <a href="${passwordSetupUrl}" class="cta-button">Set Up Your Password</a>
        </div>

        <div class="info-box">
          <p><strong>What's next?</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Click the button above to create your password</li>
            <li>Complete your agency profile</li>
            <li>Start managing referrals and accessing resources</li>
            <li>Explore our AI-powered chatbot for instant assistance</li>
          </ul>
        </div>

        <p><strong>Note:</strong> This password setup link will expire in 24 hours for security reasons.</p>

        <p>If you didn't request this or have any questions, please contact our support team.</p>

        <p>Welcome aboard!</p>

        <p>
          Best regards,<br>
          The Platform Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `Your Agency Has Been Approved!

Hi ${user.name || 'there'},

Great news! ${agencyName} has been approved to join our platform.

Set up your password here: ${passwordSetupUrl}

This link will expire in 24 hours.

Welcome aboard!
The Platform Team`;

  return sendEmail(user.email, `🎉 ${agencyName} - Agency Approved! Set Up Your Password`, htmlContent, textContent);
}

/**
 * Send agency rejection email with reason
 * @param user User details
 * @param agencyName Name of the rejected agency
 * @param reason Rejection reason
 */
export async function sendAgencyRejectionEmail(
  user: { email: string; name: string | null },
  agencyName: string,
  reason: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Agency Application Update</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #f8f9fa;
          padding: 30px 20px;
          text-align: center;
          border-bottom: 3px solid #0B4F96;
        }
        .content {
          padding: 30px 20px;
        }
        .reason-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .contact-box {
          background-color: #f0f7ff;
          border-left: 4px solid #0B4F96;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          font-size: 12px;
          color: #6c757d;
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #dee2e6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Agency Application Update</h1>
      </div>

      <div class="content">
        <p>Hi ${user.name || 'there'},</p>

        <p>Thank you for your interest in joining our platform with <strong>${agencyName}</strong>.</p>

        <p>After reviewing your application, we're unable to approve your agency at this time.</p>

        <div class="reason-box">
          <p><strong>Reason:</strong></p>
          <p>${reason}</p>
        </div>

        <div class="contact-box">
          <p><strong>Have questions or want to reapply?</strong></p>
          <p>If you believe this decision was made in error or you'd like to address the concerns raised, please contact our support team. We're happy to discuss your application further.</p>
        </div>

        <p>
          Best regards,<br>
          The Platform Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `Agency Application Update

Hi ${user.name || 'there'},

Thank you for your interest in joining our platform with ${agencyName}.

After reviewing your application, we're unable to approve your agency at this time.

Reason: ${reason}

If you have questions or want to reapply, please contact our support team.

Best regards,
The Platform Team`;

  return sendEmail(user.email, `${agencyName} - Application Update`, htmlContent, textContent);
}

/**
 * Send suspension notification to a user (agency admin or staff member)
 */
export async function sendAgencySuspensionEmail(
  user: { email: string; name: string | null },
  agencyName: string,
  reason: string,
  isAdmin: boolean
): Promise<boolean> {
  const roleNote = isAdmin
    ? 'As the agency administrator, your account and all associated staff accounts have been suspended.'
    : 'Your agency administrator has been notified. Staff access is suspended until the agency is reinstated.';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Account Suspended</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #f8f9fa; padding: 30px 20px; text-align: center; border-bottom: 3px solid #dc3545; }
        .content { padding: 30px 20px; }
        .reason-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .contact-box { background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { font-size: 12px; color: #6c757d; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="color: #dc3545;">Account Suspended</h1>
      </div>
      <div class="content">
        <p>Hi ${user.name || 'there'},</p>
        <p>We're writing to let you know that <strong>${agencyName}</strong>'s account has been suspended on our platform.</p>
        <p>${roleNote}</p>
        <div class="reason-box">
          <p><strong>Reason:</strong></p>
          <p>${reason}</p>
        </div>
        <div class="contact-box">
          <p><strong>Questions or concerns?</strong></p>
          <p>If you believe this suspension was made in error or would like to resolve the issue, please contact us at <a href="mailto:info@masteringhomecare.com">info@masteringhomecare.com</a>.</p>
        </div>
        <p>Best regards,<br>The Platform Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `Account Suspended

Hi ${user.name || 'there'},

${agencyName}'s account has been suspended on our platform.

${roleNote}

Reason: ${reason}

If you believe this was an error, contact us at info@masteringhomecare.com.

Best regards,
The Platform Team`;

  return sendEmail(user.email, `${agencyName} - Account Suspended`, htmlContent, textContent);
}

/**
 * Send payment failure notification to agency admin
 * Called on invoice.payment_failed webhook event
 */
export async function sendPaymentFailedEmail(
  user: { email: string; name: string | null },
  agencyName: string,
  planName: string,
  billingPortalUrl: string
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Failed</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background-color: #f8f9fa; padding: 30px 20px; text-align: center; border-bottom: 3px solid #f59e0b; }
        .content { padding: 30px 20px; }
        .alert-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .cta-button { display: inline-block; background-color: #0B4F96; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
        .info-box { background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { font-size: 12px; color: #6c757d; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="color: #92400e;">⚠️ Payment Failed</h1>
      </div>
      <div class="content">
        <p>Hi ${user.name || 'there'},</p>
        <p>We were unable to process the payment for your <strong>${planName}</strong> subscription for <strong>${agencyName}</strong>.</p>

        <div class="alert-box">
          <p><strong>What happens next:</strong></p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Your account remains active while we retry the payment</li>
            <li>Stripe will automatically retry your card over the next several days</li>
            <li>If all retries fail, your plan will be downgraded to Free</li>
          </ul>
        </div>

        <p><strong>To avoid any interruption, please update your payment method now:</strong></p>
        <a href="${billingPortalUrl}" class="cta-button">Update Payment Method</a>

        <div class="info-box">
          <p><strong>Need help?</strong> Contact us at <a href="mailto:info@masteringhomecare.com">info@masteringhomecare.com</a> and we'll sort it out.</p>
        </div>

        <p>Best regards,<br>The Platform Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `Payment Failed - ${agencyName}

Hi ${user.name || 'there'},

We were unable to process the payment for your ${planName} subscription for ${agencyName}.

What happens next:
- Your account remains active while we retry the payment
- Stripe will automatically retry your card over the next several days
- If all retries fail, your plan will be downgraded to Free

To avoid interruption, update your payment method here:
${billingPortalUrl}

Need help? Contact us at info@masteringhomecare.com

Best regards,
The Platform Team`;

  return sendEmail(user.email, `Action Required: Payment failed for ${agencyName}`, htmlContent, textContent);
}

/**
 * Send notification to platform admins about new agency signup
 * @param agency Agency details
 * @param user Primary contact user
 */
export async function sendAdminNewAgencyNotification(
  agency: {
    id: string;
    name: string;
    licenseNumber: string;
    city: string;
    state: string;
  },
  user: {
    name: string | null;
    email: string;
  }
): Promise<boolean> {
  // Get all platform admin emails
  const platformAdmins = await prisma.user.findMany({
    where: { role: 'PLATFORM_ADMIN' },
    select: { email: true },
  });

  if (platformAdmins.length === 0) {
    console.warn('No platform admins found to notify about new agency signup');
    return false;
  }

  const adminEmails = platformAdmins.map(admin => admin.email);
  const reviewUrl = `${SITE_URL}/admin/agencies/${agency.id}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Agency Application</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #0B4F96 0%, #48ccbc 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 30px 20px;
        }
        .agency-details {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #dee2e6;
        }
        .detail-label {
          font-weight: bold;
          color: #0B4F96;
        }
        .cta-button {
          display: inline-block;
          background-color: #48ccbc;
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          font-size: 12px;
          color: #6c757d;
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #dee2e6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 New Agency Application</h1>
      </div>

      <div class="content">
        <p>A new agency has applied to join the platform and is pending your review.</p>

        <div class="agency-details">
          <h3 style="margin-top: 0; color: #0B4F96;">Agency Information</h3>

          <div class="detail-row">
            <span class="detail-label">Agency Name:</span> ${agency.name}
          </div>

          <div class="detail-row">
            <span class="detail-label">License Number:</span> ${agency.licenseNumber}
          </div>

          <div class="detail-row">
            <span class="detail-label">Location:</span> ${agency.city}, ${agency.state}
          </div>

          <div class="detail-row">
            <span class="detail-label">Primary Contact:</span> ${user.name || 'N/A'}
          </div>

          <div class="detail-row">
            <span class="detail-label">Contact Email:</span> ${user.email}
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${reviewUrl}" class="cta-button">Review Application</a>
        </div>

        <p style="font-size: 14px; color: #6c757d;">
          Please review the application and verify the agency's credentials before approving or rejecting.
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This is an automated notification for platform administrators</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `New Agency Application

A new agency has applied to join the platform and is pending your review.

Agency Name: ${agency.name}
License Number: ${agency.licenseNumber}
Location: ${agency.city}, ${agency.state}
Primary Contact: ${user.name || 'N/A'}
Contact Email: ${user.email}

Review the application here: ${reviewUrl}`;

  if (isDev) {
    return sendEmail(adminEmails.join(', '), `📋 New Agency Application: ${agency.name}`, htmlContent, textContent);
  }
  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: { ToAddresses: adminEmails },
      Message: {
        Subject: { Data: `📋 New Agency Application: ${agency.name}`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlContent, Charset: 'UTF-8' },
          Text: { Data: textContent, Charset: 'UTF-8' },
        },
      },
    });
    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
}

/**
 * Send staff invitation email with password setup link
 * @param staff Staff member details
 * @param token Password setup token
 * @param agencyName Name of the agency
 * @param inviterName Name of the person inviting
 */
export async function sendStaffInvitationEmail(
  staff: { email: string; name: string | null },
  token: string,
  agencyName: string,
  inviterName: string
): Promise<boolean> {
  const passwordSetupUrl = `${SITE_URL}/auth/set-password?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>You're Invited to Join ${agencyName}!</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #0B4F96 0%, #48ccbc 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 30px 20px;
        }
        .cta-button {
          display: inline-block;
          background-color: #48ccbc;
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .info-box {
          background-color: #f0f7ff;
          border-left: 4px solid #0B4F96;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          font-size: 12px;
          color: #6c757d;
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #dee2e6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 You're Invited!</h1>
      </div>

      <div class="content">
        <p>Hi ${staff.name || 'there'},</p>

        <p><strong>${inviterName}</strong> has invited you to join <strong>${agencyName}</strong> on our platform.</p>

        <p>As a team member, you'll have access to:</p>
        <ul>
          <li>Your agency's dashboard and analytics</li>
          <li>Referral management tools</li>
          <li>Marketplace resources and tools</li>
          <li>AI-powered chatbot assistance</li>
          <li>Knowledge base and directory</li>
        </ul>

        <div style="text-align: center;">
          <a href="${passwordSetupUrl}" class="cta-button">Accept Invitation & Set Password</a>
        </div>

        <div class="info-box">
          <p><strong>Getting started is easy:</strong></p>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>Click the button above to accept the invitation</li>
            <li>Create a secure password for your account</li>
            <li>Complete your profile</li>
            <li>Start collaborating with your team!</li>
          </ol>
        </div>

        <p><strong>Note:</strong> This invitation link will expire in 24 hours for security reasons.</p>

        <p>If you didn't expect this invitation or have any questions, please contact ${inviterName} or our support team.</p>

        <p>Welcome to the team!</p>

        <p>
          Best regards,<br>
          The Platform Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${staff.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `You're Invited to Join ${agencyName}!

Hi ${staff.name || 'there'},

${inviterName} has invited you to join ${agencyName} on our platform.

Accept your invitation and set up your password here: ${passwordSetupUrl}

As a team member, you'll have access to:
- Your agency's dashboard and analytics
- Referral management tools
- Marketplace resources and tools
- AI-powered chatbot assistance
- Knowledge base and directory

This link will expire in 24 hours.

Welcome to the team!
The Platform Team`;

  return sendEmail(staff.email, `🎉 You're invited to join ${agencyName}!`, htmlContent, textContent);
}

/**
 * Send password reset email with reset link
 */
export async function sendPasswordResetEmail(
  user: { email: string; name: string | null },
  token: string
): Promise<boolean> {
  const resetUrl = `${SITE_URL}/auth/reset-password?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #0B4F96 0%, #48ccbc 100%); padding: 30px 20px; text-align: center; color: white; }
        .content { padding: 30px 20px; }
        .cta-button { display: inline-block; background-color: #48ccbc; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .info-box { background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { font-size: 12px; color: #6c757d; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reset Your Password</h1>
      </div>
      <div class="content">
        <p>Hi ${user.name || 'there'},</p>
        <p>We received a request to reset the password for your account.</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" class="cta-button">Reset Password</a>
        </div>
        <div class="info-box">
          <p><strong>Didn't request this?</strong></p>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
        </div>
        <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
        <p>
          Best regards,<br>
          The Platform Team
        </p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `Reset Your Password

Hi ${user.name || 'there'},

We received a request to reset the password for your account.

Reset your password here: ${resetUrl}

This link will expire in 1 hour.

If you didn't request this, ignore this email — your password won't change.

Best regards,
The Platform Team`;

  return sendEmail(user.email, 'Reset your password', htmlContent, textContent);
}

/**
 * Send a role-specific welcome email after a user sets their password
 * @param user User details including role
 * @param agencyName Agency name (undefined for PLATFORM_ADMIN / SUPERADMIN)
 */
export async function sendWelcomeEmail(
  user: { email: string; name: string | null; role: string },
  agencyName?: string
): Promise<boolean> {
  const isAdmin = user.role === 'PLATFORM_ADMIN' || user.role === 'SUPERADMIN';
  const isAgencyAdmin = user.role === 'AGENCY_ADMIN';
  const dashboardUrl = `${SITE_URL}/dashboard`;
  const adminUrl = `${SITE_URL}/admin`;

  let subject: string;
  let headingHtml: string;
  let bodyHtml: string;
  let bodyText: string;

  if (isAdmin) {
    subject = 'Your admin account is ready';
    headingHtml = 'Your Admin Account Is Ready';
    bodyHtml = `
      <p>Hi ${user.name || 'there'},</p>
      <p>Your platform admin account is fully set up. You now have access to the admin console.</p>
      <div style="text-align:center;">
        <a href="${adminUrl}" class="cta-button">Go to Admin Console</a>
      </div>
      <div class="info-box">
        <p><strong>What you can do:</strong></p>
        <ul style="margin:10px 0;padding-left:20px;">
          <li>Review and approve agency applications</li>
          <li>Manage platform users and permissions</li>
          <li>View the HIPAA audit log</li>
          <li>Configure platform settings</li>
        </ul>
      </div>`;
    bodyText = `Hi ${user.name || 'there'},

Your platform admin account is fully set up.

Go to the admin console: ${adminUrl}

From there you can review agency applications, manage users, view the audit log, and configure platform settings.

Best regards,
The Platform Team`;
  } else if (isAgencyAdmin) {
    subject = `Welcome to Mastering Home Care, ${user.name?.split(' ')[0] || 'there'}!`;
    headingHtml = `Welcome, ${user.name?.split(' ')[0] || 'there'}!`;
    bodyHtml = `
      <p>Hi ${user.name || 'there'},</p>
      <p>Your agency <strong>${agencyName}</strong> is set up and ready to go. Here's where to start:</p>
      <div style="text-align:center;">
        <a href="${dashboardUrl}" class="cta-button">Go to Your Dashboard</a>
      </div>
      <div class="info-box">
        <p><strong>What to do first:</strong></p>
        <ul style="margin:10px 0;padding-left:20px;">
          <li>Complete your <a href="${SITE_URL}/agency/profile">agency profile</a></li>
          <li>Browse referral sources in the <a href="${SITE_URL}/directory">Referral Directory</a></li>
          <li>Invite staff members and track credential compliance</li>
          <li>Ask our <a href="${SITE_URL}/chatbot">AI Chatbot</a> anything about patient acquisition</li>
        </ul>
      </div>`;
    bodyText = `Hi ${user.name || 'there'},

Your agency ${agencyName} is set up and ready to go.

Dashboard: ${dashboardUrl}

Next steps:
- Complete your agency profile: ${SITE_URL}/agency/profile
- Browse the Referral Directory: ${SITE_URL}/directory
- Invite staff and track credential compliance
- Try the AI Chatbot: ${SITE_URL}/chatbot

Best regards,
The Platform Team`;
  } else {
    // AGENCY_USER — staff member
    subject = `You're all set — welcome to ${agencyName || 'the team'}!`;
    headingHtml = `Welcome to ${agencyName || 'the Team'}!`;
    bodyHtml = `
      <p>Hi ${user.name || 'there'},</p>
      <p>Your account is active. Your next step is to upload your required credentials so your agency stays compliant.</p>
      <div style="text-align:center;">
        <a href="${dashboardUrl}" class="cta-button">Go to Your Dashboard</a>
      </div>
      <div class="info-box">
        <p><strong>Getting started:</strong></p>
        <ul style="margin:10px 0;padding-left:20px;">
          <li>Upload your credentials (CPR, HHA cert, RN license, etc.)</li>
          <li>Keep an eye on expiration dates — we'll remind you automatically</li>
          <li>Check your compliance status anytime from the dashboard</li>
        </ul>
      </div>`;
    bodyText = `Hi ${user.name || 'there'},

Your account is active. Upload your required credentials to keep your agency compliant.

Dashboard: ${dashboardUrl}

Getting started:
- Upload credentials (CPR, HHA cert, RN license, etc.)
- We'll send you reminders before anything expires
- Check your compliance status anytime from the dashboard

Best regards,
The Platform Team`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #0B4F96 0%, #48ccbc 100%); padding: 30px 20px; text-align: center; color: white; }
        .content { padding: 30px 20px; }
        .cta-button { display: inline-block; background-color: #48ccbc; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .info-box { background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { font-size: 12px; color: #6c757d; text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #dee2e6; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${headingHtml}</h1>
      </div>
      <div class="content">
        ${bodyHtml}
        <p>Best regards,<br>The Platform Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </body>
    </html>`;

  return sendEmail(user.email, subject, htmlContent, bodyText);
}

/**
 * Send access request notification to all platform admins
 */
export async function sendAccessRequestNotification(data: {
  agencyName: string;
  licenseNumber: string;
  taxId: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hearAboutUs: string;
}): Promise<boolean> {
  const platformAdmins = await prisma.user.findMany({
    where: { role: 'PLATFORM_ADMIN' },
    select: { email: true },
  });

  const toAddresses = platformAdmins.length > 0
    ? platformAdmins.map(a => a.email)
    : [process.env.SES_SENDER_EMAIL || 'info@masteringhomecare.com'];

  const adminPanelUrl = `${SITE_URL}/admin/agencies/new`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>New Agency Access Request</title></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0B4F96 0%,#48ccbc 100%);padding:30px 20px;text-align:center;color:white;">
        <h1 style="margin:0;font-size:24px;">New Agency Access Request</h1>
        <p style="margin:8px 0 0;opacity:0.9;">Someone wants to join the platform</p>
      </div>
      <div style="padding:30px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;width:40%;">Agency Name</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.agencyName}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">License Number</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.licenseNumber}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">Tax ID / EIN</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.taxId}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">State</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.state}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">Contact Name</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.contactName}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">Contact Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;"><a href="mailto:${data.contactEmail}">${data.contactEmail}</a></td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">Contact Phone</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.contactPhone}</td></tr>
          ${data.hearAboutUs ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">How they heard</td><td style="padding:8px 0;border-bottom:1px solid #eee;">${data.hearAboutUs}</td></tr>` : ''}
        </table>
        <div style="margin-top:30px;text-align:center;">
          <a href="${adminPanelUrl}" style="background:#0B4F96;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Add This Agency in Admin Panel
          </a>
        </div>
        <p style="margin-top:24px;font-size:13px;color:#666;">Reply directly to <a href="mailto:${data.contactEmail}">${data.contactEmail}</a> to follow up with the agency.</p>
      </div>
    </body>
    </html>`;

  const textContent = `New Agency Access Request

Agency Name:    ${data.agencyName}
License Number: ${data.licenseNumber}
Tax ID / EIN:   ${data.taxId}
State:          ${data.state}
Contact Name:   ${data.contactName}
Contact Email:  ${data.contactEmail}
Contact Phone:  ${data.contactPhone}
${data.hearAboutUs ? `How they heard: ${data.hearAboutUs}` : ''}

Add this agency in the admin panel: ${adminPanelUrl}`;

  if (isDev) {
    return sendEmail(toAddresses.join(', '), `New Agency Access Request: ${data.agencyName}`, htmlContent, textContent);
  }

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: { ToAddresses: toAddresses },
      Message: {
        Subject: { Data: `New Agency Access Request: ${data.agencyName}`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlContent, Charset: 'UTF-8' },
          Text: { Data: textContent, Charset: 'UTF-8' },
        },
      },
    });
    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending access request notification:', error);
    return false;
  }
}
