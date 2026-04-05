import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { constructWebhookEvent } from '@/lib/stripe';
import { sendOrderConfirmationEmail } from '@/lib/email';
import {
  updateSubscriptionFromStripe,
  downgradeToFree,
  resetQueryCount,
  getPlanTypeFromPriceId,
  getPlanAndSizeFromPriceId,
} from '@/lib/subscriptionHelpers';
import { SubscriptionStatus, PlanType } from '@prisma/client';

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

          // Use the actual amount paid from Stripe (includes any discounts)
          const totalAmount = session.amount_total ? session.amount_total / 100 : 0; // Convert from cents to dollars

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

      // ============================================================
      // SUBSCRIPTION EVENTS
      // ============================================================

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const agencyId = subscription.metadata?.agencyId;

        if (!agencyId) {
          console.error('No agencyId found in subscription metadata');
          return NextResponse.json({
            received: true,
            error: 'No agencyId found in subscription metadata'
          });
        }

        try {
          // Get plan type and size from price ID
          const priceId = subscription.items.data[0]?.price.id;
          const planInfo = getPlanAndSizeFromPriceId(priceId);
          const planType = planInfo?.planType || getPlanTypeFromPriceId(priceId);

          if (!planType) {
            console.error(`Unknown price ID: ${priceId}`);
            return NextResponse.json({
              received: true,
              error: 'Unknown price ID'
            });
          }

          // Determine subscription status
          let status = SubscriptionStatus.ACTIVE;
          if (subscription.status === 'trialing') {
            status = SubscriptionStatus.TRIAL;
          } else if (subscription.status === 'incomplete') {
            status = SubscriptionStatus.INCOMPLETE;
          }

          // Update agency with subscription details
          await updateSubscriptionFromStripe(agencyId, {
            planType,
            status,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            billingPeriodStart: new Date(subscription.current_period_start * 1000),
            billingPeriodEnd: new Date(subscription.current_period_end * 1000),
            ...(planInfo?.agencySize && { agencySize: planInfo.agencySize }),
          });

          // Reset query count for new billing period
          await resetQueryCount(agencyId);

          console.log(`✅ Subscription created for agency ${agencyId}: ${planType} plan`);
        } catch (error) {
          console.error('Error processing subscription.created event:', error);
          return NextResponse.json({
            received: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const agencyId = subscription.metadata?.agencyId;

        if (!agencyId) {
          console.error('No agencyId found in subscription metadata');
          return NextResponse.json({
            received: true,
            error: 'No agencyId found in subscription metadata'
          });
        }

        try {
          // Get plan type and size from price ID
          const priceId = subscription.items.data[0]?.price.id;
          const planInfo = getPlanAndSizeFromPriceId(priceId);
          const planType = planInfo?.planType || getPlanTypeFromPriceId(priceId);

          if (!planType) {
            console.error(`Unknown price ID: ${priceId}`);
            return NextResponse.json({
              received: true,
              error: 'Unknown price ID'
            });
          }

          // Map Stripe status to our status
          let status = SubscriptionStatus.ACTIVE;
          if (subscription.status === 'trialing') {
            status = SubscriptionStatus.TRIAL;
          } else if (subscription.status === 'past_due') {
            status = SubscriptionStatus.PAST_DUE;
          } else if (subscription.status === 'canceled') {
            status = SubscriptionStatus.CANCELED;
          } else if (subscription.status === 'incomplete') {
            status = SubscriptionStatus.INCOMPLETE;
          }

          // Update agency subscription
          await updateSubscriptionFromStripe(agencyId, {
            planType,
            status,
            billingPeriodStart: new Date(subscription.current_period_start * 1000),
            billingPeriodEnd: new Date(subscription.current_period_end * 1000),
            ...(planInfo?.agencySize && { agencySize: planInfo.agencySize }),
          });

          console.log(`✅ Subscription updated for agency ${agencyId}: ${planType} plan, status: ${status}`);
        } catch (error) {
          console.error('Error processing subscription.updated event:', error);
          return NextResponse.json({
            received: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const agencyId = subscription.metadata?.agencyId;

        if (!agencyId) {
          console.error('No agencyId found in subscription metadata');
          return NextResponse.json({
            received: true,
            error: 'No agencyId found in subscription metadata'
          });
        }

        try {
          // Downgrade to FREE plan when subscription is deleted
          await downgradeToFree(agencyId);
          console.log(`✅ Subscription deleted for agency ${agencyId}, downgraded to FREE`);
        } catch (error) {
          console.error('Error processing subscription.deleted event:', error);
          return NextResponse.json({
            received: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;

        // Get subscription from invoice
        if (!invoice.subscription) {
          console.log('Invoice is not for a subscription, skipping');
          break;
        }

        try {
          // Retrieve the subscription to get metadata
          const subscription = await (async () => {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2025-02-24.acacia',
            });
            return await stripe.subscriptions.retrieve(invoice.subscription);
          })();

          const agencyId = subscription.metadata?.agencyId;

          if (!agencyId) {
            console.error('No agencyId found in subscription metadata');
            break;
          }

          // Reset query count for new billing period
          await resetQueryCount(agencyId);

          // Ensure subscription is marked as ACTIVE
          await updateSubscriptionFromStripe(agencyId, {
            status: SubscriptionStatus.ACTIVE,
            billingPeriodStart: new Date(subscription.current_period_start * 1000),
            billingPeriodEnd: new Date(subscription.current_period_end * 1000),
          });

          console.log(`✅ Payment succeeded for agency ${agencyId}, query count reset`);
        } catch (error) {
          console.error('Error processing invoice.payment_succeeded event:', error);
          return NextResponse.json({
            received: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;

        // Get subscription from invoice
        if (!invoice.subscription) {
          console.log('Invoice is not for a subscription, skipping');
          break;
        }

        try {
          // Retrieve the subscription to get metadata
          const subscription = await (async () => {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2025-02-24.acacia',
            });
            return await stripe.subscriptions.retrieve(invoice.subscription);
          })();

          const agencyId = subscription.metadata?.agencyId;

          if (!agencyId) {
            console.error('No agencyId found in subscription metadata');
            break;
          }

          // Mark subscription as PAST_DUE
          await updateSubscriptionFromStripe(agencyId, {
            status: SubscriptionStatus.PAST_DUE,
          });

          console.log(`❌ Payment failed for agency ${agencyId}, marked as PAST_DUE`);

          // TODO: Send email notification to agency about failed payment
        } catch (error) {
          console.error('Error processing invoice.payment_failed event:', error);
          return NextResponse.json({
            received: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
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
