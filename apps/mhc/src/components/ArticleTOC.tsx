'use client';

import { useEffect, useState, useRef } from 'react';
import { ArticleSection } from './ArticleSections';

interface ArticleTOCProps {
  sections: ArticleSection[];
  onSectionClick: (id: string) => void;
}

export default function ArticleTOC({ sections, onSectionClick }: ArticleTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Only show non-intro, non-content sections in TOC
  const tocSections = sections.filter(s => s.id !== 'intro' && s.id !== 'content');

  useEffect(() => {
    if (tocSections.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id.replace('section-', ''));
        }
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0 }
    );

    tocSections.forEach(section => {
      const el = document.getElementById(`section-${section.id}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocSections.map(s => s.id).join(',')]);

  const handleClick = (id: string) => {
    onSectionClick(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  if (tocSections.length < 2) return null;

  return (
    <aside className="hidden xl:block w-56 flex-shrink-0">
      <nav className="sticky top-24">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
          On this page
        </p>
        <ul className="space-y-px">
          {tocSections.map((section) => {
            const isActive = activeId === section.id;
            return (
              <li key={section.id}>
                <button
                  onClick={() => handleClick(section.id)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-all leading-snug ${
                    isActive
                      ? 'text-[#0B4F96] font-semibold bg-blue-50 border-l-2 border-[#0B4F96] pl-3'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {section.heading}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
