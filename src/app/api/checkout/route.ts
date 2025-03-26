import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { CartItem } from '@/lib/useCart';
import { sendOrderConfirmationEmail } from '@/lib/email';

// Define Product type
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
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
    
    // Fetch actual products from the database to prevent price manipulation
    const productIds = items.map((item: CartItem) => item.id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    
    // Match cart items with actual products and add quantities
    const lineItems = products.map((product: Product) => {
      const cartItem = items.find((item: CartItem) => item.id === product.id);
      return {
        ...product,
        quantity: cartItem?.quantity || 1
      };
    });
    
    // Create a Stripe checkout session
    const session = await createCheckoutSession(lineItems, customerEmail);
    
    // For development: Create a test order in the database
    // In production, this would be handled by the webhook
    if (process.env.NODE_ENV === 'development') {
      try {
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
        
        // Create download tokens
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
        
        const downloads = await Promise.all(
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
        
        // Send test email in development mode
        try {
          // Create a map of product IDs to titles for easy lookup
          const productTitlesMap = products.reduce((map: Record<string, string>, product: Product) => {
            map[product.id] = product.title;
            return map;
          }, {});

          // Prepare download information for the email
          const downloadInfo = downloads.map(download => ({
            downloadToken: download.downloadToken,
            productId: download.productId,
            productTitle: productTitlesMap[download.productId] || 'Digital Product'
          }));

          // Send the email
          await sendOrderConfirmationEmail(
            {
              id: order.id,
              customerEmail,
              totalAmount,
              orderItems: order.orderItems.map((item: { id: string; productId: string; price: number }) => ({
                ...item,
                product: {
                  title: productTitlesMap[item.productId] || 'Digital Product'
                }
              }))
            },
            downloadInfo
          );
          
          console.log(`Test email sent to ${customerEmail}`);
        } catch (emailError) {
          console.error('Failed to send test email:', emailError);
          // Continue even if email fails
        }
      } catch (err) {
        console.error('Error creating test order:', err);
        // Continue even if test order creation fails
      }
    }
    
    // Return the checkout URL
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
