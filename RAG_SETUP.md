# RAG Chatbot Setup Guide

This guide walks you through setting up the production RAG chatbot for MA referral articles.

## Overview

The RAG (Retrieval-Augmented Generation) chatbot provides intelligent answers about Massachusetts home care referral sources using:
- **Pinecone**: Vector database for semantic search
- **OpenAI**: Embeddings (text-embedding-3-large) and chat completion (GPT-4 Turbo)
- **Upstash Redis**: Query response caching (optional but recommended)
- **Next.js API Routes**: Authentication and rate limiting

## Architecture

```
User Query
    ↓
[Authentication Check] → JWT token validation
    ↓
[Rate Limit Check] → Subscription-based limits (FREE: 20, PRO: 200, etc.)
    ↓
[Cache Check] → Upstash Redis (1-hour TTL)
    ↓ (if cache miss)
[Query Embedding] → OpenAI text-embedding-3-large (3072 dimensions)
    ↓
[Vector Search] → Pinecone similarity search (top 5 results, >0.7 relevance)
    ↓
[Context Building] → Combine retrieved chunks
    ↓
[Answer Generation] → GPT-4 Turbo with system prompt
    ↓
[Response Caching] → Save to Redis
    ↓
[Database Logging] → Log query, response, tokens used
    ↓
User Answer + Sources
```

## Prerequisites

1. **Node.js 18+** (check with `node --version`)
2. **PostgreSQL** database (for user/agency data)
3. **Pinecone account** (free tier available)
4. **OpenAI API key** (paid, ~$2-5 for initial embeddings)
5. **Upstash account** (optional, free tier available)

## Step 1: Install Dependencies

Already done! Dependencies were installed:
```bash
npm install @pinecone-database/pinecone openai @upstash/redis @upstash/ratelimit gray-matter
```

## Step 2: Environment Variables

Create or update your `.env` file with these variables:

### Required:
```env
# Pinecone
PINECONE_API_KEY=your-pinecone-api-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Database (should already exist)
DATABASE_URL=postgresql://...
```

### Optional (but recommended):
```env
# Upstash Redis (for caching)
UPSTASH_REDIS_URL=your-upstash-redis-url
UPSTASH_REDIS_TOKEN=your-upstash-redis-token
```

### Get Your API Keys:

#### Pinecone
1. Go to https://pinecone.io
2. Sign up (free tier available)
3. Create a new project
4. Go to "API Keys" and copy your key
5. The index will be auto-created when you run the embedding script

#### OpenAI
1. Go to https://platform.openai.com
2. Sign up and add payment method
3. Go to "API Keys" → "Create new secret key"
4. Copy the key (you won't see it again!)

#### Upstash Redis (Optional)
1. Go to https://upstash.com
2. Sign up (free tier: 10k requests/day)
3. Create a new Redis database
4. Copy the REST URL and token

## Step 3: Database Migration

The Prisma schema already includes all necessary models:
- `Agency` - subscription tracking
- `ChatbotQuery` - query logging
- `VectorEmbedding` - optional local storage

If you haven't run migrations yet:
```bash
npx prisma migrate dev
```

## Step 4: Generate Embeddings

This is the most important step! Process all 125 MA articles and upload to Pinecone:

```bash
npx tsx src/scripts/generate-embeddings.ts
```

**What this does:**
1. Finds all 125 `.md` files in `src/content/massachusetts/`
2. Parses frontmatter and content
3. Chunks each article (500-1000 tokens, 100 overlap)
4. Generates embeddings using OpenAI text-embedding-3-large
5. Uploads to Pinecone with metadata

**Expected output:**
```
============================================================
RAG Embeddings Generation Script
============================================================

1. Checking Pinecone index...
   ✓ Index ready

2. Finding markdown files...
   Found 125 files

3. Processing files and chunking content...
  - Mass General Brigham: 8 chunks
  - Beth Israel Lahey Health: 6 chunks
  ...
   ✓ Total chunks: 450

4. Generating embeddings and uploading to Pinecone...
   (This will take approximately 90 seconds)

============================================================
✓ Embeddings generation complete!
============================================================

Summary:
  - Files processed: 125
  - Total chunks: 450
  - Average chunks per file: 3.6
  - Embedding model: text-embedding-3-large
  - Index: ma-referrals

Estimated cost: $0.06
```

**Cost Estimation:**
- 450 chunks × ~750 tokens/chunk = ~337,500 tokens
- text-embedding-3-large: $0.00013 per 1K tokens
- Total: ~$0.04-0.06

**Time:** 1-2 minutes

## Step 5: Test the System

### Option A: API Test (curl)

```bash
# Test RAG query endpoint (requires authentication)
curl -X POST http://localhost:3000/api/chatbot/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "Which hospitals in Boston have online portals?"}'
```

### Option B: UI Test

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to any authenticated page
3. Look for the floating chatbot button (bottom-right)
4. Click and start asking questions!

### Test Queries

Try these validation queries:

1. **Hospital Query:**
   - "Which hospitals in Boston have online portals?"
   - Expected: Lists Mass General Brigham, Beth Israel, Tufts Medicine with portal info

2. **Free Sources:**
   - "Show me free referral sources for veterans"
   - Expected: Lists VA hospitals, veteran-specific ASAPs, free programs

3. **Specific Organization:**
   - "How do I refer to Mass General?"
   - Expected: Contact methods, discharge planning info, expectations

4. **Geographic Query:**
   - "What referral sources are available in Worcester?"
   - Expected: UMass Memorial, Worcester County ASAPs, local programs

5. **Edge Case (no info):**
   - "Tell me about referral sources in California"
   - Expected: "I don't have specific information about that in the current knowledge base"

## Step 6: Deploy to Production

### Before deploying:

1. **Verify environment variables** in production:
   ```bash
   # On your production server/platform
   echo $PINECONE_API_KEY  # Should output your key
   echo $OPENAI_API_KEY    # Should output your key
   ```

2. **Run embeddings generation** on production (if not using same Pinecone index):
   ```bash
   NODE_ENV=production npx tsx src/scripts/generate-embeddings.ts
   ```

3. **Test API endpoint** in production:
   ```bash
   curl https://your-domain.com/api/chatbot/query \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"query": "test query"}'
   ```

### Production checklist:

- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Embeddings generated and uploaded to Pinecone
- [ ] API endpoint responding
- [ ] Authentication working
- [ ] Rate limiting functioning
- [ ] Caching enabled (if using Upstash)
- [ ] Error logging configured

## Files Created

### Core System:
- `/src/lib/vectorDb.ts` - Pinecone client initialization
- `/src/lib/rag.ts` - RAG query pipeline
- `/src/lib/queryCache.ts` - Redis caching layer
- `/src/lib/chatbotAuth.ts` - Authentication utilities

### API:
- `/src/app/api/chatbot/query/route.ts` - Main chatbot endpoint

### UI:
- `/src/components/AIChatbot.tsx` - Chatbot widget component

### Scripts:
- `/src/scripts/generate-embeddings.ts` - Embedding generation script

## Usage Limits by Plan

| Plan       | Monthly Queries | Cost/Month |
|------------|----------------|------------|
| FREE       | 20             | $0         |
| PRO        | 200            | $29        |
| BUSINESS   | 1,000          | $99        |
| ENTERPRISE | 10,000         | Custom     |

Limits are enforced in `/src/lib/chatbotAuth.ts` (`checkQueryLimit` function).

## Cost Breakdown

### One-time costs:
- **Embeddings generation**: $0.04-0.06 (one time)

### Ongoing costs (per 1000 queries):
- **OpenAI embeddings** (query): ~$0.01 per query = $10
- **OpenAI GPT-4 Turbo** (generation): ~$0.02 per query = $20
- **Pinecone** (hosting): Free tier or $70/month for serverless
- **Upstash Redis**: Free tier (10k requests/day) or $0.20 per 100k requests

**With caching (30-50% cache hit rate):**
- Per 1000 queries: ~$15-20 (vs $30 without caching)
- Annual savings with caching: ~$3,000-5,000 (at 10k queries/month)

## Monitoring

### Query logs:
All queries are logged to the `ChatbotQuery` table:
```sql
SELECT
  query,
  response,
  tokensUsed,
  responseTime,
  createdAt
FROM "ChatbotQuery"
WHERE "agencyId" = 'your-agency-id'
ORDER BY createdAt DESC
LIMIT 100;
```

### Cache statistics:
```typescript
import { getCacheStats } from '@/lib/queryCache';

const stats = await getCacheStats();
console.log(`Cached queries: ${stats.totalKeys}`);
```

### Query metrics:
```sql
-- Average response time
SELECT AVG("responseTime") as avg_ms
FROM "ChatbotQuery"
WHERE "createdAt" > NOW() - INTERVAL '7 days';

-- Total tokens used (for cost estimation)
SELECT SUM("tokensUsed") as total_tokens
FROM "ChatbotQuery"
WHERE "createdAt" > NOW() - INTERVAL '1 month';

-- Top agencies by usage
SELECT
  a."agencyName",
  COUNT(*) as query_count,
  SUM(cq."tokensUsed") as total_tokens
FROM "ChatbotQuery" cq
JOIN "Agency" a ON cq."agencyId" = a.id
WHERE cq."createdAt" > NOW() - INTERVAL '1 month'
GROUP BY a."agencyName"
ORDER BY query_count DESC;
```

## Maintenance

### Monthly tasks:
1. **Reset query counts** (1st of month):
   ```typescript
   import { resetMonthlyQueryCounts } from '@/lib/chatbotAuth';
   await resetMonthlyQueryCounts();
   ```

2. **Monitor costs** in OpenAI dashboard

3. **Review query logs** for issues or popular topics

### Quarterly tasks:
1. **Update embeddings** if articles changed significantly:
   ```bash
   npx tsx src/scripts/generate-embeddings.ts
   ```

2. **Review and tune** relevance threshold (currently 0.7)

3. **Analyze feedback** from thumbs up/down

## Troubleshooting

### "No relevant information found"
- Check if embeddings were generated: Query Pinecone dashboard
- Try rephrasing the query
- Lower relevance threshold in `/src/lib/rag.ts` (line 13)

### "Authentication required"
- Verify user is logged in
- Check JWT token in cookies/headers
- Verify NextAuth configuration

### "Query limit exceeded"
- Check agency's `queriesThisMonth` in database
- Verify subscription plan in `Agency` table
- Reset counts if needed (for testing)

### Slow responses
- Enable Redis caching (if not already)
- Consider upgrading Pinecone plan
- Reduce `topK` parameter (currently 5)

### High costs
- Enable caching (30-50% reduction)
- Lower `max_tokens` in GPT-4 call (currently 800)
- Consider switching to GPT-3.5-turbo for lower costs

## Support

For issues:
1. Check logs in `/src/app/api/chatbot/query/route.ts`
2. Verify environment variables
3. Test Pinecone connection: `npx tsx src/lib/vectorDb.ts`
4. Test OpenAI API: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

## Next Steps

1. **Add feedback collection**: Implement thumbs up/down persistence
2. **Analytics dashboard**: Visualize query trends, popular topics
3. **Multi-state support**: Expand beyond Massachusetts
4. **Custom embeddings**: Fine-tune for healthcare domain
5. **Voice interface**: Add speech-to-text for accessibility
