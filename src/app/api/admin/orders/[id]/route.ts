import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/orders/[id] - Get a specific order by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fix the "params should be awaited" error
    const { id } = await Promise.resolve(params);

    // Get order with related data
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        downloads: true,
      },
    });

    // Return 404 if order not found
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error(`Error fetching order:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// POST /api/admin/orders/[id]/send-email - Resend download links email
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fix the "params should be awaited" error
    const { id } = await Promise.resolve(params);

    // Get order with related data
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        downloads: true,
      },
    });

    // Return 404 if order not found
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Import the email service
    const { sendOrderConfirmationEmail } = await import('@/lib/email');

    // Prepare download information for the email
    const downloadInfo = order.downloads.map((download: { downloadToken: string; productId: string }) => {
      const product = order.orderItems.find(
        (item: { productId: string }) => item.productId === download.productId
      )?.product;
      
      return {
        downloadToken: download.downloadToken,
        productId: download.productId,
        productTitle: product?.title || 'Digital Product',
      };
    });

    // Send the email
    await sendOrderConfirmationEmail(
      {
        id: order.id,
        customerEmail: order.customerEmail,
        totalAmount: Number(order.totalAmount),
        orderItems: order.orderItems.map((item: { id: string; productId: string; price: unknown; product: { title: string } }) => ({
          id: item.id,
          productId: item.productId,
          price: Number(item.price),
          product: {
            title: item.product.title
          }
        })),
      },
      downloadInfo
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error sending email:`, error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
