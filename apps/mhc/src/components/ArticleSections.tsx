'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export interface ArticleSection {
  id: string;
  heading: string;
  content: string;
}

interface ArticleSectionsProps {
  sections: ArticleSection[];
  onSectionToggle?: (id: string, expanded: boolean) => void;
  expandedOverride?: string | null; // When TOC clicks, force-expand this section
}

export function parseArticleSections(markdown: string): ArticleSection[] {
  const lines = markdown.split('\n');
  const sections: ArticleSection[] = [];
  let currentHeading = '';
  let currentId = '';
  let currentLines: string[] = [];
  let preambleLines: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (!inSection && preambleLines.length > 0) {
        // Content before the first ## becomes an "intro" section with no heading
        const preambleContent = preambleLines.join('\n').trim();
        if (preambleContent) {
          sections.push({ id: 'intro', heading: 'Introduction', content: preambleContent });
        }
      } else if (inSection && currentLines.length > 0) {
        sections.push({ id: currentId, heading: currentHeading, content: currentLines.join('\n').trim() });
      }
      currentHeading = h2Match[1];
      currentId = h2Match[1]
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      currentLines = [];
      inSection = true;
    } else if (!inSection) {
      preambleLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  // Push last section
  if (inSection && currentLines.length > 0) {
    sections.push({ id: currentId, heading: currentHeading, content: currentLines.join('\n').trim() });
  } else if (!inSection && preambleLines.length > 0) {
    // No ## headings at all — treat entire content as one section
    const content = preambleLines.join('\n').trim();
    if (content) {
      sections.push({ id: 'content', heading: 'Content', content });
    }
  }

  return sections;
}

export default function ArticleSections({ sections, onSectionToggle, expandedOverride }: ArticleSectionsProps) {
  // All sections start collapsed — user opens what they need
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    new Set(sections.filter(s => s.id !== 'intro' && s.id !== 'content').map(s => s.id))
  );

  const toggleSection = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        onSectionToggle?.(id, true);
      } else {
        next.add(id);
        onSectionToggle?.(id, false);
      }
      return next;
    });
  }, [onSectionToggle]);

  // When TOC requests a section expand, ensure it's not in collapsed set
  useEffect(() => {
    if (!expandedOverride) return;
    setCollapsed(prev => {
      if (!prev.has(expandedOverride)) return prev;
      const next = new Set(prev);
      next.delete(expandedOverride);
      return next;
    });
  }, [expandedOverride]);

  if (sections.length === 0) return null;

  // If only one section and it's "Content" (no headings in markdown), render flat
  if (sections.length === 1 && sections[0].id === 'content') {
    return (
      <div className="article-content">
        <MarkdownRenderer content={sections[0].content} />
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.id);
        // Don't show accordion toggle for intro section — always expanded
        const isIntro = section.id === 'intro';

        return (
          <div key={section.id} id={`section-${section.id}`} className="scroll-mt-4">
            {isIntro ? (
              <div className="py-4 article-content">
                <MarkdownRenderer content={section.content} />
              </div>
            ) : (
              <>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between py-4 text-left group hover:bg-gray-50 px-1 rounded transition-colors"
                  aria-expanded={!isCollapsed}
                >
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#0B4F96] transition-colors">
                    {section.heading}
                  </h2>
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform" />
                  )}
                </button>
                {!isCollapsed && (
                  <div className="pb-5 article-content">
                    <MarkdownRenderer content={section.content} />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
