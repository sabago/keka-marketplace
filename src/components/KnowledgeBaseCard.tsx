'use client';

import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import { getCategoryColor } from '@/lib/categoryConfig';

interface KnowledgeBaseCardProps {
  id: string;
  slug: string;
  title: string;
  state: string;
  category?: string | null;
  tags: string[];
  excerpt?: string | null;
  updatedAt: string;
}

export default function KnowledgeBaseCard({
  slug,
  title,
  state,
  category,
  tags,
  excerpt,
  updatedAt,
}: KnowledgeBaseCardProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const color = getCategoryColor(category ?? null);

  return (
    <Link href={`/knowledge-base/${slug}`}>
      <div
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 h-full cursor-pointer border-l-4 border-r border-t border-b border-gray-200 hover:shadow-xl"
        style={{
          borderLeftColor: color.base,
        }}
      >
        {/* Category Badge */}
        {category && (
          <div className="mb-3">
            <CategoryBadge category={category} size="small" />
          </div>
        )}

        {/* State and Date */}
        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">{state}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-[#0B4F96] transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-700 mb-4 line-clamp-3">{excerpt}</p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Read More Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <span className="text-[#0B4F96] font-medium hover:text-[#48ccbc] transition-colors">
            Read More →
          </span>
        </div>
      </div>
    </Link>
  );
}
