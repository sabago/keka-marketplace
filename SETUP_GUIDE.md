# Complete Setup Guide - Step by Step

## Prerequisites Checklist

- [ ] Node.js v18+ installed (`node --version`)
- [ ] PostgreSQL installed and running
- [ ] Git repository cloned
- [ ] Terminal/command line access

---

## Step 1: Database Setup (5 minutes)

### Option A: Use Local PostgreSQL (Recommended for Development)

```bash
# 1. Install PostgreSQL (if not installed)
# macOS:
brew install postgresql@14
brew services start postgresql@14

# Windows: Download from https://www.postgresql.org/download/
# Linux: sudo apt-get install postgresql

# 2. Create database
createdb keka_dev

# 3. Update .env file
cd /Users/sandraabago/keka/marketplace
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keka_dev"' > .env.local
```

### Option B: Use Railway (Production)

```bash
# 1. Go to Railway dashboard: https://railway.app
# 2. Click on your database service
# 3. Go to "Connect" tab
# 4. Copy the "Postgres Connection URL" (PUBLIC URL, not internal)
# 5. Should look like: postgresql://postgres:password@monorail.proxy.rlwy.net:12345/railway

# 6. Add to .env.local
echo 'DATABASE_URL="<paste-railway-url-here>"' >> .env.local
```

---

## Step 2: Run Prisma Migration (2 minutes)

```bash
cd /Users/sandraabago/keka/marketplace

# Generate Prisma Client and run migration
npx prisma migrate dev --name add_subscription_platform

# This will:
# ✅ Create all database tables (Agency, User, ChatbotQuery, etc.)
# ✅ Generate TypeScript types
# ✅ Fix all TypeScript errors

# Verify it worked
npx prisma studio
# This opens a GUI to view your database - should see all new tables
```

**Expected Output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
✔ The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20250119123456_add_subscription_platform/
    └─ migration.sql

Your database is now in sync with your schema.
```

---

## Step 3: Generate Encryption Key (1 minute)

```bash
# Generate a secure 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output (64-character hex string)
# Example: 8f7d3e2a1b4c5f6e9d8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e

# Add to .env.local
echo 'ENCRYPTION_KEY="<paste-key-here>"' >> .env.local
```

---

## Step 4: Generate NextAuth Secret (1 minute)

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Copy the output
# Example: ennFep9sMSXXBzEVs1r19YgYGQf2xBUot9fmxhMTDhE=

# Add to .env.local
cat >> .env.local << 'EOF'
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<paste-secret-here>"
NEXTAUTH_URL_INTERNAL="http://localhost:3000"
EOF
```

---

## Step 5: Set Up Stripe (10 minutes)

### 5.1 Get Stripe Account
```bash
# 1. Sign up at https://stripe.com (if you don't have an account)
# 2. Complete business verification (can skip for test mode)
# 3. Go to Dashboard: https://dashboard.stripe.com/test/apikeys
```

### 5.2 Get API Keys
```bash
# In Stripe Dashboard → Developers → API keys:
# Copy "Secret key" (starts with sk_test_...)

# Add to .env.local
echo 'STRIPE_SECRET_KEY="sk_test_..."' >> .env.local
```

### 5.3 Create Subscription Products
```bash
cd /Users/sandraabago/keka/marketplace

# Run the setup script
npx tsx src/scripts/setup-stripe-products.ts

# This creates 3 products in Stripe:
# - PRO Plan ($49/month)
# - BUSINESS Plan ($99/month)
# - ENTERPRISE Plan ($299/month)

# The script will output something like:
# ✅ Stripe products created:
# PRO: price_1Abc123...
# BUSINESS: price_1Def456...
# ENTERPRISE: price_1Ghi789...
```

### 5.4 Add Price IDs to .env
```bash
# Copy the price IDs from the script output above

cat >> .env.local << 'EOF'
STRIPE_PRICE_PRO="price_1Abc123..."
STRIPE_PRICE_BUSINESS="price_1Def456..."
STRIPE_PRICE_ENTERPRISE="price_1Ghi789..."
EOF
```

### 5.5 Set Up Webhook (for production)
```bash
# 1. In Stripe Dashboard → Developers → Webhooks
# 2. Click "Add endpoint"
# 3. Endpoint URL: https://yourdomain.com/api/webhook
# 4. Select events:
#    - customer.subscription.created
#    - customer.subscription.updated
#    - customer.subscription.deleted
#    - invoice.payment_succeeded
#    - invoice.payment_failed
# 5. Copy "Signing secret" (starts with whsec_...)

echo 'STRIPE_WEBHOOK_SECRET="whsec_..."' >> .env.local
```

**For local testing**, use Stripe CLI:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhook

# Copy the webhook signing secret it gives you
echo 'STRIPE_WEBHOOK_SECRET="whsec_..."' >> .env.local
```

---

## Step 6: Set Up OpenAI (5 minutes)

```bash
# 1. Go to https://platform.openai.com
# 2. Sign up or log in
# 3. Go to API keys: https://platform.openai.com/api-keys
# 4. Click "Create new secret key"
# 5. Copy the key (starts with sk-...)

# Add to .env.local
echo 'OPENAI_API_KEY="sk-..."' >> .env.local

# 6. Add payment method (required for API access)
#    Go to: https://platform.openai.com/account/billing
#    Add credit card or prepaid credits ($5-10 is fine for testing)
```

---

## Step 7: Set Up Pinecone (Vector Database) (5 minutes)

```bash
# 1. Go to https://www.pinecone.io
# 2. Sign up (free tier available)
# 3. Create a new project (if prompted)
# 4. Go to "API Keys": https://app.pinecone.io/organizations/-/projects/-/keys
# 5. Copy your API key

# Add to .env.local
echo 'PINECONE_API_KEY="pcsk_..."' >> .env.local

# 6. Create an index:
#    - Click "Create Index"
#    - Name: ma-referrals
#    - Dimensions: 3072
#    - Metric: cosine
#    - Cloud: AWS (or GCP, doesn't matter)
#    - Region: us-east-1 (or closest to you)
#    - Click "Create Index"
```

**Alternative: Create via API**
```bash
curl -X POST "https://api.pinecone.io/indexes" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ma-referrals",
    "dimension": 3072,
    "metric": "cosine",
    "spec": {
      "serverless": {
        "cloud": "aws",
        "region": "us-east-1"
      }
    }
  }'
```

---

## Step 8: Set Up Upstash Redis (Optional but Recommended) (5 minutes)

**This enables query caching (30-50% cost savings on OpenAI API).**

```bash
# 1. Go to https://console.upstash.com
# 2. Sign up (free tier available)
# 3. Click "Create Database"
#    - Name: keka-cache
#    - Type: Regional
#    - Region: us-east-1 (or closest)
#    - Click "Create"

# 4. Click on your database
# 5. Copy "UPSTASH_REDIS_REST_URL" and "UPSTASH_REDIS_REST_TOKEN"

# Add to .env.local
cat >> .env.local << 'EOF'
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXX..."
EOF
```

**Skip this if you want to test without caching first** (chatbot will still work, just slower and more expensive).

---

## Step 9: Generate Embeddings (RAG Chatbot) (5 minutes)

**This processes all 125 MA referral articles and uploads them to Pinecone.**

```bash
cd /Users/sandraabago/keka/marketplace

# Run the embedding generation script
npx tsx src/scripts/generate-embeddings.ts

# Expected output:
# Found 125 articles to process...
# ✓ Embedded: brigham-and-womens-hospital chunk 1/3
# ✓ Embedded: brigham-and-womens-hospital chunk 2/3
# ...
# 🎉 Embedding generation complete!
# Total cost: ~$0.06
```

**This takes ~2-5 minutes and costs about $0.06 in OpenAI API credits.**

**Troubleshooting:**
```bash
# If you get "Index not found" error:
# - Verify index name is exactly "ma-referrals" in Pinecone dashboard
# - Wait 1-2 minutes after creating index (initialization time)

# If you get OpenAI rate limit:
# - You need to add payment method at https://platform.openai.com/account/billing
```

---

## Step 10: Create Test Data (2 minutes)

```bash
# Create test agencies and users
npx tsx src/scripts/seed-agencies.ts

# Creates 2 test agencies:
# 1. Sunshine Home Health Agency (FREE plan)
# 2. Metro Care Services (PRO plan)

# Create test user account
npx tsx src/scripts/create-test-user.ts

# Creates:
# - test@example.com / password123 (Agency Admin)
# - admin@example.com / admin123 (Platform Admin)
```

---

## Step 11: Start Development Server (1 minute)

```bash
cd /Users/sandraabago/keka/marketplace

# Install dependencies (if not already done)
npm install

# Start the server
npm run dev

# Server starts at: http://localhost:3000
```

---

## Step 12: Test the Application (10 minutes)

### Test 1: User Registration Flow
```
1. Go to http://localhost:3000/auth/signup
2. Create account with:
   - Name: John Doe
   - Email: john@test.com
   - Password: Test123!@#
3. Should redirect to /onboarding
4. Complete 5-step onboarding wizard
5. Should redirect to /dashboard?welcome=true
```

### Test 2: Pricing & Subscription
```
1. Go to http://localhost:3000/pricing
2. Click "Start 14-Day Trial" on PRO plan
3. Should redirect to Stripe Checkout
4. Use test card: 4242 4242 4242 4242, any future date, any CVC
5. Complete checkout
6. Should redirect to /dashboard?subscription=success
```

### Test 3: AI Chatbot
```
1. On dashboard, click floating chat button (bottom-right)
2. Type: "Which hospitals in Boston have online portals?"
3. Should get response citing Mass General, Brigham, etc.
4. Click source links - should open article pages
5. Try another query: "Show me free referral sources"
```

### Test 4: Referral Tracking
```
1. Go to /dashboard/referrals
2. Click "Log New Referral"
3. Select a referral source
4. Choose submission method
5. Click "Log Referral"
6. Should appear in table
7. Click "Export CSV" - should download file
```

### Test 5: Query Limits
```
1. If on FREE plan (10 queries), ask 11 chatbot questions
2. 11th query should show upgrade prompt
3. Click "Upgrade" - should go to /pricing
```

---

## Complete .env.local File

Here's what your complete `.env.local` should look like:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keka_dev"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ennFep9sMSXXBzEVs1r19YgYGQf2xBUot9fmxhMTDhE="
NEXTAUTH_URL_INTERNAL="http://localhost:3000"

# Encryption
ENCRYPTION_KEY="8f7d3e2a1b4c5f6e9d8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_BUSINESS="price_..."
STRIPE_PRICE_ENTERPRISE="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Pinecone
PINECONE_API_KEY="pcsk_..."

# Upstash Redis (optional)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXX..."

# Site
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## Troubleshooting

### Issue: Prisma migration fails with "can't reach database"
**Solution:**
```bash
# Test database connection
psql -d $DATABASE_URL
# If this fails, your DATABASE_URL is wrong

# For local PostgreSQL:
pg_isready  # Should say "accepting connections"
createdb keka_dev  # Create database if it doesn't exist
```

### Issue: TypeScript errors about missing Prisma types
**Solution:**
```bash
npx prisma generate  # Regenerate Prisma Client
npm run build  # Rebuild TypeScript
```

### Issue: OpenAI API returns 429 (rate limit)
**Solution:**
```bash
# You need to add a payment method:
# Go to https://platform.openai.com/account/billing
# Add credit card or buy prepaid credits ($10 is plenty)
```

### Issue: Pinecone says "Index not found"
**Solution:**
```bash
# Verify index name is EXACTLY "ma-referrals"
# Wait 1-2 minutes after creating (initialization time)
# Check index status at https://app.pinecone.io
```

### Issue: Stripe webhook not working locally
**Solution:**
```bash
# Use Stripe CLI for local testing:
stripe listen --forward-to localhost:3000/api/webhook

# Copy the webhook signing secret it gives you
# Add to .env.local: STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Issue: Build fails with WebAssembly error
**Solution:**
```bash
# Node.js v16-18 have issues with Prisma
# Use Node.js v20+:
nvm install 20
nvm use 20
npm install
```

---

## Verification Checklist

After setup, verify everything works:

- [ ] Database connected (can run `npx prisma studio`)
- [ ] NextAuth working (can sign up and sign in)
- [ ] Stripe checkout working (can create test subscription)
- [ ] Embeddings generated (125 articles in Pinecone)
- [ ] Chatbot responding (answers questions correctly)
- [ ] Query limits enforced (can't exceed plan limits)
- [ ] Dashboard displaying usage stats
- [ ] Referral tracking working
- [ ] Settings page working

---

## Next Steps: Production Deployment

Once everything works locally:

1. **Update Next.js** (CRITICAL security fix):
   ```bash
   npm install next@15.5.6
   npm run build
   ```

2. **Deploy to Vercel** (recommended):
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel

   # Add environment variables in Vercel dashboard
   # Update NEXTAUTH_URL to your production domain
   ```

3. **Configure Stripe webhook** for production URL

4. **Set up monitoring** (Sentry, LogRocket, etc.)

5. **Test end-to-end** in production

---

## Cost Summary

**One-time:**
- Embeddings: $0.06

**Monthly (at 10k queries):**
- Pinecone: $70
- OpenAI API: $200
- Vercel: $20
- Neon/Railway: $20
- Upstash: $0-10
- **Total: ~$310/month**

**Revenue (100 agencies):**
- $8,400/month MRR
- **Net profit: $8,090/month (96% margin)**

---

## Support

If you get stuck:
1. Check the documentation files in `/Users/sandraabago/keka/marketplace/`
2. Check error logs: `npm run dev` shows errors in terminal
3. Use Prisma Studio to inspect database: `npx prisma studio`
4. Check Stripe dashboard for payment issues
5. Check OpenAI dashboard for API usage/errors

**All systems are GO!** 🚀
