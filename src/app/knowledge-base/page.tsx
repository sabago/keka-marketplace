'use client';

import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import KnowledgeBaseCard from '@/components/KnowledgeBaseCard';
import KnowledgeBaseListItem from '@/components/KnowledgeBaseListItem';
import KnowledgeBaseSearch from '@/components/KnowledgeBaseSearch';
import CategorySidebar from '@/components/CategorySidebar';
import CategoryHeroCard from '@/components/CategoryHeroCard';
import { Book, Grid, List, Menu } from 'lucide-react';
import { getCategoryBySlug } from '@/lib/categoryConfig';

interface Article {
  id: string;
  slug: string;
  title: string;
  state: string;
  category?: string | null;
  isOverview?: boolean;
  tags: string[];
  excerpt: string | null;
  updatedAt: string;
  createdAt: string;
}

type ViewMode = 'grid' | 'list';

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, selectedState]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      const response = await fetch(`/api/knowledge-base?${params.toString()}`);
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    // Filter by state
    if (selectedState) {
      filtered = filtered.filter(article => article.state === selectedState);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        article =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt?.toLowerCase().includes(query) ||
          article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredArticles(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleStateFilter = (state: string) => {
    setSelectedState(state);
  };

  const handleCategorySelect = (categorySlug: string | null) => {
    setSelectedCategory(categorySlug);
    setSearchQuery('');
    setSelectedState('');
  };

  // Separate overview article from regular articles
  const overviewArticle = filteredArticles.find(article => article.isOverview);
  const regularArticles = filteredArticles.filter(article => !article.isOverview);

  // Get category info for display
  const categoryInfo = getCategoryBySlug(selectedCategory);

  return (
    <PageLayout>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <CategorySidebar
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-7xl mx-auto px-4 py-12">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden mb-6 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Menu className="w-5 h-5" />
              <span>Categories</span>
            </button>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Book className="w-8 h-8 text-[#0B4F96]" />
                <h1 className="text-4xl font-bold text-gray-900">
                  {selectedCategory && categoryInfo
                    ? categoryInfo.name
                    : 'Referral Directory'}
                </h1>
              </div>

              {!selectedCategory ? (
                // Main description - shown when viewing all categories
                <div className="prose max-w-none">
                  <p className="text-lg text-gray-700 mb-4">
                    Comprehensive guides to home care referral sources across the United States.
                    Learn about state programs, hospital systems, and consumer platforms that connect
                    families with home care services.
                  </p>

                  <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-6 rounded-r-lg mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                      🚀 Where to Start
                    </h2>
                    <p className="text-gray-700 mb-3">
                      New to building referral relationships? Start with these high-impact, free sources:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li><strong>Hospitals & Health Systems</strong> - Discharge planners generate immediate, qualified referrals</li>
                      <li><strong>Aging Services Access Points (ASAPs)</strong> - State-funded programs connecting seniors to services</li>
                      <li><strong>Councils on Aging</strong> - Local community hubs with direct access to families</li>
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <h3 className="font-bold text-gray-900 mb-2">💰 Free vs. Paid Sources</h3>
                      <p className="text-sm text-gray-600">
                        Most high-quality referrals come from free relationship-based sources.
                        Paid platforms can supplement but shouldn't be your primary strategy.
                      </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <h3 className="font-bold text-gray-900 mb-2">📊 Expected Volume</h3>
                      <p className="text-sm text-gray-600">
                        Each hospital relationship can generate 2-10 referrals/month.
                        ASAPs and COAs provide steady streams of 3-8 referrals/month each.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    💡 <strong>Pro Tip:</strong> Browse by category in the sidebar to explore sources by type,
                    or use the search to find specific organizations.
                  </p>
                </div>
              ) : (
                // Category-specific description
                <p className="text-lg text-gray-600">
                  {categoryInfo?.description}
                </p>
              )}
            </div>

            {/* Search and Filter */}
            <KnowledgeBaseSearch
              onSearch={handleSearch}
              onStateFilter={handleStateFilter}
              selectedState={selectedState}
            />

            {/* View Toggle and Results Count */}
            {!loading && (
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  Showing <span className="font-semibold">{filteredArticles.length}</span> of{' '}
                  <span className="font-semibold">{articles.length}</span> articles
                  {selectedCategory && categoryInfo && (
                    <span> in <span className="font-semibold">{categoryInfo.name}</span></span>
                  )}
                </p>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#0B4F96] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#0B4F96] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">List</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]"></div>
                <p className="mt-4 text-gray-600">Loading articles...</p>
              </div>
            )}

            {/* Overview Hero Card */}
            {!loading && overviewArticle && (
              <CategoryHeroCard
                slug={overviewArticle.slug}
                title={overviewArticle.title}
                excerpt={overviewArticle.excerpt}
                category={overviewArticle.category}
                updatedAt={overviewArticle.updatedAt}
              />
            )}

            {/* Articles Display - Grid View */}
            {!loading && regularArticles.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularArticles.map(article => (
                  <KnowledgeBaseCard
                    key={article.id}
                    {...article}
                    category={article.category}
                  />
                ))}
              </div>
            )}

            {/* Articles Display - List View */}
            {!loading && regularArticles.length > 0 && viewMode === 'list' && (
              <div className="flex flex-col gap-4">
                {regularArticles.map(article => (
                  <KnowledgeBaseListItem
                    key={article.id}
                    {...article}
                    category={article.category}
                  />
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && filteredArticles.length === 0 && articles.length > 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedState('');
                    setSelectedCategory(null);
                  }}
                  className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && articles.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No articles available
                </h3>
                <p className="text-gray-600">
                  Check back soon for new content!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
