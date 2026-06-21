'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getCategoryBySlug } from '@/lib/categoryConfig';

interface CategorySidebarProps {
  selectedCategory: string | null;
  onSelectCategory: (categorySlug: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: {
    base: string;
    light: string;
    dark: string;
    badge: string;
  };
  order: number;
  count: number;
}

export default function CategorySidebar({
  selectedCategory,
  onSelectCategory,
  isOpen,
  onClose,
}: CategorySidebarProps) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/knowledge-base/categories');
      const data = await response.json();
      setCategories(data.categories || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categorySlug: string | null) => {
    onSelectCategory(categorySlug);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-80 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:border-none">
          <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Category List */}
        <nav className="flex-1 p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {/* All Categories */}
              <li>
                <button
                  onClick={() => handleCategoryClick(null)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                    text-sm font-medium transition-colors
                    ${
                      selectedCategory === null
                        ? 'bg-blue-50 text-[#0B4F96] border border-[#0B4F96]'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>All Categories</span>
                  <span
                    className={`
                      px-2 py-0.5 rounded-full text-xs font-semibold
                      ${
                        selectedCategory === null
                          ? 'bg-[#0B4F96] text-white'
                          : 'bg-gray-200 text-gray-600'
                      }
                    `}
                  >
                    {totalCount}
                  </span>
                </button>
              </li>

              {/* Individual Categories */}
              {categories.map((category) => {
                const categoryInfo = getCategoryBySlug(category.slug);
                const Icon = categoryInfo?.icon;
                const isSelected = selectedCategory === category.slug;

                if (!Icon) return null;

                return (
                  <li key={category.id}>
                    <button
                      onClick={() => handleCategoryClick(category.slug)}
                      className={`
                        w-full flex items-start gap-3 px-3 py-2.5 rounded-lg
                        text-sm font-medium transition-all
                        ${
                          isSelected
                            ? 'border shadow-sm'
                            : 'hover:bg-gray-50'
                        }
                      `}
                      style={{
                        backgroundColor: isSelected ? category.color.badge : 'transparent',
                        borderColor: isSelected ? category.color.base : 'transparent',
                        color: isSelected ? category.color.dark : '#374151',
                      }}
                    >
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center mt-0.5"
                        style={{
                          backgroundColor: category.color.light,
                        }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: category.color.base }}
                        />
                      </div>
                      <span className="flex-1 text-left leading-tight pt-0.5">{category.name}</span>
                      <span
                        className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold self-start mt-0.5"
                        style={{
                          backgroundColor: isSelected ? category.color.base : '#E5E7EB',
                          color: isSelected ? 'white' : '#4B5563',
                        }}
                      >
                        {category.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
}
