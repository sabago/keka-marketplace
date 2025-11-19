import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { getCategoryBySlug } from '@/lib/categoryConfig';

interface CategoryHeroCardProps {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  updatedAt: string;
}

export default function CategoryHeroCard({
  slug,
  title,
  excerpt,
  category,
  updatedAt,
}: CategoryHeroCardProps) {
  const categoryInfo = getCategoryBySlug(category);
  const color = categoryInfo?.color;

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 shadow-lg hover:shadow-xl transition-shadow bg-white mb-8"
      style={{
        borderColor: color?.base || '#0B4F96',
      }}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background: `linear-gradient(90deg, ${color?.base || '#0B4F96'}, ${color?.dark || '#1E40AF'})`,
        }}
      />

      <div className="p-8 pt-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: color?.light || '#DBEAFE',
              }}
            >
              <BookOpen
                className="w-6 h-6"
                style={{ color: color?.base || '#2563EB' }}
              />
            </div>
            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2"
                style={{
                  backgroundColor: color?.badge || '#EFF6FF',
                  color: color?.dark || '#1E40AF',
                }}
              >
                📚 Overview Guide
              </span>
              {categoryInfo && (
                <p className="text-sm text-gray-600">
                  {categoryInfo.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <Link href={`/knowledge-base/${slug}`}>
          <h3
            className="text-2xl md:text-3xl font-bold mb-4 hover:underline"
            style={{ color: color?.dark || '#1E40AF' }}
          >
            {title}
          </h3>
        </Link>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-700 text-base leading-relaxed mb-6 line-clamp-3">
            {excerpt}
          </p>
        )}

        {/* CTA */}
        <Link
          href={`/knowledge-base/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:gap-3 shadow-md hover:shadow-lg"
          style={{
            backgroundColor: color?.base || '#2563EB',
          }}
        >
          Read Complete Guide
          <ArrowRight className="w-5 h-5" />
        </Link>

        {/* Updated date */}
        <p className="text-xs text-gray-500 mt-4">
          Last updated: {new Date(updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}
