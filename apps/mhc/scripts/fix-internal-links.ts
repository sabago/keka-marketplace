/**
 * Fix internal links in knowledge base articles
 *
 * Converts old file-system paths like:
 *   /massachusetts/1-hospitals-and-health-systems/atrius-health
 * To new knowledge base paths:
 *   /knowledge-base/atrius-health
 *
 * Usage: npx tsx scripts/fix-internal-links.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix internal links in article content
 */
function fixLinks(content: string): { fixed: string; count: number } {
  let fixCount = 0;

  let fixed = content;

  // Pattern 1: /massachusetts/[category]/[slug]
  const linkPattern1 = /\[([^\]]+)\]\(\/massachusetts\/[^\/]+\/([^)]+)\)/g;
  fixed = fixed.replace(linkPattern1, (match, linkText, slug) => {
    fixCount++;
    return `[${linkText}](/knowledge-base/${slug})`;
  });

  // Pattern 2: /massachusetts/[slug] (no category)
  const linkPattern2 = /\[([^\]]+)\]\(\/massachusetts\/([^)]+)\)/g;
  fixed = fixed.replace(linkPattern2, (match, linkText, slug) => {
    fixCount++;
    return `[${linkText}](/knowledge-base/${slug})`;
  });

  return { fixed, count: fixCount };
}

/**
 * Process all articles and fix their links
 */
async function main() {
  console.log('🔍 Fetching all articles...\n');

  const articles = await prisma.knowledgeBaseArticle.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
    },
  });

  console.log(`📚 Found ${articles.length} articles\n`);

  let totalFixed = 0;
  let articlesUpdated = 0;

  for (const article of articles) {
    const { fixed, count } = fixLinks(article.content);

    if (count > 0) {
      // Update article with fixed links
      await prisma.knowledgeBaseArticle.update({
        where: { id: article.id },
        data: { content: fixed },
      });

      console.log(`✅ ${article.slug}: Fixed ${count} link(s)`);
      totalFixed += count;
      articlesUpdated++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ Link fix complete!');
  console.log(`   Articles updated: ${articlesUpdated}`);
  console.log(`   Total links fixed: ${totalFixed}`);
  console.log('='.repeat(50));
}

// Run the script
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
