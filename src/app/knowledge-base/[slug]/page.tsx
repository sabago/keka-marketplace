'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ArticleSections, { parseArticleSections, ArticleSection } from '@/components/ArticleSections';
import ArticleTOC from '@/components/ArticleTOC';
import CategoryBadge from '@/components/CategoryBadge';
import LogReferralModal from '@/components/LogReferralModal';
import {
  ArrowLeft, Calendar, MapPin, Heart, ClipboardList,
  Info, ChevronRight, ExternalLink, DollarSign, Share2,
  ChevronDown, Search
} from 'lucide-react';
import { categories, getCategoryBySlug } from '@/lib/categoryConfig';

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
  officialUrl?: string;
  costLevel?: string;
  sourceType?: string;
}

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category?: string | null;
}

// Compact category dropdown for the top nav
function CategoryDropdown({
  selectedCategory,
  onSelect,
}: {
  selectedCategory: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = getCategoryBySlug(selectedCategory);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
      >
        {selected ? (
          <>
            <selected.icon className="w-3.5 h-3.5" style={{ color: selected.color.base }} />
            <span className="max-w-[140px] truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-500">All categories</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!selectedCategory ? 'text-[#0B3D8C] font-semibold' : 'text-gray-700'}`}
          >
            All categories
          </button>
          <div className="h-px bg-gray-100 mx-2 my-1" />
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { onSelect(cat.slug); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition-colors ${selectedCategory === cat.slug ? 'font-semibold' : 'text-gray-700'}`}
              style={selectedCategory === cat.slug ? { color: cat.color.dark } : {}}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.color.light }}>
                <cat.icon className="w-3 h-3" style={{ color: cat.color.base }} />
              </div>
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const slug = params.slug as string;
  const fromCategory = searchParams.get('from');

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralJustLogged, setReferralJustLogged] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [expandRequest, setExpandRequest] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isLoggedIn = !!session?.user;

  const backCategoryInfo = getCategoryBySlug(fromCategory);
  const backUrl = fromCategory ? `/knowledge-base?category=${fromCategory}` : '/knowledge-base';
  const backLabel = backCategoryInfo ? backCategoryInfo.name : 'Referral Directory';

  useEffect(() => { if (slug) fetchArticle(); }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/knowledge-base/${slug}`);
      if (!res.ok) { setError(res.status === 404 ? 'Article not found' : 'Failed to load article'); return; }
      const data = await res.json();
      setArticle(data.article);
      setSections(parseArticleSections(data.article.content || ''));
      if (data.article?.category) fetchRelated(data.article.category, data.article.slug);
      if (isLoggedIn) checkFavorited(data.article.slug);
    } catch { setError('Failed to load article'); }
    finally { setLoading(false); }
  };

  const fetchRelated = async (category: string, currentSlug: string) => {
    try {
      const res = await fetch(`/api/knowledge-base?category=${encodeURIComponent(category)}&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      setRelatedArticles((data.articles || []).filter((a: RelatedArticle) => a.slug !== currentSlug).slice(0, 4));
    } catch { /* non-critical */ }
  };

  const checkFavorited = async (articleSlug: string) => {
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) return;
      const data = await res.json();
      setIsFavorited((data.favorites || []).some((f: any) => f.articleSlug === articleSlug));
    } catch { /* non-critical */ }
  };

  const toggleFavorite = async () => {
    if (!isLoggedIn || !article) return;
    setFavoriteLoading(true);
    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleSlug: article.slug }),
      });
      if (res.ok) setIsFavorited(!isFavorited);
    } catch { /* non-critical */ }
    finally { setFavoriteLoading(false); }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* non-critical */ }
  };

  const handleCategoryNav = (slug: string | null) => {
    router.push(slug ? `/knowledge-base?category=${slug}` : '/knowledge-base');
  };

  const handleTOCClick = useCallback((id: string) => {
    setExpandRequest(id);
    setTimeout(() => setExpandRequest(null), 100);
  }, []);

  const formattedDate = article
    ? new Date(article.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const articleCategoryInfo = article?.category ? getCategoryBySlug(article.category) : undefined;
  const costLabel = article?.costLevel === 'free' ? 'Free' : article?.costLevel === 'paid' ? 'Paid' : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Top navigation bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
          {/* Back */}
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0B3D8C] hover:text-[#0a3578] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <span className="text-gray-300 flex-shrink-0">|</span>

          {/* Category dropdown */}
          <CategoryDropdown
            selectedCategory={article?.category ?? fromCategory}
            onSelect={handleCategoryNav}
          />

          {/* Breadcrumb — desktop only */}
          {article && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 min-w-0 ml-1">
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{article.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-9 w-9 border-2 border-[#0B3D8C] border-t-transparent mb-3" />
              <p className="text-gray-400 text-sm">Loading guide…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="max-w-md mx-auto text-center py-24">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Info className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{error}</h2>
            <p className="text-gray-400 text-sm mb-6">The guide you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <Link href="/knowledge-base" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B3D8C] text-white rounded-xl text-sm font-medium hover:bg-[#0a3578] transition-colors">
              Browse All Guides
            </Link>
          </div>
        )}

        {article && !loading && !error && (
          <div className="flex gap-10 items-start">

            {/* ── Main article column ── */}
            <div className="flex-1 min-w-0">

              {/* Article header card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
                {/* Category color bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: articleCategoryInfo ? `linear-gradient(90deg, ${articleCategoryInfo.color.base}, ${articleCategoryInfo.color.dark})` : '#0B3D8C' }}
                />

                <div className="p-6 sm:p-8">
                  {/* Badge row */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {article.category && <CategoryBadge category={article.category} size="medium" />}
                    {costLabel && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${costLabel === 'Free' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                        <DollarSign className="w-3 h-3" />
                        {costLabel}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {article.title}
                  </h1>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-5">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{article.state}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Updated {formattedDate}</span>
                    {article.officialUrl && (
                      <a href={article.officialUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[#0B3D8C] hover:underline font-medium">
                        <ExternalLink className="w-3.5 h-3.5" />Official site
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-start gap-3">
                    {!isLoggedIn ? (
                      <Link href="/auth/signin" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors">
                        Sign in to save &amp; track referrals
                      </Link>
                    ) : (
                      <>
                        <div className="flex flex-col items-start gap-0.5">
                          <button
                            onClick={toggleFavorite}
                            disabled={favoriteLoading}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${isFavorited ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                          >
                            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                            {isFavorited ? 'Saved' : 'Save source'}
                          </button>
                          <span className="text-xs text-gray-400 pl-1">Bookmark for quick access</span>
                        </div>
                        <div className="flex flex-col items-start gap-0.5">
                          <button
                            onClick={() => setShowReferralModal(true)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${referralJustLogged ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-[#0B3D8C] text-white hover:bg-[#0a3578]'}`}
                          >
                            <ClipboardList className="w-4 h-4" />
                            {referralJustLogged ? 'Logged!' : 'Log a referral'}
                          </button>
                          <span className="text-xs text-gray-400 pl-1">{referralJustLogged ? 'Log again for another contact' : 'Record that you contacted this source'}</span>
                        </div>
                      </>
                    )}
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors ml-auto"
                    >
                      <Share2 className="w-4 h-4" />
                      {copied ? 'Copied!' : 'Share'}
                    </button>
                  </div>
                </div>

                {/* What is this guide */}
                <div className="mx-6 sm:mx-8 mb-6 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 text-[#0B3D8C] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong className="text-[#0B3D8C]">What is this guide?</strong>{' '}
                    {articleCategoryInfo?.howToUse
                      ? `This guide explains how to get referrals from ${article.title}. ${articleCategoryInfo.howToUse}.`
                      : `How to get referrals from ${article.title} — who to contact, how to apply, and what to expect.`}
                  </p>
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="mx-6 sm:mx-8 mb-6 flex flex-wrap gap-1.5">
                    {article.tags.map((tag, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Article accordion body */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 sm:px-8 py-2 mb-5">
                <ArticleSections sections={sections} expandedOverride={expandRequest} />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mb-10">
                <Link href={backUrl} className="inline-flex items-center gap-2 text-sm font-medium text-[#0B3D8C] hover:text-[#0a3578] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back to {backLabel}
                </Link>
                <span className="text-xs text-gray-400">Updated {formattedDate}</span>
              </div>

              {/* Related */}
              {relatedArticles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    More in {articleCategoryInfo?.name || article.category}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relatedArticles.map(rel => (
                      <Link
                        key={rel.id}
                        href={`/knowledge-base/${rel.slug}${article.category ? `?from=${article.category}` : ''}`}
                        className="group flex flex-col p-4 bg-white rounded-xl border border-gray-200 hover:border-[#0B3D8C]/30 hover:shadow-md transition-all"
                      >
                        <p className="font-semibold text-sm text-gray-900 group-hover:text-[#0B3D8C] leading-snug mb-1 transition-colors">{rel.title}</p>
                        {rel.excerpt && <p className="text-xs text-gray-400 line-clamp-2">{rel.excerpt}</p>}
                        <span className="mt-2 text-xs text-[#0B3D8C] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Read guide →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── TOC right rail ── */}
            <ArticleTOC sections={sections} onSectionClick={handleTOCClick} />
          </div>
        )}
      </div>

      <LogReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        onSuccess={() => {
          setShowReferralModal(false);
          setReferralJustLogged(true);
          setTimeout(() => setReferralJustLogged(false), 2500);
        }}
        prefillSlug={article?.slug}
      />
    </div>
  );
}
