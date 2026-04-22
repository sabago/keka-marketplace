/**
 * RAG Query Pipeline
 * Retrieval-Augmented Generation for MA Referral Articles
 */

import OpenAI from 'openai';
import { index } from './vectorDb';

// Note: We don't throw an error at module load time to allow Next.js build to complete
// The error will be thrown at runtime when attempting to use the OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

// Configuration
const EMBEDDING_MODEL = 'text-embedding-3-large';
const CHAT_MODEL = 'gpt-4-turbo';
const RELEVANCE_THRESHOLD = 0.6;
const DEFAULT_TOP_K = 5;

const STALE_DATA_DISCLAIMER =
  '\n\n---\n*Note: Knowledge base content was last reviewed January 2025. Please verify contact details and program availability directly with each organization before making referrals.*';

export interface RAGQueryResult {
  answer: string;
  sources: string[]; // Array of article slugs
  sourceTitles: string[]; // Array of article titles
  tokensUsed: number;
  retrievedChunks: number;
  responseTime: number;
}

interface RetrievedChunk {
  slug: string;
  title: string;
  content: string;
  score: number;
  category: string;
  chunkIndex: number;
}

/**
 * Generate embedding for a query
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: query,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

/**
 * Retrieve relevant chunks from Pinecone
 */
async function retrieveRelevantChunks(
  queryEmbedding: number[],
  topK: number = DEFAULT_TOP_K
): Promise<RetrievedChunk[]> {
  try {
    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK * 2, // Get more results for filtering
      includeMetadata: true,
    });

    // Filter by relevance threshold and format results
    const chunks: RetrievedChunk[] = queryResponse.matches
      .filter((match) => match.score && match.score >= RELEVANCE_THRESHOLD)
      .slice(0, topK)
      .map((match) => ({
        slug: (match.metadata?.slug as string) || '',
        title: (match.metadata?.title as string) || '',
        content: (match.metadata?.content as string) || '',
        score: match.score || 0,
        category: (match.metadata?.category as string) || '',
        chunkIndex: (match.metadata?.chunkIndex as number) || 0,
      }));

    return chunks;
  } catch (error) {
    console.error('Error retrieving chunks:', error);
    throw error;
  }
}

/**
 * Build context from retrieved chunks
 */
function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant information found in the knowledge base.';
  }

  let context = 'Relevant information from the Massachusetts home care referral sources:\n\n';

  chunks.forEach((chunk, index) => {
    context += `[Source ${index + 1}: ${chunk.title}]\n`;
    context += `Category: ${chunk.category}\n`;
    context += `Content:\n${chunk.content}\n`;
    context += `Relevance score: ${(chunk.score * 100).toFixed(1)}%\n\n`;
  });

  return context;
}

/**
 * Generate answer using GPT-4
 */
async function generateAnswer(
  query: string,
  context: string
): Promise<{ answer: string; tokensUsed: number }> {
  try {
    const systemPrompt = `You are a helpful AI assistant for Massachusetts home care agencies seeking referral sources. Your role is to:

1. Answer questions ONLY based on the provided context from the referral source articles
2. Cite specific sources by name when providing information
3. Be concise but thorough - aim for 2-4 paragraphs
4. If the context doesn't contain relevant information, say "I don't have specific information about that in the current knowledge base" — do not fill gaps with general knowledge, hedged language, or phrases like "likely", "probably", or "typically"
5. Focus on practical, actionable information for home care agencies
6. Use a professional but friendly tone
7. When mentioning hospitals, organizations, or programs, include key details like location, contact methods, or requirements

Do NOT:
- Make up information not in the context
- Provide medical advice
- Share outdated contact information
- Make assumptions about services not explicitly mentioned
- Infer, extrapolate, or speculate about details not explicitly stated in the provided sources
- If a question appears to assume prior context from an earlier message, ask the user to restate the full question — each query is answered independently with no memory of previous messages`;

    const userPrompt = `Context from knowledge base:\n\n${context}\n\n---\n\nUser question: ${query}\n\nPlease provide a helpful answer based on the context above. Remember to cite your sources.`;

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Near-deterministic for factual retrieval
      max_tokens: 800,
    });

    const answer = response.choices[0].message.content || 'Unable to generate answer.';
    const tokensUsed = response.usage?.total_tokens || 0;

    return { answer, tokensUsed };
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
}

export const DIRECTORY_SYSTEM_PROMPT = `You are a helpful AI assistant for Massachusetts home care agencies seeking referral sources. Your role is to:

1. Answer questions ONLY based on the provided context from the referral source articles
2. Cite specific sources by name when providing information
3. Be concise but thorough - aim for 2-4 paragraphs
4. If the context doesn't contain relevant information, say "I don't have specific information about that in the current knowledge base" — do not fill gaps with general knowledge, hedged language, or phrases like "likely", "probably", or "typically"
5. Focus on practical, actionable information for home care agencies
6. Use a professional but friendly tone
7. When mentioning hospitals, organizations, or programs, include key details like location, contact methods, or requirements

Do NOT:
- Make up information not in the context
- Provide medical advice
- Share outdated contact information
- Make assumptions about services not explicitly mentioned
- Infer, extrapolate, or speculate about details not explicitly stated in the provided sources
- If a question appears to assume prior context from an earlier message, ask the user to restate the full question — each query is answered independently with no memory of previous messages`;

export interface RAGRetrievalResult {
  chunks: RetrievedChunk[];
  context: string;
  sources: string[];
  sourceTitles: string[];
}

/**
 * Retrieve relevant chunks without generating an answer (used by chatbot route)
 */
export async function ragRetrieve(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RAGRetrievalResult> {
  if (!query || !query.trim()) {
    throw new Error('Query cannot be empty');
  }

  const queryEmbedding = await generateQueryEmbedding(query);
  const chunks = await retrieveRelevantChunks(queryEmbedding, topK);
  const context = buildContext(chunks);
  const sources = Array.from(new Set(chunks.map((c) => c.slug)));
  const sourceTitles = Array.from(new Set(chunks.map((c) => c.title)));

  return { chunks, context, sources, sourceTitles };
}

/**
 * Main RAG query function
 */
export async function ragQuery(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RAGQueryResult> {
  const startTime = Date.now();

  try {
    // Validate query
    if (!query || !query.trim()) {
      throw new Error('Query cannot be empty');
    }

    // Step 1: Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // Step 2: Retrieve relevant chunks
    const chunks = await retrieveRelevantChunks(queryEmbedding, topK);

    if (chunks.length === 0) {
      return {
        answer: "I couldn't find information that closely matches your question in the knowledge base. Try rephrasing with more specific terms — for example, name a specific hospital, program type (e.g., 'discharge planning', 'home health referral'), or geographic area. You can also browse the Referral Directory directly to find sources by category.",
        sources: [],
        sourceTitles: [],
        tokensUsed: 0,
        retrievedChunks: 0,
        responseTime: Date.now() - startTime,
      };
    }

    // Step 3: Build context
    const context = buildContext(chunks);

    // Step 4: Generate answer
    const { answer: rawAnswer, tokensUsed } = await generateAnswer(query, context);
    const answer = rawAnswer + STALE_DATA_DISCLAIMER;

    // Step 5: Extract unique sources
    const uniqueSlugs = Array.from(new Set(chunks.map((c) => c.slug)));
    const uniqueTitles = Array.from(new Set(chunks.map((c) => c.title)));

    const responseTime = Date.now() - startTime;

    return {
      answer,
      sources: uniqueSlugs,
      sourceTitles: uniqueTitles,
      tokensUsed,
      retrievedChunks: chunks.length,
      responseTime,
    };
  } catch (error) {
    console.error('RAG query error:', error);

    // Return error response
    return {
      answer: 'I encountered an error while processing your question. Please try again later.',
      sources: [],
      sourceTitles: [],
      tokensUsed: 0,
      retrievedChunks: 0,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Validate RAG system setup
 */
export async function validateRAGSetup(): Promise<{
  success: boolean;
  message: string;
  details?: {
    testQuery: string;
    retrievedChunks: number;
    sources: string[];
    responseTime: number;
  };
}> {
  try {
    // Test query
    const testQuery = 'What hospitals are available in Boston?';
    const result = await ragQuery(testQuery, 3);

    if (result.retrievedChunks > 0) {
      return {
        success: true,
        message: 'RAG system is working correctly',
        details: {
          testQuery,
          retrievedChunks: result.retrievedChunks,
          sources: result.sources,
          responseTime: result.responseTime,
        },
      };
    } else {
      return {
        success: false,
        message: 'No chunks retrieved - embeddings may not be generated yet',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `RAG validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
