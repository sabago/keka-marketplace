'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import CategorySidebar from '@/components/CategorySidebar';
import CategoryBadge from '@/components/CategoryBadge';
import { ArrowLeft, Calendar, MapPin, Menu } from 'lucide-react';

interface Article {
  id: string;
  slug: string;
  title: string;
  state: string;
  category?: string | null;
  tags: string[];
  content: string;
  excerpt: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/knowledge-base/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Article not found');
        } else {
          setError('Failed to load article');
        }
        return;
      }

      const data = await response.json();
      setArticle(data.article);
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = article
    ? new Date(article.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleCategorySelect = (categorySlug: string | null) => {
    if (categorySlug) {
      router.push(`/knowledge-base?category=${categorySlug}`);
    } else {
      router.push('/knowledge-base');
    }
  };

  return (
    <PageLayout>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <CategorySidebar
          selectedCategory={article?.category || null}
          onSelectCategory={handleCategorySelect}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden mb-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Menu className="w-5 h-5" />
              <span>Categories</span>
            </button>

            {/* Back Button */}
            <button
              onClick={() => router.push('/knowledge-base')}
              className="flex items-center gap-2 text-[#0B4F96] hover:text-[#48ccbc] mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Knowledge Base</span>
            </button>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]"></div>
            <p className="mt-4 text-gray-600">Loading article...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12 bg-red-50 rounded-lg">
            <h2 className="text-2xl font-bold text-red-700 mb-2">{error}</h2>
            <p className="text-gray-600 mb-6">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.push('/knowledge-base')}
              className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
            >
              Browse All Articles
            </button>
          </div>
        )}

        {/* Article Content */}
        {article && !loading && !error && (
          <article className="bg-white rounded-lg shadow-md p-8">
            {/* Article Header */}
            <header className="mb-8 pb-6 border-b border-gray-200">
              {/* Category Badge */}
              {article.category && (
                <div className="mb-4">
                  <CategoryBadge category={article.category} size="medium" />
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{article.state}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Updated {formattedDate}</span>
                </div>
              </div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-[#0B4F96] text-white text-sm px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Article Body */}
            <div className="article-content">
              <MarkdownRenderer content={article.content} />
            </div>

            {/* Article Footer */}
            <footer className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.push('/knowledge-base')}
                  className="flex items-center gap-2 text-[#0B4F96] hover:text-[#48ccbc] transition-colors font-medium"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Knowledge Base</span>
                </button>

                <div className="text-sm text-gray-600">
                  <p>Last updated: {formattedDate}</p>
                </div>
              </div>
            </footer>
          </article>
        )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
