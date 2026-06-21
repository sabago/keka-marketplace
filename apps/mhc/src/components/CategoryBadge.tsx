import { getCategoryBySlug, getCategoryColor } from '@/lib/categoryConfig';

interface CategoryBadgeProps {
  category: string | null;
  size?: 'small' | 'medium';
  className?: string;
}

export default function CategoryBadge({ category, size = 'small', className = '' }: CategoryBadgeProps) {
  if (!category) return null;

  const categoryInfo = getCategoryBySlug(category);
  const color = getCategoryColor(category);

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: color.badge,
        color: color.dark,
      }}
    >
      {categoryInfo?.name || category}
    </span>
  );
}
