import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.knowledgeBaseArticle.count();
  console.log(`✅ Total articles in database: ${count}`);

  const byState = await prisma.knowledgeBaseArticle.groupBy({
    by: ['state'],
    _count: true,
  });
  console.log('\n📊 Articles by state:');
  byState.forEach(({ state, _count }) => {
    console.log(`   ${state}: ${_count} articles`);
  });

  const sample = await prisma.knowledgeBaseArticle.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      slug: true,
      title: true,
      state: true,
      tags: true,
      published: true,
    },
  });

  console.log('\n📄 Sample articles:');
  sample.forEach(article => {
    console.log(`   - ${article.title}`);
    console.log(`     Slug: ${article.slug}`);
    console.log(`     State: ${article.state}`);
    console.log(`     Tags: ${article.tags.slice(0, 3).join(', ')}${article.tags.length > 3 ? '...' : ''}`);
    console.log(`     Published: ${article.published}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
