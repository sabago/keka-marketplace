import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCheckoutSession } from '@/lib/stripe';

export async function GET(request: Request) {
  try {
    // Get the session ID from the query parameters
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    
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
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
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
