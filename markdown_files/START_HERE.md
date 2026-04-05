# 🚀 START HERE - Quick Setup (15 minutes)

## Prerequisites

Make sure you have:
- [ ] PostgreSQL installed and running
- [ ] Node.js v18+ installed

---

## Step 1: Database (2 minutes)

```bash
# Create local database
createdb keka_dev

# Add to .env.local
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keka_dev"' > .env.local
```

---

## Step 2: Generate Secrets (1 minute)

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output, add to .env.local: ENCRYPTION_KEY="..."

# Generate NextAuth secret
openssl rand -base64 32
# Copy output, add to .env.local: NEXTAUTH_SECRET="..."

# Add NextAuth URL
echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env.local
```

---

## Step 3: Get API Keys (10 minutes)

### OpenAI (Required for chatbot)
1. Go to https://platform.openai.com/api-keys
2. Create API key
3. Add to .env.local: `OPENAI_API_KEY="sk-..."`
4. Add payment method at https://platform.openai.com/account/billing

### Pinecone (Required for chatbot)
1. Go to https://app.pinecone.io
2. Sign up (free tier)
3. Copy API key
4. Add to .env.local: `PINECONE_API_KEY="pcsk_..."`
5. Create index:
   - Name: `ma-referrals`
   - Dimensions: `3072`
   - Metric: `cosine`

### Stripe (Required for subscriptions)
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy "Secret key"
3. Add to .env.local: `STRIPE_SECRET_KEY="sk_test_..."`

### Upstash Redis (Optional - for caching)
1. Go to https://console.upstash.com
2. Create database
3. Add to .env.local:
   ```
   UPSTASH_REDIS_REST_URL="https://..."
   UPSTASH_REDIS_REST_TOKEN="..."
   ```

---

## Step 4: Run Setup Script (5 minutes)

```bash
cd /Users/sandraabago/keka/marketplace

# Run automated setup
./QUICK_SETUP.sh

# This will:
# ✅ Install dependencies
# ✅ Run database migration
# ✅ Create Stripe products
# ✅ Generate embeddings ($0.06 cost)
# ✅ Create test data
```

**If script fails**, run commands manually:
```bash
npm install
npx prisma migrate dev --name add_subscription_platform
npx tsx src/scripts/setup-stripe-products.ts  # Copy Price IDs to .env.local
npx tsx src/scripts/generate-embeddings.ts
npx tsx src/scripts/create-test-user.ts
```

---

## Step 5: Start Server (1 minute)

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Step 6: Test Everything (5 minutes)

### Test 1: Sign Up
- Go to http://localhost:3000/auth/signup
- Create account
- Complete onboarding wizard
- Should land on dashboard

### Test 2: Chatbot
- Click floating chat button (bottom-right)
- Ask: "Which hospitals in Boston have online portals?"
- Should get AI response with sources

### Test 3: Subscription
- Go to http://localhost:3000/pricing
- Click "Start 14-Day Trial" on PRO
- Use test card: `4242 4242 4242 4242`
- Complete checkout

---

## Your .env.local Should Look Like:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/keka_dev"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<from-step-2>"
ENCRYPTION_KEY="<from-step-2>"

# AI
OPENAI_API_KEY="sk-..."
PINECONE_API_KEY="pcsk_..."

# Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRICE_PRO="price_..."  # From setup script
STRIPE_PRICE_BUSINESS="price_..."  # From setup script
STRIPE_PRICE_ENTERPRISE="price_..."  # From setup script

# Caching (optional)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Site
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

---

## Troubleshooting

**"Can't reach database"**
```bash
pg_isready  # Check if PostgreSQL is running
createdb keka_dev  # Create database
```

**"Prisma type errors"**
```bash
npx prisma generate  # Regenerate types
```

**"OpenAI rate limit"**
- Add payment method at https://platform.openai.com/account/billing

**"Pinecone index not found"**
- Wait 1-2 minutes after creating index
- Verify name is exactly `ma-referrals`

---

## Test Credentials

After setup completes:
- **Agency Admin**: test@example.com / password123
- **Platform Admin**: admin@example.com / admin123

---

## What's Next?

✅ Everything working? Great!

**For production deployment:**
1. See `SETUP_GUIDE.md` for detailed production setup
2. Update Next.js: `npm install next@15.5.6` (security fix)
3. Deploy to Vercel
4. Configure Stripe webhook for production
5. Update environment variables in Vercel dashboard

**Need help?**
- Full docs: `SETUP_GUIDE.md`
- Implementation details: All the `*_IMPLEMENTATION.md` files
- Security: `SECURITY_README.md`

---

**Total time: ~15 minutes + waiting for service signups**

🎉 Happy building!
