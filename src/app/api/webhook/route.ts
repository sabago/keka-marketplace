import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { constructWebhookEvent } from '@/lib/stripe';
import { sendOrderConfirmationEmail } from '@/lib/email';

/* eslint-disable @typescript-eslint/no-explicit-any */
// POST /api/webhook - Handle Stripe webhook events
export async function POST(request: Request) {
  try {
    // Get the request body as raw bytes (important for signature verification)
    const body = await request.arrayBuffer();
    const payload = Buffer.from(body);
    
    // Get the Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');
    
    console.log('Webhook received:', {
      hasSignature: !!signature,
      payloadLength: payload.length,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Present' : 'Missing'
    });
    
    if (!signature) {
      console.error('Missing Stripe signature in webhook request');
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    const event = constructWebhookEvent(payload.toString(), signature);
    console.log('Webhook signature verified successfully, event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        try {
          // Check if an order with this session ID already exists
          const existingOrder = await prisma.order.findFirst({
            where: {
              stripePaymentId: session.id,
            },
          });
          
          if (existingOrder) {
            console.log(`Order already exists for session ${session.id}, skipping creation`);
            return NextResponse.json({ received: true, status: 'Order already exists' });
          }
          
          // Get product IDs from metadata
          const productIds = session.metadata?.productIds?.split(',') || [];
          
          if (!productIds.length) {
            console.error('No product IDs found in session metadata');
            return NextResponse.json({ 
              received: true, 
              error: 'No product IDs found in session metadata' 
            });
          }

          // Get customer email
          const customerEmail = session.customer_email;
          
          if (!customerEmail) {
            console.error('No customer email found in session');
            return NextResponse.json({ 
              received: true, 
              error: 'No customer email found in session' 
            });
          }

          // Get products
          const products = await prisma.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
          });
          
          if (!products.length) {
            console.error('No products found for the given product IDs');
            return NextResponse.json({ 
              received: true, 
              error: 'No products found for the given product IDs' 
            });
          }

          // Calculate total amount
          const totalAmount = products.reduce((sum: number, product: { price: any; }) => sum + Number(product.price), 0);

          // Create order
          const order = await prisma.order.create({
            data: {
              customerEmail,
              totalAmount,
              stripePaymentId: session.id,
              status: 'PAID',
              orderItems: {
                create: products.map((product: { id: any; price: any; }) => ({
                  productId: product.id,
                  price: Number(product.price),
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
            order.orderItems.map((item: { productId: any; }) => {
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

          // Send order confirmation email with download links
          try {
            // Create a map of product IDs to titles for easy lookup
            const productTitlesMap = products.reduce((map: Record<string, string>, product: any) => {
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
                orderItems: order.orderItems.map((item: any) => ({
                  ...item,
                  product: {
                    title: productTitlesMap[item.productId] || 'Digital Product'
                  }
                }))
              },
              downloadInfo
            );
            
            console.log(`Order confirmation email sent to ${customerEmail}`);
          } catch (emailError) {
            console.error('Failed to send order confirmation email:', emailError);
            // Continue processing even if email fails
          }
          
          console.log(`Successfully created order ${order.id} for session ${session.id}`);
        } catch (orderError) {
          console.error('Error processing checkout.session.completed event:', orderError);
          // Return success to Stripe to prevent retries, but log the error
          return NextResponse.json({ 
            received: true, 
            error: orderError instanceof Error ? orderError.message : 'Unknown error processing order'
          });
        }
        
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
