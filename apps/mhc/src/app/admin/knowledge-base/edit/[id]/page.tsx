'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminPageLayout from '@/components/AdminPageLayout';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    state: '',
    tags: '',
    content: '',
    excerpt: '',
    published: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge-base/${id}`);

      if (!response.ok) {
        setError('Article not found');
        return;
      }

      const data = await response.json();
      const article = data.article;

      setFormData({
        slug: article.slug,
        title: article.title,
        state: article.state,
        tags: article.tags.join(', '),
        content: article.content,
        excerpt: article.excerpt || '',
        published: article.published,
      });
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.slug || !formData.title || !formData.state || !formData.content) {
      setError('Please fill in all required fields (slug, title, state, content)');
      return;
    }

    // Convert tags string to array
    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      setSaving(true);

      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: formData.slug,
          title: formData.title,
          state: formData.state,
          tags: tagsArray,
          content: formData.content,
          excerpt: formData.excerpt || null,
          published: formData.published,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update article');
        return;
      }

      alert('Article updated successfully!');
      router.push('/admin/knowledge-base');
    } catch (error) {
      console.error('Error updating article:', error);
      setError('Failed to update article');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]"></div>
          <p className="mt-4 text-gray-600">Loading article...</p>
        </div>
      </AdminPageLayout>
    );
  }

  if (error && loading) {
    return (
      <AdminPageLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
          <button
            onClick={() => router.push('/admin/knowledge-base')}
            className="mt-4 px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
          >
            Back to Knowledge Base
          </button>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/knowledge-base')}
            className="flex items-center gap-2 text-[#0B4F96] hover:text-[#48ccbc] mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Knowledge Base</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Article</h1>
        </div>

        {/* Error Message */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="e.g., MassOptions: Massachusetts Aging & Disability Resource Center"
            />
          </div>

          {/* Slug */}
          <div className="mb-6">
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="e.g., massoptions"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          {/* State */}
          <div className="mb-6">
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              maxLength={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="e.g., MA"
            />
            <p className="text-sm text-gray-500 mt-1">
              Two-letter state code
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="e.g., State Portal, Free, Government"
            />
            <p className="text-sm text-gray-500 mt-1">
              Comma-separated tags
            </p>
          </div>

          {/* Excerpt */}
          <div className="mb-6">
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="Short description for list view (optional)"
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content (Markdown) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent font-mono text-sm"
              placeholder="# Article Title&#10;&#10;Content goes here..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Use markdown syntax for formatting
            </p>
          </div>

          {/* Published Checkbox */}
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={handleChange}
                className="w-4 h-4 text-[#0B4F96] border-gray-300 rounded focus:ring-[#0B4F96]"
              />
              <span className="text-sm font-medium text-gray-700">
                Publish immediately
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/knowledge-base')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminPageLayout>
  );
}
