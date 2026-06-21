'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import KnowledgeBaseCard from '@/components/KnowledgeBaseCard';
import KnowledgeBaseListItem from '@/components/KnowledgeBaseListItem';
import CategoryHeroCard from '@/components/CategoryHeroCard';
import {
  Book, Grid, List, X, MapPin, MessageCircle, ChevronRight,
  Search, Sparkles, ArrowRight, CheckCircle2, Clock, TrendingUp
} from 'lucide-react';
import { categories, getCategoryBySlug } from '@/lib/categoryConfig';

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

// "Where to start" advice — synthesized from article analysis
const starterTips = [
  {
    week: 'Weeks 1–12',
    icon: CheckCircle2,
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    title: 'Start with Councils on Aging',
    desc: 'Zero cost, zero credentialing. Visit your local COA in person, meet the I&R coordinator, offer to present on fall prevention or Medicare benefits. First referrals typically arrive within 4–12 weeks — the fastest path of any channel.',
    category: 'aging-programs-coas-geriatrics',
  },
  {
    week: 'Weeks 4–16',
    icon: TrendingUp,
    color: '#9333EA',
    bg: '#FAF5FF',
    border: '#D8B4FE',
    title: 'Enroll with your regional ASAP',
    desc: 'Each ASAP covers 15–30 towns — one relationship unlocks a whole region. Visit in person, ask about service area and MassHealth requirements. Free to enroll. Expect 10–35 referrals/month once established.',
    category: 'aging-services-access-points',
  },
  {
    week: 'Weeks 10–18',
    icon: Clock,
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    title: 'Apply for Medicare Advantage',
    desc: 'BCBS, Tufts, and CCA together cover 280,000+ Massachusetts seniors. The credentialing process is clear and predictable (10–14 weeks). Once approved, referrals flow automatically from 300+ care managers — no ongoing relationship required.',
    category: 'insurance-health-plans',
  },
];

function KnowledgeBasePageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => searchParams.get('category'));
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const searchRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = !!session?.user;

  // Debounce search input → searchQuery (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { fetchArticles(); }, [selectedCategory]);
  useEffect(() => { filterArticles(); }, [articles, searchQuery]);

  const scrollToResults = () => {
    setTimeout(() => document.getElementById('directory-content')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
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
    if (!searchQuery.trim()) { setFilteredArticles(articles); return; }
    const q = searchQuery.toLowerCase();
    setFilteredArticles(articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt?.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    ));
  };

  const handleCategorySelect = (slug: string | null) => {
    setSelectedCategory(slug);
    setSearchInput('');
    setSearchQuery('');
    // Scroll to content
    setTimeout(() => document.getElementById('directory-content')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const openChatbot = () => window.dispatchEvent(new CustomEvent('open-directory-chatbot'));

  const overviewArticle = filteredArticles.find(a => a.isOverview);
  const regularArticles = filteredArticles.filter(a => !a.isOverview);
  const categoryInfo = getCategoryBySlug(selectedCategory);

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-[#0B3D8C]">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute top-6 right-1/3 w-40 h-40 rounded-full bg-[#1a6bbf]/25 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-10 md:pt-20 md:pb-14 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-blue-200 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
            <MapPin className="w-3 h-3" />
            Massachusetts · More states coming soon
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 leading-tight tracking-tight">
            Find Referral Sources<br className="hidden sm:block" /> in Massachusetts
          </h1>
          <p className="text-blue-200 text-base sm:text-lg mb-7 max-w-xl mx-auto leading-relaxed">
            124+ free guides to hospitals, insurance plans, aging services, and community programs that send home care referrals.
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') scrollToResults(); }}
              placeholder="Search hospitals, insurers, aging services…"
              className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => document.getElementById('browse-categories')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0B3D8C] rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm"
            >
              Browse Sources <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={isLoggedIn ? openChatbot : () => window.location.href = '/auth/signin'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/25 text-white rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {isLoggedIn ? 'Ask AI Assistant' : 'Sign in to Ask AI'}
            </button>
          </div>
        </div>
      </div>

      {/* ── CATEGORIES SECTION ── */}
      <div id="browse-categories" className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Browse by category</p>
              <p className="text-sm text-gray-500">Select a category to filter referral sources</p>
            </div>
            {selectedCategory && (
              <button
                onClick={() => handleCategorySelect(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-gray-300 transition-colors"
              >
                <X className="w-3 h-3" /> Clear filter
              </button>
            )}
          </div>

          {/* Category grid — always visible, full cards on desktop, compact on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            {/* All pill */}
            <button
              onClick={() => handleCategorySelect(null)}
              className={`col-span-2 sm:col-span-1 xl:col-span-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                !selectedCategory
                  ? 'border-[#0B3D8C] bg-[#0B3D8C] text-white shadow-md'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-center leading-tight ${
                    isSelected
                      ? 'shadow-md'
                      : 'border-gray-200 bg-white text-gray-600 hover:shadow-sm'
                  }`}
                  style={isSelected
                    ? { borderColor: cat.color.base, backgroundColor: cat.color.badge, color: cat.color.dark }
                    : { borderColor: 'transparent' }
                  }
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isSelected ? cat.color.light : '#F3F4F6' }}
                  >
                    <cat.icon className="w-3.5 h-3.5" style={{ color: isSelected ? cat.color.base : '#6B7280' }} />
                  </div>
                  <span className="line-clamp-2">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── WHERE TO START SECTION ── */}
      <div className="bg-gradient-to-b from-white to-[#F8FAFC] border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3D8C] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full mb-2">
                <Sparkles className="w-3 h-3" />
                New to Massachusetts home care?
              </div>
              <h2 className="text-lg font-bold text-gray-900">Where to start</h2>
              <p className="text-sm text-gray-500 mt-0.5">The 3 highest-ROI referral channels for new agencies — in the right order</p>
            </div>
            <Link
              href="/knowledge-base/how-to-use"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B3D8C] text-white text-sm font-semibold rounded-xl hover:bg-[#0a3578] transition-colors shadow-sm flex-shrink-0"
            >
              View full guide
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {starterTips.map((tip, i) => (
              <button
                key={i}
                onClick={() => handleCategorySelect(tip.category)}
                className="group text-left p-4 rounded-xl border-2 transition-all hover:shadow-md"
                style={{ borderColor: tip.border, backgroundColor: tip.bg }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tip.color }}>
                    Step {i + 1}
                  </span>
                  <span className="text-sm text-gray-400 font-medium">{tip.week}</span>
                </div>
                <div className="flex items-start gap-2.5 mb-2">
                  <tip.icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tip.color }} />
                  <p className="font-bold text-gray-900 text-base leading-snug group-hover:underline">{tip.title}</p>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{tip.desc}</p>
                <p className="mt-3 text-sm font-semibold flex items-center gap-1" style={{ color: tip.color }}>
                  Browse guides <ChevronRight className="w-3 h-3" />
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DIRECTORY CONTENT ── */}
      <div id="directory-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Permanent info banners */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-amber-800">
            <strong>Massachusetts only</strong> — all 124 guides currently cover Massachusetts. Guides for other states are in development.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-4">
          <p className="text-sm font-bold text-[#0B3D8C] mb-3">How to use this directory</p>
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-700">
            {[
              { n: 1, bold: 'Pick a category', desc: 'from the section above to filter by referral source type' },
              { n: 2, bold: 'Read the article', desc: '— open any card for step-by-step instructions on getting listed' },
              { n: 3, bold: 'Log your referral', desc: 'submissions in your dashboard to track outcomes over time' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0B3D8C] text-white rounded-full text-sm flex items-center justify-center font-bold">{s.n}</span>
                <span><strong>{s.bold}</strong> {s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected category header */}
        {selectedCategory && categoryInfo && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl border mb-5"
            style={{ backgroundColor: categoryInfo.color.badge, borderColor: categoryInfo.color.light }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: categoryInfo.color.light }}>
              <categoryInfo.icon className="w-4 h-4" style={{ color: categoryInfo.color.base }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900">{categoryInfo.name}</h2>
              <p className="text-sm text-gray-500">{categoryInfo.description}</p>
            </div>
            <button onClick={() => handleCategorySelect(null)} className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 border border-gray-300 bg-white rounded-lg px-2.5 py-1.5">
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}

        {/* Toolbar */}
        {!loading && (
          <div className="flex items-center justify-between mb-5" id="article-grid">
            <p className="text-gray-500 text-sm">
              <span className="font-semibold text-gray-900">{filteredArticles.length}</span>
              {articles.length !== filteredArticles.length && <> of <span className="font-semibold text-gray-900">{articles.length}</span></>}
              {' '}{filteredArticles.length === 1 ? 'source' : 'sources'}
              {selectedCategory && categoryInfo && <> in <span className="font-semibold text-gray-900">{categoryInfo.name}</span></>}
              {searchQuery && <> matching <span className="font-semibold text-gray-900">&ldquo;{searchQuery}&rdquo;</span></>}
            </p>
            <div className="flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid' ? 'bg-[#0B3D8C] text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                <Grid className="w-3.5 h-3.5" /><span className="hidden sm:inline">Grid</span>
              </button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[#0B3D8C] text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                <List className="w-3.5 h-3.5" /><span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0B3D8C] border-t-transparent mb-3" />
              <p className="text-gray-400 text-sm">Loading sources…</p>
            </div>
          </div>
        )}

        {!loading && overviewArticle && (
          <CategoryHeroCard slug={overviewArticle.slug} title={overviewArticle.title} excerpt={overviewArticle.excerpt ?? null} category={overviewArticle.category ?? null} updatedAt={overviewArticle.updatedAt} />
        )}

        {!loading && regularArticles.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularArticles.map(article => <KnowledgeBaseCard key={article.id} {...article} category={article.category} />)}
          </div>
        )}

        {!loading && regularArticles.length > 0 && viewMode === 'list' && (
          <div className="flex flex-col gap-2.5">
            {regularArticles.map(article => <KnowledgeBaseListItem key={article.id} {...article} category={article.category} />)}
          </div>
        )}

        {!loading && filteredArticles.length === 0 && articles.length > 0 && (
          <div className="text-center py-16">
            <Book className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">No sources found</h3>
            <p className="text-gray-400 text-sm mb-4">Try a different search term or category.</p>
            <button onClick={() => { setSearchInput(''); setSearchQuery(''); setSelectedCategory(null); }} className="px-4 py-2 bg-[#0B3D8C] text-white rounded-lg text-sm hover:bg-[#0a3578] transition-colors">
              Clear filters
            </button>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-16">
            <Book className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No articles available yet. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense>
      <KnowledgeBasePageInner />
    </Suspense>
  );
}
