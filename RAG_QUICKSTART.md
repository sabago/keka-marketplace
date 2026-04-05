# RAG Chatbot - Quick Start Guide

This is the TL;DR version. For full documentation, see `RAG_SETUP.md`.

## Setup (5 minutes)

### 1. Get API Keys

**Pinecone** (required):
- Go to https://pinecone.io
- Sign up → Create project → Copy API key

**OpenAI** (required):
- Go to https://platform.openai.com
- Sign up → API Keys → Create new key

**Upstash** (optional, for caching):
- Go to https://upstash.com
- Create Redis database → Copy URL and token

### 2. Add to .env

```env
PINECONE_API_KEY=pc-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
UPSTASH_REDIS_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_TOKEN=xxxxxxxxx
```

### 3. Generate Embeddings

This processes all 125 MA articles and uploads to Pinecone:

```bash
npm run rag:generate
```

Expected: ~2 minutes, costs ~$0.06

### 4. Test the System

```bash
npm run rag:test
```

This runs 4 validation queries and shows results.

### 5. Use in Your App

Add the chatbot component to any authenticated page:

```tsx
import AIChatbot from '@/components/AIChatbot';

export default function YourPage() {
  return (
    <div>
      <YourContent />
      <AIChatbot />
    </div>
  );
}
```

## File Structure

```
marketplace/
├── src/
│   ├── lib/
│   │   ├── vectorDb.ts         # Pinecone setup
│   │   ├── rag.ts              # RAG query pipeline
│   │   ├── queryCache.ts       # Redis caching
│   │   └── chatbotAuth.ts      # Auth utilities
│   ├── app/api/chatbot/
│   │   └── query/route.ts      # API endpoint
│   ├── components/
│   │   └── AIChatbot.tsx       # UI component
│   └── scripts/
│       ├── generate-embeddings.ts  # Setup script
│       └── test-rag.ts             # Test script
└── RAG_SETUP.md                # Full documentation
```

## NPM Scripts

```bash
npm run rag:generate   # Generate and upload embeddings (run once)
npm run rag:test       # Test RAG system with sample queries
npm run dev            # Start dev server with chatbot
```

## Query Limits by Plan

| Plan       | Queries/Month | Cost     |
|------------|--------------|----------|
| FREE       | 20           | $0       |
| PRO        | 200          | $29      |
| BUSINESS   | 1,000        | $99      |
| ENTERPRISE | 10,000       | Custom   |

## How It Works

```
User Query
    ↓
Auth Check → Rate Limit → Cache Check
    ↓ (cache miss)
Generate Embedding → Search Pinecone → Build Context
    ↓
GPT-4 Generates Answer → Cache Result → Return to User
```

## Testing

Try these queries in the chatbot:

1. "Which hospitals in Boston have online portals?"
2. "Show me free referral sources for veterans"
3. "How do I refer to Mass General?"
4. "What ASAPs serve the North Shore?"

## Costs

### One-time:
- Embeddings: ~$0.06 (one time)

### Per 1000 queries:
- Without caching: ~$30
- With caching (50% hit rate): ~$15

### Monthly (10k queries):
- OpenAI: ~$150-300
- Pinecone: Free tier or $70/month
- Upstash: Free tier

## Troubleshooting

**"No relevant information found"**
→ Run `npm run rag:generate` to create embeddings

**"Authentication required"**
→ User must be signed in

**"Query limit exceeded"**
→ Check/upgrade subscription plan

**Slow responses**
→ Enable Redis caching (add Upstash credentials)

## Next Steps

1. Generate embeddings: `npm run rag:generate`
2. Test system: `npm run rag:test`
3. Start dev server: `npm run dev`
4. Add `<AIChatbot />` to your pages
5. Deploy to production

For detailed documentation, see `RAG_SETUP.md`.
