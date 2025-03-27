import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCheckoutSession } from '@/lib/stripe';

export async function GET(request: Request) {
  try {
    // Get the session ID from the query parameters
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const forceCreate = url.searchParams.get('force_create') === 'true';
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the session with Stripe
    const session = await getCheckoutSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 404 }
      );
    }
    
    // Find the order in the database
    const order = await prisma.order.findFirst({
      where: {
        stripePaymentId: sessionId,
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                title: true,
              },
            },
          },
        },
        downloads: {
          select: {
            downloadToken: true,
            productId: true,
          },
        },
      },
    });
    
    // If order is not found, it might be because the webhook hasn't processed yet
    // In development mode or if force_create is true, create a test order
    if (!order && (process.env.NODE_ENV === 'development' || forceCreate)) {
      console.log('Order not found, creating test order for development mode');
      
      // Get product IDs from session metadata
      const productIds = session.metadata?.productIds?.split(',') || [];
      
      if (productIds.length > 0) {
        // Get products
        const products = await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
        });
        
        if (products.length > 0) {
          // Calculate total amount
          const totalAmount = products.reduce((sum, product) => sum + Number(product.price), 0);
          
          // Create order
          const newOrder = await prisma.order.create({
            data: {
              customerEmail: session.customer_email || 'test@example.com',
              totalAmount,
              stripePaymentId: sessionId,
              status: 'PAID',
              orderItems: {
                create: products.map((product) => ({
                  productId: product.id,
                  price: Number(product.price),
                })),
              },
            },
            include: {
              orderItems: {
                include: {
                  product: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          });
          
          // Create download tokens
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
          
          const downloads = await Promise.all(
            newOrder.orderItems.map((item) => {
              // Generate a random token
              const token = Buffer.from(Math.random().toString(36)).toString('hex');
              
              return prisma.download.create({
                data: {
                  orderId: newOrder.id,
                  productId: item.productId,
                  downloadToken: token,
                  downloadCount: 0,
                  expiresAt,
                },
              });
            })
          );
          
          // Return the new order with downloads
          return NextResponse.json({
            ...newOrder,
            downloads: downloads.map(d => ({
              downloadToken: d.downloadToken,
              productId: d.productId,
            })),
          });
        }
      }
    }
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found. The payment may still be processing.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order by session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}
