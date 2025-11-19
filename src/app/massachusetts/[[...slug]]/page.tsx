import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

interface PageProps {
  params: {
    slug?: string[];
  };
}

// Map old category folders to potential slug patterns
const categoryFolderMap: Record<string, string> = {
  '1-hospitals-and-health-systems': 'hospitals-health-systems',
  '2-aging-services-access-points': 'aging-services-access-points',
  '3-aging-programs-coas-geriatrics': 'aging-programs-coas-geriatrics',
  '4-insurance-and-health-plans': 'insurance-health-plans',
  '5-mcos-and-acos': 'mcos-acos',
  '6-veteran-and-military': 'veteran-military',
  '7-community-and-consumer-platforms': 'community-consumer-platforms',
};

export default async function MassachusettsRedirectPage({ params }: PageProps) {
  const { slug = [] } = params;

  // If no slug, redirect to main knowledge base
  if (slug.length === 0) {
    redirect('/knowledge-base');
  }

  // If it's [category]/overview, try to find the category overview article
  if (slug.length === 2 && slug[1] === 'overview') {
    const categoryFolder = slug[0];
    const categorySlug = categoryFolderMap[categoryFolder];

    if (categorySlug) {
      // Try to find overview article for this category
      const overviewArticle = await prisma.knowledgeBaseArticle.findFirst({
        where: {
          category: categorySlug,
          isOverview: true,
          published: true,
        },
        select: {
          slug: true,
        },
      });

      if (overviewArticle) {
        redirect(`/knowledge-base/${overviewArticle.slug}`);
      }
    }

    // If no specific overview found, redirect to category view
    if (categorySlug) {
      redirect(`/knowledge-base?category=${categorySlug}`);
    }
  }

  // If it's [category]/[article-slug], try to find the article
  if (slug.length === 2) {
    const articleSlug = slug[1];

    // Try to find article by slug
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: {
        slug: articleSlug,
        published: true,
      },
      select: {
        slug: true,
      },
    });

    if (article) {
      redirect(`/knowledge-base/${article.slug}`);
    }
  }

  // If it's just [category], redirect to knowledge base with category filter
  if (slug.length === 1) {
    const categoryFolder = slug[0];
    const categorySlug = categoryFolderMap[categoryFolder];

    if (categorySlug) {
      redirect(`/knowledge-base?category=${categorySlug}`);
    }
  }

  // If nothing matched, redirect to main knowledge base
  redirect('/knowledge-base');
}
