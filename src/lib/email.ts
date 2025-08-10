import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
  },
});

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
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/api/download/${download.downloadToken}" class="download-link">Download</a>
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
  const textContent = `Thank you for your purchase! Order ID: ${order.id.substring(0, 8)}. Total: ${formattedTotal}. Your downloads are available at: ${downloads.map(d => `${process.env.NEXT_PUBLIC_SITE_URL}/api/download/${d.downloadToken}`).join(', ')}. Download links will expire in 30 days.`;

  // Send the email using AWS SES directly
  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_SENDER_EMAIL || 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [order.customerEmail],
      },
      Message: {
        Subject: {
          Data: `Your Purchase Receipt - Order #${order.id.substring(0, 8)}`,
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
    console.error('Error sending order confirmation email:', error);
    return false;
  }
}
