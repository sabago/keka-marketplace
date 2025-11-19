'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Custom heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold text-gray-800 mt-5 mb-2" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-2" {...props} />
          ),
          // Custom paragraph styles
          p: ({ node, ...props }) => (
            <p className="text-gray-700 leading-relaxed mb-4" {...props} />
          ),
          // Custom link styles
          a: ({ node, ...props }) => (
            <a
              className="text-[#0B4F96] hover:text-[#48ccbc] underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Custom list styles
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="ml-4" {...props} />
          ),
          // Custom blockquote styles
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-[#48ccbc] pl-4 italic text-gray-600 my-4"
              {...props}
            />
          ),
          // Custom code styles
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code
                className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono"
                {...props}
              />
            ) : (
              <code
                className="block bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4"
                {...props}
              />
            ),
          // Custom table styles
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border border-gray-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-100" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 px-4 py-2" {...props} />
          ),
          // Custom horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-gray-300" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
