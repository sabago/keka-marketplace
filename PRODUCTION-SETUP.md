# Production Setup Guide

This document outlines the steps needed to prepare your digital marketplace for production deployment.

## AWS S3 Configuration

### 1. IAM User Permissions

Apply the following policy to your IAM user (`keka-marketplace`):

```json
// s3-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::keka-marketplace-s3",
        "arn:aws:s3:::keka-marketplace-s3/*"
      ]
    }
  ]
}
```

To apply this policy:
1. Go to the AWS IAM console
2. Select the user `keka-marketplace`
3. Click "Add permissions" > "Create inline policy"
4. Select the JSON tab and paste the policy above
5. Click "Review policy", give it a name (e.g., "S3AccessPolicy"), and click "Create policy"

### 2. S3 Bucket CORS Configuration

Configure CORS for your S3 bucket to allow requests from your domain:

```json
// s3-cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

To apply this configuration:
1. Go to the AWS S3 console
2. Select your bucket `keka-marketplace-s3`
3. Click on the "Permissions" tab
4. Scroll down to the "Cross-origin resource sharing (CORS)" section
5. Click "Edit" and paste the configuration above
6. Click "Save changes"

## AWS SES Configuration

### 1. Verify Your Domain

1. Go to the AWS SES console
2. Click on "Verified identities" in the left sidebar
3. Click "Create identity"
4. Select "Domain" and enter your domain name
5. Follow the instructions to add the required DNS records to your domain

### 2. Request Production Access

By default, your SES account will be in the sandbox mode, which limits you to sending emails only to verified email addresses. To send emails to any recipient:

1. Go to the AWS SES console
2. Click on "Account dashboard" in the left sidebar
3. Under "Sending statistics", click "Request production access"
4. Fill out the form with your use case details
5. Submit the request and wait for approval (usually takes 1-2 business days)

### 3. IAM Permissions for SES

Ensure your IAM user has the following permissions for SES:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

You can add these permissions to the same policy as your S3 permissions or create a separate policy.

### 4. Email Service Implementation

The application includes a robust email service that:

- Uses AWS SES in production mode
- Provides a development fallback that logs emails to the console
- Sends beautiful HTML emails with order details and download links
- Handles errors gracefully

In development mode, emails are not actually sent but are logged to the console for debugging purposes. This allows you to test the complete checkout flow without needing to configure SES.

In production, make sure to set:
- `NODE_ENV=production` to enable actual email sending
- `SES_SENDER_EMAIL` to your verified sender email address

## Environment Variables

Update your production environment variables:

```
# Database
DATABASE_URL="your-production-database-url"

# AWS S3
ACCESS_KEY_ID="your-production-access-key"
SECRET_ACCESS_KEY="your-production-secret-key"
REGION="us-east-1"
S3_BUCKET_NAME="keka-marketplace-s3"

# AWS SES (Email)
SES_SENDER_EMAIL="contact@yourdomain.com"

# Stripe
STRIPE_SECRET_KEY="your-production-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-production-webhook-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-production-publishable-key"

# App
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
```

## Stripe Webhook Configuration

1. Go to the Stripe Dashboard
2. Navigate to Developers > Webhooks
3. Click "Add endpoint"
4. Enter your webhook URL: `https://yourdomain.com/api/webhook`
5. Select the events to listen for:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
6. Click "Add endpoint"
7. Copy the "Signing secret" and update your `STRIPE_WEBHOOK_SECRET` environment variable

## Next.js Configuration for S3 Images

Ensure your `next.config.ts` file includes the S3 bucket hostname in the images configuration:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['placehold.co', 'keka-marketplace-s3.s3.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'keka-marketplace-s3.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

This configuration allows Next.js to optimize and serve images from your S3 bucket.

## Deployment Checklist

- [ ] Database is properly configured and accessible
- [ ] AWS S3 bucket is configured with proper permissions and CORS settings
- [ ] Next.js is configured to serve images from S3
- [ ] AWS SES is verified and out of sandbox mode
- [ ] Stripe webhooks are configured for the production domain
- [ ] All environment variables are set in the production environment
- [ ] SSL certificate is installed and working
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Build the application: `npm run build`
- [ ] Test the entire purchase flow in production
