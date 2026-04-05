#!/bin/bash
# Quick Setup Script for MA Referral Directory
# Run this after setting up external services (Stripe, OpenAI, Pinecone)

set -e  # Exit on error

echo "🚀 Starting Keka Marketplace Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the marketplace directory${NC}"
    echo "cd /Users/sandraabago/keka/marketplace"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking environment variables...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Create .env.local with required variables (see SETUP_GUIDE.md)"
    exit 1
fi

# Check required env vars
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "ENCRYPTION_KEY" "OPENAI_API_KEY" "PINECONE_API_KEY")
for var in "${required_vars[@]}"; do
    if ! grep -q "$var=" .env.local; then
        echo -e "${RED}❌ Missing $var in .env.local${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ Environment variables found${NC}"
echo ""

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Running Prisma migration...${NC}"
npx prisma migrate dev --name add_subscription_platform
echo -e "${GREEN}✅ Database migrated${NC}"
echo ""

echo -e "${YELLOW}Step 4: Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

echo -e "${YELLOW}Step 5: Setting up Stripe products...${NC}"
if grep -q "STRIPE_SECRET_KEY=" .env.local; then
    npx tsx src/scripts/setup-stripe-products.ts
    echo -e "${GREEN}✅ Stripe products created${NC}"
    echo -e "${YELLOW}⚠️  Copy the Price IDs above and add them to .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Stripe setup (no STRIPE_SECRET_KEY in .env.local)${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Generating embeddings for RAG chatbot...${NC}"
if grep -q "OPENAI_API_KEY=" .env.local && grep -q "PINECONE_API_KEY=" .env.local; then
    echo "This will take 2-5 minutes and cost ~$0.06..."
    npx tsx src/scripts/generate-embeddings.ts
    echo -e "${GREEN}✅ Embeddings generated${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping embeddings (missing OpenAI or Pinecone keys)${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Creating test data...${NC}"
npx tsx src/scripts/seed-agencies.ts
npx tsx src/scripts/create-test-user.ts
echo -e "${GREEN}✅ Test data created${NC}"
echo ""

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Test credentials:"
echo "  - test@example.com / password123 (Agency Admin)"
echo "  - admin@example.com / admin123 (Platform Admin)"
echo ""
echo "Next steps:"
echo "  1. npm run dev"
echo "  2. Visit http://localhost:3000"
echo "  3. Test signup flow: http://localhost:3000/auth/signup"
echo "  4. Test chatbot on dashboard"
echo ""
echo "For production deployment, see SETUP_GUIDE.md"
