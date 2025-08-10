import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Create test order data
    const testOrder = {
      id: 'test-order-' + Date.now(),
      customerEmail: email,
      totalAmount: 99.99,
      orderItems: [
        {
          id: 'test-item-1',
          productId: 'test-product-1',
          price: 99.99,
          product: {
            title: 'Test Digital Product'
          }
        }
      ]
    };

    const testDownloads = [
      {
        downloadToken: 'test-token-' + Date.now(),
        productId: 'test-product-1',
        productTitle: 'Test Digital Product'
      }
    ];

    console.log('Attempting to send test email to:', email);
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL,
      ACCESS_KEY_ID: process.env.ACCESS_KEY_ID ? 'Present' : 'Missing',
      SECRET_ACCESS_KEY: process.env.SECRET_ACCESS_KEY ? 'Present' : 'Missing',
      SES_REGION: process.env.SES_REGION,
      AWS_REGION: process.env.AWS_REGION
    });

    const result = await sendOrderConfirmationEmail(testOrder, testDownloads);
    
    if (result) {
      console.log('Test email sent successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully',
        orderId: testOrder.id
      });
    } else {
      console.log('Test email failed to send');
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send test email'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
