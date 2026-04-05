/**
 * Vector Database Setup - Pinecone
 * Initializes Pinecone client for RAG chatbot vector search
 */

import { Pinecone } from '@pinecone-database/pinecone';

// Index name for MA referral articles
export const INDEX_NAME = 'ma-referrals';

// Lazily initialized Pinecone client — throws at call time if key is missing
let _pinecone: Pinecone | null = null;

function getPinecone(): Pinecone {
  if (!_pinecone) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }
    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _pinecone;
}

export const pinecone = new Proxy({} as Pinecone, {
  get(_target, prop) {
    return (getPinecone() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Get the index (lazily initialized)
export const getIndex = () => {
  return getPinecone().index(INDEX_NAME);
};

// Helper to check if index exists
export async function ensureIndexExists() {
  try {
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some((idx) => idx.name === INDEX_NAME);

    if (!indexExists) {
      console.log(`Creating index: ${INDEX_NAME}`);
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: 3072, // OpenAI text-embedding-3-large dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      // Wait for index to be ready
      console.log('Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds
    }

    return true;
  } catch (error) {
    console.error('Error ensuring index exists:', error);
    throw error;
  }
}

// Export the index for direct use (lazy)
export const index = new Proxy({} as ReturnType<typeof getIndex>, {
  get(_target, prop) {
    return (getIndex() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
