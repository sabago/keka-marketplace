/**
 * Embedding Generation Script
 * Processes all MA referral articles and generates vector embeddings for RAG
 *
 * Run with: npx tsx src/scripts/generate-embeddings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import OpenAI from 'openai';
import { pinecone, INDEX_NAME, ensureIndexExists } from '../lib/vectorDb';

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration
const CONTENT_DIR = path.join(process.cwd(), 'src/content/massachusetts');
const CHUNK_SIZE = 1000; // tokens (approximately 750-1000 words)
const CHUNK_OVERLAP = 100; // overlap between chunks
const EMBEDDING_MODEL = 'text-embedding-3-large';
const BATCH_SIZE = 10; // process N files at a time

interface ArticleMetadata {
  slug: string;
  title: string;
  state: string;
  category: string | null;
  tags: string[];
  sourceType: string;
  costLevel: string;
  officialUrl?: string;
}

interface Chunk {
  content: string;
  metadata: ArticleMetadata & {
    chunkIndex: number;
    totalChunks: number;
  };
}

/**
 * Recursively find all markdown files
 */
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Approximate token count (rough estimation: 4 chars = 1 token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split content into chunks with overlap
 */
function chunkContent(content: string, maxTokens: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = content.split(/\n\n+/); // Split by paragraphs

  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());

      // Keep overlap from end of previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-overlap);
      currentChunk = overlapWords.join(' ') + '\n\n' + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Parse markdown file and extract metadata + content
 */
function parseMarkdownFile(filePath: string): { metadata: ArticleMetadata; content: string } | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Skip index files
    const filename = path.basename(filePath);
    if (filename === 'index.md') {
      return null;
    }

    // Extract category from path
    const relativePath = path.relative(CONTENT_DIR, filePath);
    const pathParts = relativePath.split(path.sep);
    let category: string | null = null;

    if (pathParts.length > 1) {
      // Extract category number and name (e.g., "1-hospitals-and-health-systems")
      const categoryFolder = pathParts[0];
      const match = categoryFolder.match(/^\d+-(.+)$/);
      if (match) {
        category = match[1]; // e.g., "hospitals-and-health-systems"
      }
    }

    const metadata: ArticleMetadata = {
      slug: data.slug || path.basename(filePath, '.md'),
      title: data.title || 'Untitled',
      state: data.state || 'MA',
      category: category,
      tags: data.referral_channel_types || [],
      sourceType: data.source_type || 'referral_source',
      costLevel: data.cost_level || 'unknown',
      officialUrl: data.official_url,
    };

    return { metadata, content };
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return null;
  }
}

/**
 * Generate embedding for a text chunk
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Process a single markdown file
 */
async function processFile(filePath: string): Promise<Chunk[]> {
  const parsed = parseMarkdownFile(filePath);
  if (!parsed) {
    return [];
  }

  const { metadata, content } = parsed;

  // Chunk the content
  const contentChunks = chunkContent(content, CHUNK_SIZE, CHUNK_OVERLAP);

  console.log(`  - ${metadata.title}: ${contentChunks.length} chunks`);

  // Create chunk objects with metadata
  const chunks: Chunk[] = contentChunks.map((chunk, index) => ({
    content: chunk,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: contentChunks.length,
    },
  }));

  return chunks;
}

/**
 * Upsert chunks to Pinecone
 */
async function upsertToPinecone(chunks: Chunk[]) {
  const index = pinecone.index(INDEX_NAME);

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    console.log(`  Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);

    // Generate embeddings for batch
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk.content))
    );

    // Prepare vectors for upsert
    const vectors = batch.map((chunk, idx) => ({
      id: `${chunk.metadata.slug}-chunk-${chunk.metadata.chunkIndex}`,
      values: embeddings[idx],
      metadata: {
        slug: chunk.metadata.slug,
        title: chunk.metadata.title,
        state: chunk.metadata.state,
        category: chunk.metadata.category || '',
        tags: chunk.metadata.tags.join(','),
        sourceType: chunk.metadata.sourceType,
        costLevel: chunk.metadata.costLevel,
        officialUrl: chunk.metadata.officialUrl || '',
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        content: chunk.content.substring(0, 1000), // Store first 1000 chars
      },
    }));

    // Upsert to Pinecone
    await index.upsert(vectors);

    // Rate limiting: wait a bit between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('RAG Embeddings Generation Script');
  console.log('='.repeat(60));
  console.log();

  // Ensure Pinecone index exists
  console.log('1. Checking Pinecone index...');
  await ensureIndexExists();
  console.log('   ✓ Index ready\n');

  // Find all markdown files
  console.log('2. Finding markdown files...');
  const files = findMarkdownFiles(CONTENT_DIR);
  console.log(`   Found ${files.length} files\n`);

  if (files.length === 0) {
    console.error('   ERROR: No markdown files found!');
    process.exit(1);
  }

  // Process all files
  console.log('3. Processing files and chunking content...');
  const allChunks: Chunk[] = [];

  for (const file of files) {
    const chunks = await processFile(file);
    allChunks.push(...chunks);
  }

  console.log(`   ✓ Total chunks: ${allChunks.length}\n`);

  // Generate embeddings and upsert to Pinecone
  console.log('4. Generating embeddings and uploading to Pinecone...');
  console.log(`   (This will take approximately ${Math.ceil(allChunks.length / BATCH_SIZE * 2)} seconds)`);
  console.log();

  await upsertToPinecone(allChunks);

  console.log();
  console.log('='.repeat(60));
  console.log('✓ Embeddings generation complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('Summary:');
  console.log(`  - Files processed: ${files.length}`);
  console.log(`  - Total chunks: ${allChunks.length}`);
  console.log(`  - Average chunks per file: ${(allChunks.length / files.length).toFixed(1)}`);
  console.log(`  - Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`  - Index: ${INDEX_NAME}`);
  console.log();
  console.log('Estimated cost: $' + (allChunks.length * 0.00013).toFixed(2));
  console.log('(Based on OpenAI text-embedding-3-large pricing)');
  console.log();
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
