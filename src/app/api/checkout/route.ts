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
  price: unknown;
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
    
    // Convert prices to numbers for Stripe
    const lineItemsWithNumberPrices = lineItems.map((item: Product & { quantity: number }) => ({
      ...item,
      price: Number(item.price)
    }));
    
    // Create a Stripe checkout session
    // Make sure lineItemsWithNumberPrices is not empty
    if (!lineItemsWithNumberPrices.length) {
      return NextResponse.json(
        { error: 'No valid items in cart' },
        { status: 400 }
      );
    }
    
    console.log('Creating checkout session with line items:', JSON.stringify(lineItemsWithNumberPrices));
    const session = await createCheckoutSession(lineItemsWithNumberPrices, customerEmail);
    
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
          // Create a map of product IDs to titles for easy lookup
          const productTitlesMap: Record<string, string> = {};
          products.forEach((product: Product) => {
            productTitlesMap[product.id] = product.title;
          });

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
              orderItems: order.orderItems.map((item: { id: string; productId: string; price: unknown }) => ({
                id: item.id,
                productId: item.productId,
                price: Number(item.price),
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
