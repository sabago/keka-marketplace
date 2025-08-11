import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { CartItem } from '@/lib/useCart';
// Email sending is now handled by the webhook

// Define Product type
interface Product {
  id: string;
  title: string;
  description: string;
  price: number | bigint | string;
  thumbnail: string;
  filePath?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function POST(request: Request) {
  try {
    const { items, customerEmail } = await request.json();
    
    // Validate the request
    if (!items || !items.length) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      );
    }
    
    // Simple approach: use cart items directly (they already have discounted prices)
    const lineItems = items.map((item: CartItem) => ({
      id: item.id,
      title: item.title,
      description: '', // We'll get this from database if needed
      price: Number(item.price), // Cart already has discounted price
      thumbnail: item.thumbnail,
      quantity: item.quantity || 1
    }));
    
    console.log('Creating checkout session with line items:', JSON.stringify(lineItems));
    const session = await createCheckoutSession(lineItems, customerEmail);
    
    // For development: Create a test order in the database
    // In production, this would be handled by the webhook
    if (process.env.NODE_ENV === 'development') {
      try {
        // Check if an order with this session ID already exists
        const existingOrder = await prisma.order.findFirst({
          where: {
            stripePaymentId: session.id,
          },
        });
        
        if (existingOrder) {
          console.log(`Order already exists for session ${session.id}, skipping creation`);
        } else {
          // Calculate total amount
          const totalAmount = lineItems.reduce((sum: number, item: Product & { quantity: number }) => 
            sum + Number(item.price) * item.quantity, 0);
          
          // Create order
          const order = await prisma.order.create({
            data: {
              customerEmail,
              totalAmount,
              stripePaymentId: session.id,
              status: 'PAID',
              orderItems: {
                create: lineItems.map((item: Product & { quantity: number }) => ({
                  productId: item.id,
                  price: Number(item.price),
                })),
              },
            },
            include: {
              orderItems: true,
            },
          });
          
          // Create download tokens - this is now just for creating the test order
          // The actual email with download links will be sent by the webhook
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
          
          await Promise.all(
            order.orderItems.map((item: { id: string; productId: string }) => {
              // Generate a random token
              const token = Buffer.from(Math.random().toString(36)).toString('hex');
              
              return prisma.download.create({
                data: {
                  orderId: order.id,
                  productId: item.productId,
                  downloadToken: token,
                  downloadCount: 0,
                  expiresAt,
                },
              });
            })
          );
          
          console.log(`Created test order ${order.id} for session ${session.id}`);
          console.log(`No email sent yet. Email will be sent by webhook after payment is completed.`);
        }
      } catch (err) {
        console.error('Error creating test order:', err);
        // Continue even if test order creation fails
      }
    }
    
    // Return the checkout URL with headers to ensure it's opened at the top level
    return NextResponse.json(
      { url: session.url },
      { 
        headers: {
          'Content-Type': 'application/json',
          'X-Frame-Options': 'DENY', // Prevent embedding in iframes
        }
      }
    );
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
