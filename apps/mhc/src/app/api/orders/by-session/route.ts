import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCheckoutSession } from '@/lib/stripe';
import { sendOrderConfirmationEmail } from '@/lib/email';

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

    // In development mode, send the email for existing orders too
    if (order && process.env.NODE_ENV === 'development') {
      try {
        // Get products for the order items
        const productIds = order.orderItems.map(item => item.productId);
        const products = await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
        });

        // Create a map of product IDs to titles for easy lookup
        const productTitlesMap = products.reduce<Record<string, string>>((map, product) => {
          map[product.id] = product.title;
          return map;
        }, {});

        // Prepare download information for the email
        const downloadInfo = order.downloads.map(download => ({
          downloadToken: download.downloadToken,
          productId: download.productId,
          productTitle: productTitlesMap[download.productId] || 'Digital Product'
        }));

        // Send the email
        await sendOrderConfirmationEmail(
          {
            id: order.id,
            customerEmail: order.customerEmail,
            totalAmount: Number(order.totalAmount),
            orderItems: order.orderItems.map(item => ({
              id: item.id,
              productId: item.productId,
              price: Number(item.price),
              product: {
                title: item.product?.title || productTitlesMap[item.productId] || 'Digital Product'
              }
            }))
          },
          downloadInfo
        );
        
        console.log(`Development mode: Order confirmation email logged for ${order.customerEmail}`);
      } catch (emailError) {
        console.error('Failed to send development mode email for existing order:', emailError);
        // Continue processing even if email fails
      }
    }
    
    // If order is not found, it might be because the webhook hasn't processed yet
    // In development mode or if force_create is true, create a test order
    if (!order && (process.env.NODE_ENV === 'development' || forceCreate)) {
      console.log('Order not found, creating test order for development mode');
      
      try {
        // Check if an order with this session ID already exists (double-check to prevent duplicates)
        const existingOrder = await prisma.order.findFirst({
          where: {
            stripePaymentId: sessionId,
          },
        });
        
        if (existingOrder) {
          console.log('Found existing order on second check, returning it');
          // If we found an order on the second check, fetch it with all the details
          const completeOrder = await prisma.order.findUnique({
            where: {
              id: existingOrder.id,
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
          
          if (completeOrder) {
            return NextResponse.json(completeOrder);
          }
        }
        
        // Get product IDs from session metadata
        const productIds = session.metadata?.productIds?.split(',') || [];
        
        if (productIds.length === 0) {
          return NextResponse.json(
            { error: 'No product IDs found in session metadata' },
            { status: 400 }
          );
        }
        
        // Get products
        const products = await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
        });
        
        if (products.length === 0) {
          return NextResponse.json(
            { error: 'No products found for the given product IDs' },
            { status: 404 }
          );
        }
        
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
        
        // In development mode, send the email directly since the webhook might not be triggered
        if (process.env.NODE_ENV === 'development') {
          try {
            // Create a map of product IDs to titles for easy lookup
            const productTitlesMap = products.reduce<Record<string, string>>((map, product) => {
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
                id: newOrder.id,
                customerEmail: newOrder.customerEmail,
                totalAmount: Number(newOrder.totalAmount),
                orderItems: newOrder.orderItems.map(item => ({
                  id: item.id,
                  productId: item.productId,
                  price: Number(item.price),
                  product: {
                    title: item.product?.title || productTitlesMap[item.productId] || 'Digital Product'
                  }
                }))
              },
              downloadInfo
            );
            
            console.log(`Development mode: Order confirmation email logged for ${newOrder.customerEmail}`);
          } catch (emailError) {
            console.error('Failed to send development mode email:', emailError);
            // Continue processing even if email fails
          }
        }

        // Return the new order with downloads
        return NextResponse.json({
          ...newOrder,
          downloads: downloads.map(d => ({
            downloadToken: d.downloadToken,
            productId: d.productId,
          })),
        });
      } catch (error) {
        console.error('Error creating test order:', error);
        return NextResponse.json(
          { 
            error: 'Failed to create test order', 
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }
    
    if (!order) {
      // Check if the payment was successful in Stripe
      if (session.payment_status === 'paid') {
        return NextResponse.json(
          { 
            error: 'Order not found, but payment was successful. The webhook may still be processing the order. Please try again in a few moments.' 
          },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { 
            error: 'Order not found. The payment may still be processing or was not completed.',
            paymentStatus: session.payment_status
          },
          { status: 404 }
        );
      }
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
