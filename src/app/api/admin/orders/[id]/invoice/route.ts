import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/orders/[id]/invoice - Generate an invoice for an order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get order with related data
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Return 404 if order not found
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Format date
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Format price
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price);
    };

    // Generate invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${order.id.substring(0, 8)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .invoice-details div {
            flex: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f8f9fa;
          }
          .text-right {
            text-align: right;
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f7ff;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
              max-width: 100%;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>INVOICE</h1>
          <p>Digital Marketplace</p>
        </div>
        
        <div class="invoice-details">
          <div>
            <h3>Bill To:</h3>
            <p>${order.customerEmail}</p>
          </div>
          <div>
            <h3>Invoice Details:</h3>
            <p><strong>Invoice #:</strong> ${order.id.substring(0, 8)}</p>
            <p><strong>Date:</strong> ${formatDate(new Date(order.createdAt))}</p>
            <p><strong>Payment ID:</strong> ${order.stripePaymentId}</p>
            <p><strong>Status:</strong> ${order.status}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th class="text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.orderItems.map((item: { product: { title: string }, price: unknown }) => `
              <tr>
                <td>${item.product.title}</td>
                <td>Digital Product</td>
                <td class="text-right">${formatPrice(Number(item.price))}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">Total</td>
              <td class="text-right">${formatPrice(Number(order.totalAmount))}</td>
            </tr>
          </tbody>
        </table>
        
        <div>
          <h3>Notes:</h3>
          <p>Thank you for your purchase! If you have any questions about this invoice, please contact our support team.</p>
          <p>All digital products are delivered electronically. Please check your email for download instructions.</p>
        </div>
        
        <div class="footer">
          <p>Digital Marketplace &copy; ${new Date().getFullYear()}</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print Invoice
          </button>
        </div>
      </body>
      </html>
    `;

    // Return the invoice HTML
    return new NextResponse(invoiceHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error(`Error generating invoice:`, error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
