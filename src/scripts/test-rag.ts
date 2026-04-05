/**
 * RAG System Validation Test
 * Tests the complete RAG pipeline with sample queries
 *
 * Run with: npx tsx src/scripts/test-rag.ts
 */

import { ragQuery, validateRAGSetup } from '../lib/rag';
import { getCacheStats, checkCacheHealth } from '../lib/queryCache';

const TEST_QUERIES = [
  'Which hospitals in Boston have online portals?',
  'Show me free referral sources for veterans',
  'How do I refer to Mass General?',
  'What ASAPs serve the North Shore region?',
];

async function runTest(query: string, index: number): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test ${index + 1}: "${query}"`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const result = await ragQuery(query, 5);

    console.log('\n✓ Query successful!');
    console.log(`\nAnswer (${result.answer.length} characters):`);
    console.log('-'.repeat(80));
    console.log(result.answer);
    console.log('-'.repeat(80));

    console.log(`\nMetadata:`);
    console.log(`  - Sources: ${result.sources.length}`);
    console.log(`  - Source titles: ${result.sourceTitles.join(', ')}`);
    console.log(`  - Retrieved chunks: ${result.retrievedChunks}`);
    console.log(`  - Tokens used: ${result.tokensUsed}`);
    console.log(`  - Response time: ${result.responseTime}ms`);
    console.log(`  - Total time: ${Date.now() - startTime}ms`);

    if (result.sources.length === 0) {
      console.warn('\n⚠️  WARNING: No sources returned (may indicate embeddings not generated)');
    }
  } catch (error) {
    console.error('\n✗ Query failed!');
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('RAG SYSTEM VALIDATION TEST');
  console.log('='.repeat(80));
  console.log();

  // Step 1: Validate RAG setup
  console.log('Step 1: Validating RAG system setup...');
  const setupValidation = await validateRAGSetup();

  if (setupValidation.success) {
    console.log('✓ RAG system is configured correctly');
    if (setupValidation.details) {
      console.log(`  - Test query: "${setupValidation.details.testQuery}"`);
      console.log(`  - Retrieved chunks: ${setupValidation.details.retrievedChunks}`);
      console.log(`  - Sources: ${setupValidation.details.sources.join(', ')}`);
      console.log(`  - Response time: ${setupValidation.details.responseTime}ms`);
    }
  } else {
    console.error('✗ RAG system validation failed!');
    console.error(`  Message: ${setupValidation.message}`);
    console.error('\nPlease run: npx tsx src/scripts/generate-embeddings.ts');
    process.exit(1);
  }

  // Step 2: Check cache health
  console.log('\nStep 2: Checking cache system...');
  const cacheHealthy = await checkCacheHealth();
  const cacheStats = await getCacheStats();

  if (cacheHealthy) {
    console.log('✓ Cache system is healthy');
    console.log(`  - Cached queries: ${cacheStats.totalKeys}`);
  } else {
    console.warn('⚠️  Cache system not available (queries will work but won\'t be cached)');
  }

  // Step 3: Run test queries
  console.log('\nStep 3: Running test queries...');
  console.log(`Testing ${TEST_QUERIES.length} validation queries:\n`);

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    await runTest(TEST_QUERIES[i], i);

    // Add delay between queries to avoid rate limiting
    if (i < TEST_QUERIES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Step 4: Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('\n✓ All tests completed!');
  console.log('\nNext steps:');
  console.log('  1. Review the answers above for quality and relevance');
  console.log('  2. Check that sources are being cited correctly');
  console.log('  3. Verify response times are acceptable (<2 seconds)');
  console.log('  4. Test the UI by running: npm run dev');
  console.log('  5. Navigate to any authenticated page and click the chatbot icon');
  console.log();
}

// Run the tests
main().catch((error) => {
  console.error('\nFatal error during testing:', error);
  process.exit(1);
});
