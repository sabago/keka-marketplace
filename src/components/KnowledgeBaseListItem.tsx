'use client';

import Link from 'next/link';
import { Calendar, MapPin, Tag } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import { getCategoryColor } from '@/lib/categoryConfig';

interface KnowledgeBaseListItemProps {
  id: string;
  slug: string;
  title: string;
  state: string;
  category?: string | null;
  tags: string[];
  excerpt?: string | null;
  updatedAt: string;
}

export default function KnowledgeBaseListItem({
  slug,
  title,
  state,
  category,
  tags,
  excerpt,
  updatedAt,
}: KnowledgeBaseListItemProps) {
  const formattedDate = new Date(updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const color = getCategoryColor(category ?? null);

  return (
    <Link href={`/knowledge-base/${slug}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-5 cursor-pointer border-l-4 border-r border-t border-b border-gray-200 hover:bg-gray-50 hover:shadow-lg"
        style={{
          borderLeftColor: color.base,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Content */}
          <div className="flex-1 min-w-0">
            {/* Category Badge */}
            {category && (
              <div className="mb-2">
                <CategoryBadge category={category} size="small" />
              </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-[#0B4F96] transition-colors">
              {title}
            </h3>

            {/* Excerpt */}
            {excerpt && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{excerpt}</p>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
                {tags.length > 4 && (
                  <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">
                    +{tags.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Metadata */}
          <div className="flex flex-col items-end gap-2 text-sm text-gray-600 flex-shrink-0">
            <div className="flex items-center gap-1 bg-[#0B4F96] text-white px-3 py-1 rounded-full">
              <MapPin className="w-3 h-3" />
              <span className="font-medium">{state}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
