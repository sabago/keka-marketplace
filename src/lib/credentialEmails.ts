/**
 * Credential Email Templates
 *
 * Email notifications for credential-related events:
 * - Expiration reminders (30, 7, 0 days)
 * - Approval notifications
 * - Rejection notifications
 * - Compliance reports
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
  },
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Send credential expiring soon reminder
 */
export async function sendCredentialExpiringReminder(
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  },
  credential: {
    id: string;
    documentTypeName: string;
    expirationDate: Date;
    licenseNumber: string | null;
  },
  daysUntilExpiration: number
): Promise<boolean> {
  const formattedDate = new Date(credential.expirationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgency = daysUntilExpiration <= 7 ? 'urgent' : 'important';
  const urgencyColor = daysUntilExpiration <= 7 ? '#dc3545' : '#ffc107';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Credential Expiring Soon</title>
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
        .alert-box {
          background-color: ${daysUntilExpiration <= 7 ? '#f8d7da' : '#fff3cd'};
          border-left: 4px solid ${urgencyColor};
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .credential-details {
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
          background-color: #0B4F96;
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
        <h1>⚠️ Credential Expiring Soon</h1>
      </div>

      <div class="content">
        <p>Hi ${employee.firstName},</p>

        <div class="alert-box">
          <h2 style="margin-top: 0; color: ${urgencyColor};">
            ${daysUntilExpiration === 0 ? '🚨 Expires Today!' : daysUntilExpiration === 1 ? '⏰ Expires Tomorrow!' : `⏰ ${daysUntilExpiration} Days Until Expiration`}
          </h2>
          <p style="font-size: 16px; margin: 10px 0;">
            Your <strong>${credential.documentTypeName}</strong> will expire on <strong>${formattedDate}</strong>.
          </p>
        </div>

        <div class="credential-details">
          <h3 style="margin-top: 0; color: #0B4F96;">Credential Information</h3>

          <div class="detail-row">
            <span class="detail-label">Type:</span> ${credential.documentTypeName}
          </div>

          ${credential.licenseNumber ? `
            <div class="detail-row">
              <span class="detail-label">License Number:</span> ${credential.licenseNumber}
            </div>
          ` : ''}

          <div class="detail-row">
            <span class="detail-label">Expiration Date:</span> ${formattedDate}
          </div>

          <div class="detail-row">
            <span class="detail-label">Days Remaining:</span> <strong style="color: ${urgencyColor};">${daysUntilExpiration} ${daysUntilExpiration === 1 ? 'day' : 'days'}</strong>
          </div>
        </div>

        <div style="background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Action Required:</strong></p>
          <p>To maintain compliance and continue working, please renew your ${credential.documentTypeName} and upload the updated document to your employee dashboard.</p>
        </div>

        <div style="text-align: center;">
          <a href="${SITE_URL}/dashboard" class="cta-button">Upload Renewed Credential</a>
        </div>

        <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
          <strong>Important:</strong> Working with an expired credential may violate licensing requirements and agency policies. Please renew as soon as possible.
        </p>

        <p>
          If you have already renewed this credential, please disregard this reminder.
        </p>

        <p>
          Best regards,<br>
          Your Agency HR Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${employee.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `⚠️ Credential Expiring Soon

Hi ${employee.firstName},

Your ${credential.documentTypeName} will expire ${daysUntilExpiration === 0 ? 'TODAY' : daysUntilExpiration === 1 ? 'TOMORROW' : `in ${daysUntilExpiration} days`} on ${formattedDate}.

${credential.licenseNumber ? `License Number: ${credential.licenseNumber}` : ''}
Days Remaining: ${daysUntilExpiration}

Action Required: Please renew your credential and upload the updated document to your employee dashboard.

Upload here: ${SITE_URL}/dashboard

Best regards,
Your Agency HR Team`;

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [employee.email],
      },
      Message: {
        Subject: {
          Data: `⚠️ ${credential.documentTypeName} Expiring ${daysUntilExpiration === 0 ? 'TODAY' : daysUntilExpiration === 1 ? 'Tomorrow' : `in ${daysUntilExpiration} Days`}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textContent,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending credential expiring reminder:', error);
    return false;
  }
}

/**
 * Send credential expired notification
 */
export async function sendCredentialExpiredNotification(
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  },
  credential: {
    id: string;
    documentTypeName: string;
    expirationDate: Date;
    licenseNumber: string | null;
  }
): Promise<boolean> {
  const formattedDate = new Date(credential.expirationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Credential Expired</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #dc3545;
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 30px 20px;
        }
        .alert-box {
          background-color: #f8d7da;
          border-left: 4px solid #dc3545;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .credential-details {
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
          background-color: #dc3545;
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
        <h1>🚨 Credential Expired</h1>
      </div>

      <div class="content">
        <p>Hi ${employee.firstName},</p>

        <div class="alert-box">
          <h2 style="margin-top: 0; color: #dc3545;">Your Credential Has Expired</h2>
          <p style="font-size: 16px; margin: 10px 0;">
            Your <strong>${credential.documentTypeName}</strong> expired on <strong>${formattedDate}</strong>.
          </p>
        </div>

        <div class="credential-details">
          <h3 style="margin-top: 0; color: #0B4F96;">Expired Credential</h3>

          <div class="detail-row">
            <span class="detail-label">Type:</span> ${credential.documentTypeName}
          </div>

          ${credential.licenseNumber ? `
            <div class="detail-row">
              <span class="detail-label">License Number:</span> ${credential.licenseNumber}
            </div>
          ` : ''}

          <div class="detail-row">
            <span class="detail-label">Expired On:</span> ${formattedDate}
          </div>

          <div class="detail-row">
            <span class="detail-label">Status:</span> <strong style="color: #dc3545;">EXPIRED</strong>
          </div>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p><strong>⚠️ Immediate Action Required</strong></p>
          <p>Working with an expired credential may violate state licensing requirements and put you and your agency at risk. You may be temporarily removed from active duty until your credential is renewed.</p>
        </div>

        <div style="text-align: center;">
          <a href="${SITE_URL}/dashboard" class="cta-button">Upload Renewed Credential Now</a>
        </div>

        <p>
          Please renew your ${credential.documentTypeName} immediately and upload the updated document to restore your compliance status.
        </p>

        <p>
          If you have questions or need assistance, please contact your agency administrator.
        </p>

        <p>
          Best regards,<br>
          Your Agency HR Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${employee.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `🚨 Credential Expired

Hi ${employee.firstName},

Your ${credential.documentTypeName} EXPIRED on ${formattedDate}.

${credential.licenseNumber ? `License Number: ${credential.licenseNumber}` : ''}
Status: EXPIRED

⚠️ IMMEDIATE ACTION REQUIRED

Working with an expired credential may violate licensing requirements. Please renew immediately and upload to your dashboard.

Upload here: ${SITE_URL}/dashboard

Best regards,
Your Agency HR Team`;

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [employee.email],
      },
      Message: {
        Subject: {
          Data: `🚨 URGENT: ${credential.documentTypeName} Has Expired`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textContent,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending credential expired notification:', error);
    return false;
  }
}

/**
 * Send credential approved notification
 */
export async function sendCredentialApprovedNotification(
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  },
  credential: {
    id: string;
    documentTypeName: string;
    expirationDate: Date | null;
    reviewNotes: string | null;
  }
): Promise<boolean> {
  const formattedExpiration = credential.expirationDate
    ? new Date(credential.expirationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No expiration';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Credential Approved</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 30px 20px;
        }
        .success-box {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .credential-details {
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
        <h1>✅ Credential Approved!</h1>
      </div>

      <div class="content">
        <p>Hi ${employee.firstName},</p>

        <div class="success-box">
          <h2 style="margin-top: 0; color: #28a745;">Your credential has been approved!</h2>
          <p style="font-size: 16px; margin: 10px 0;">
            Your <strong>${credential.documentTypeName}</strong> has been reviewed and approved by your agency administrator.
          </p>
        </div>

        <div class="credential-details">
          <h3 style="margin-top: 0; color: #0B4F96;">Credential Information</h3>

          <div class="detail-row">
            <span class="detail-label">Type:</span> ${credential.documentTypeName}
          </div>

          <div class="detail-row">
            <span class="detail-label">Status:</span> <strong style="color: #28a745;">APPROVED</strong>
          </div>

          ${credential.expirationDate ? `
            <div class="detail-row">
              <span class="detail-label">Expiration Date:</span> ${formattedExpiration}
            </div>
          ` : ''}
        </div>

        ${credential.reviewNotes ? `
          <div style="background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Reviewer Notes:</strong></p>
            <p>${credential.reviewNotes}</p>
          </div>
        ` : ''}

        <p>
          Your credential is now active in the system and counts toward your compliance status. No further action is needed at this time.
        </p>

        ${credential.expirationDate ? `
          <p style="font-size: 14px; color: #6c757d;">
            <strong>Reminder:</strong> You will receive automatic reminders before this credential expires.
          </p>
        ` : ''}

        <p>
          Best regards,<br>
          Your Agency HR Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${employee.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `✅ Credential Approved!

Hi ${employee.firstName},

Good news! Your ${credential.documentTypeName} has been reviewed and approved.

Status: APPROVED
${credential.expirationDate ? `Expiration: ${formattedExpiration}` : ''}

${credential.reviewNotes ? `Reviewer Notes: ${credential.reviewNotes}` : ''}

Your credential is now active in the system. No further action needed at this time.

Best regards,
Your Agency HR Team`;

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [employee.email],
      },
      Message: {
        Subject: {
          Data: `✅ ${credential.documentTypeName} Approved`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textContent,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending credential approved notification:', error);
    return false;
  }
}

/**
 * Send credential rejected notification
 */
export async function sendCredentialRejectedNotification(
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  },
  credential: {
    id: string;
    documentTypeName: string;
    reviewNotes: string | null;
  }
): Promise<boolean> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Credential Needs Attention</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #ffc107;
          padding: 30px 20px;
          text-align: center;
          color: #333;
        }
        .content {
          padding: 30px 20px;
        }
        .warning-box {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .reason-box {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #dc3545;
        }
        .cta-button {
          display: inline-block;
          background-color: #0B4F96;
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
        <h1>⚠️ Credential Needs Attention</h1>
      </div>

      <div class="content">
        <p>Hi ${employee.firstName},</p>

        <div class="warning-box">
          <h2 style="margin-top: 0; color: #856404;">Action Required: Credential Not Approved</h2>
          <p style="font-size: 16px; margin: 10px 0;">
            Your uploaded <strong>${credential.documentTypeName}</strong> could not be approved and needs to be re-uploaded.
          </p>
        </div>

        <div class="reason-box">
          <h3 style="margin-top: 0; color: #dc3545;">Reason for Rejection</h3>
          <p style="font-size: 15px;">
            ${credential.reviewNotes || 'The uploaded document did not meet the requirements. Please review and upload a corrected version.'}
          </p>
        </div>

        <div style="background-color: #f0f7ff; border-left: 4px solid #0B4F96; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p><strong>Next Steps:</strong></p>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li>Review the feedback above</li>
            <li>Obtain a corrected or clearer copy of your credential</li>
            <li>Upload the new document to your dashboard</li>
            <li>Your new upload will be reviewed by an administrator</li>
          </ol>
        </div>

        <div style="text-align: center;">
          <a href="${SITE_URL}/dashboard" class="cta-button">Upload Corrected Credential</a>
        </div>

        <p>
          If you have questions about the rejection or need assistance, please contact your agency administrator.
        </p>

        <p>
          Best regards,<br>
          Your Agency HR Team
        </p>
      </div>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Healthcare Agency Platform. All rights reserved.</p>
        <p>This email was sent to ${employee.email}</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `⚠️ Credential Needs Attention

Hi ${employee.firstName},

Your uploaded ${credential.documentTypeName} could not be approved and needs to be re-uploaded.

Reason: ${credential.reviewNotes || 'The document did not meet the requirements.'}

Next Steps:
1. Review the feedback above
2. Obtain a corrected or clearer copy
3. Upload the new document to your dashboard

Upload here: ${SITE_URL}/dashboard

If you have questions, please contact your agency administrator.

Best regards,
Your Agency HR Team`;

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [employee.email],
      },
      Message: {
        Subject: {
          Data: `⚠️ ${credential.documentTypeName} Needs Attention`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlContent,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textContent,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending credential rejected notification:', error);
    return false;
  }
}

/**
 * Send weekly compliance digest email to an agency admin
 */
export async function sendWeeklyComplianceDigest(
  admin: { email: string; firstName: string; lastName: string },
  agencyName: string,
  summary: {
    total: number;
    valid: number;
    expiringSoon: number;
    expired: number;
    missing: number;
    pendingReview: number;
    complianceRate: number;
  },
  urgentCredentials: Array<{
    employeeName: string;
    documentTypeName: string;
    expirationDate: Date | null;
    status: string;
  }>
): Promise<boolean> {
  const urgentRows = urgentCredentials
    .map(
      (c) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${c.employeeName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${c.documentTypeName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${c.expirationDate ? new Date(c.expirationDate).toLocaleDateString('en-US') : 'N/A'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${c.status}</td>
        </tr>`
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Weekly Compliance Digest</title></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto">
      <div style="background:#0B4F96;padding:24px 20px;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:22px">Weekly Compliance Digest</h1>
        <p style="margin:4px 0 0;opacity:.9">${agencyName}</p>
      </div>
      <div style="padding:24px 20px">
        <p>Hi ${admin.firstName},</p>
        <p>Here is your weekly credential compliance summary for <strong>${agencyName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr style="background:#f5f7fa">
            <td style="padding:8px 12px;font-weight:bold">Compliance Rate</td>
            <td style="padding:8px 12px">${summary.complianceRate.toFixed(1)}%</td>
          </tr>
          <tr>
            <td style="padding:8px 12px">Total Credentials</td>
            <td style="padding:8px 12px">${summary.total}</td>
          </tr>
          <tr style="background:#f5f7fa">
            <td style="padding:8px 12px">Valid</td>
            <td style="padding:8px 12px;color:#16a34a">${summary.valid}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px">Expiring Soon</td>
            <td style="padding:8px 12px;color:#d97706">${summary.expiringSoon}</td>
          </tr>
          <tr style="background:#f5f7fa">
            <td style="padding:8px 12px">Expired</td>
            <td style="padding:8px 12px;color:#dc2626">${summary.expired}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px">Missing</td>
            <td style="padding:8px 12px;color:#dc2626">${summary.missing}</td>
          </tr>
          <tr style="background:#f5f7fa">
            <td style="padding:8px 12px">Pending Review</td>
            <td style="padding:8px 12px">${summary.pendingReview}</td>
          </tr>
        </table>
        ${
          urgentCredentials.length > 0
            ? `<h3 style="color:#dc2626;margin-top:0">Urgent Credentials</h3>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead>
                  <tr style="background:#fee2e2;color:#7f1d1d">
                    <th style="padding:8px;text-align:left">Employee</th>
                    <th style="padding:8px;text-align:left">Credential</th>
                    <th style="padding:8px;text-align:left">Expires</th>
                    <th style="padding:8px;text-align:left">Status</th>
                  </tr>
                </thead>
                <tbody>${urgentRows}</tbody>
              </table>`
            : '<p style="color:#16a34a">No urgent credentials this week.</p>'
        }
        <p style="margin-top:24px">
          <a href="${SITE_URL}/agency/credentials" style="background:#0B4F96;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View All Credentials</a>
        </p>
      </div>
    </body>
    </html>`;

  try {
    const command = new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@example.com',
      Destination: { ToAddresses: [admin.email] },
      Message: {
        Subject: { Data: `Weekly Compliance Digest — ${agencyName}`, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlContent, Charset: 'UTF-8' },
          Text: {
            Data: `Weekly Compliance Digest for ${agencyName}\n\nCompliance Rate: ${summary.complianceRate.toFixed(1)}%\nTotal: ${summary.total} | Valid: ${summary.valid} | Expiring: ${summary.expiringSoon} | Expired: ${summary.expired}`,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    console.error('Error sending weekly compliance digest:', error);
    return false;
  }
}
