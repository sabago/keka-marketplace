# Digital Products Marketplace

A full-stack application for selling and distributing digital products like PDFs, templates, and guides.

## Tech Stack

- **Frontend**: React, Next.js, TailwindCSS
- **Backend**: Node.js, Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: AWS S3 for digital product storage
- **Payments**: Stripe for payment processing
- **Deployment**: AWS (EC2, RDS, S3)

## Features

- 🛒 Browse and search digital products
- 🔍 Filter products by category
- 💳 Secure checkout with Stripe
- 📥 Secure download links for purchased products
- 📊 Admin dashboard for managing products and orders
- 📱 Responsive design for all devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- AWS account with S3 bucket
- Stripe account

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/marketplace"

# AWS
REGION="us-east-1"
ACCESS_KEY_ID="your-access-key"
SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="your-bucket-name"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/digital-marketplace.git
   cd digital-marketplace
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up the database
   ```
   npx prisma migrate dev
   ```

4. Run the development server
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js app router
│   │   ├── api/           # API routes
│   │   ├── admin/         # Admin pages
│   │   ├── cart/          # Shopping cart
│   │   ├── products/      # Product pages
│   │   └── ...
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── ...
└── ...
```

## API Routes

- `GET /api/products` - Get all products with filtering and pagination
- `POST /api/products` - Create a new product
- `GET /api/products/[id]` - Get a product by ID
- `PUT /api/products/[id]` - Update a product
- `DELETE /api/products/[id]` - Delete a product
- `GET /api/download/[token]` - Download a purchased product
- `POST /api/webhook` - Handle Stripe webhook events

## Deployment

### Database Setup

1. Create a PostgreSQL database on AWS RDS
2. Update the `DATABASE_URL` in your environment variables

### S3 Setup

1. Create an S3 bucket for storing digital products
2. Configure CORS to allow uploads from your domain
3. Set up IAM user with appropriate permissions
4. Update AWS environment variables

### Stripe Setup

1. Create a Stripe account
2. Set up webhook endpoint to `/api/webhook`
3. Update Stripe environment variables

### Application Deployment

1. Build the application
   ```
   npm run build
   ```

2. Deploy to your preferred hosting provider (AWS, Vercel, etc.)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
