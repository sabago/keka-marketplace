import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get an article that had links fixed
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { slug: 'atrius-health' },
    select: {
      slug: true,
      title: true,
      content: true,
    },
  });

  if (!article) {
    console.log('Article not found');
    return;
  }

  console.log(`📄 Article: ${article.title}\n`);

  // Extract all links from content
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [...article.content.matchAll(linkPattern)];

  console.log(`🔗 Found ${links.length} links in article:\n`);

  // Group by link type
  const internalLinks = links.filter(([, , url]) => url.startsWith('/knowledge-base/'));
  const oldLinks = links.filter(([, , url]) => url.startsWith('/massachusetts/'));
  const externalLinks = links.filter(([, , url]) => url.startsWith('http'));
  const otherLinks = links.filter(([, , url]) =>
    !url.startsWith('/knowledge-base/') &&
    !url.startsWith('/massachusetts/') &&
    !url.startsWith('http')
  );

  console.log(`✅ Knowledge base links (fixed): ${internalLinks.length}`);
  if (internalLinks.length > 0) {
    internalLinks.slice(0, 5).forEach(([, text, url]) => {
      console.log(`   - [${text}](${url})`);
    });
    if (internalLinks.length > 5) {
      console.log(`   ... and ${internalLinks.length - 5} more`);
    }
  }

  console.log(`\n❌ Old Massachusetts links (should be 0): ${oldLinks.length}`);
  if (oldLinks.length > 0) {
    oldLinks.forEach(([, text, url]) => {
      console.log(`   - [${text}](${url})`);
    });
  }

  console.log(`\n🌐 External links: ${externalLinks.length}`);
  console.log(`📌 Other links: ${otherLinks.length}`);

  // Check if any articles still have old links
  console.log('\n' + '='.repeat(50));
  const articlesWithOldLinks = await prisma.$queryRaw<Array<{ slug: string; count: bigint }>>`
    SELECT slug,
           (length(content) - length(REPLACE(content, '/massachusetts/', ''))) / length('/massachusetts/') as count
    FROM "KnowledgeBaseArticle"
    WHERE content LIKE '%/massachusetts/%'
    ORDER BY count DESC
    LIMIT 5
  `;

  if (articlesWithOldLinks.length > 0) {
    console.log('⚠️  Articles still containing old links:');
    articlesWithOldLinks.forEach(({ slug, count }) => {
      console.log(`   - ${slug}: ${count} old link(s)`);
    });
  } else {
    console.log('✅ No articles with old /massachusetts/ links found!');
  }
  console.log('='.repeat(50));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
