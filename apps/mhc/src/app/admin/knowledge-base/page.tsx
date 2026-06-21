'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageLayout from '@/components/AdminPageLayout';
import { useAdminAccess } from '@/lib/adminUtils';
import { Book, Plus, Edit, Trash2, Download } from 'lucide-react';

interface Article {
  id: string;
  slug: string;
  title: string;
  state: string;
  tags: string[];
  published: boolean;
  updatedAt: string;
}

export default function AdminKnowledgeBasePage() {
  const router = useRouter();
  const { hasAdminAccess: isAdmin } = useAdminAccess();
  const adminLoading = false;

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, adminLoading, router]);

  useEffect(() => {
    if (isAdmin) {
      fetchArticles();
    }
  }, [isAdmin]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      // Fetch all articles (including unpublished) for admin
      const response = await fetch('/api/knowledge-base');
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm('This will import all markdown files from the content directory. Continue?')) {
      return;
    }

    try {
      setSeeding(true);
      const response = await fetch('/api/admin/knowledge-base/seed', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Seeding completed!\nCreated: ${data.results.created.length}\nUpdated: ${data.results.updated.length}\nErrors: ${data.results.errors.length}`);
        fetchArticles();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error seeding:', error);
      alert('Failed to seed articles');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteId(id);
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setArticles(articles.filter(a => a.id !== id));
        alert('Article deleted successfully');
      } else {
        alert('Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
    } finally {
      setDeleteId(null);
    }
  };

  if (adminLoading || !isAdmin) {
    return null;
  }

  return (
    <AdminPageLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Book className="w-8 h-8 text-[#0B4F96]" />
              <h1 className="text-3xl font-bold text-gray-900">
                Knowledge Base Management
              </h1>
            </div>
            <p className="text-gray-600">
              Manage knowledge base articles and content
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>{seeding ? 'Seeding...' : 'Seed from Markdown'}</span>
            </button>
            <button
              onClick={() => router.push('/admin/knowledge-base/new')}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Article</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]"></div>
            <p className="mt-4 text-gray-600">Loading articles...</p>
          </div>
        )}

        {/* Articles Table */}
        {!loading && articles.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {article.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        /{article.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{article.state}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{article.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          article.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {article.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(article.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/knowledge-base/edit/${article.id}`)}
                          className="text-[#0B4F96] hover:text-[#48ccbc] transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          disabled={deleteId === article.id}
                          className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No articles yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating a new article or seeding from markdown files.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Seed from Markdown
              </button>
              <button
                onClick={() => router.push('/admin/knowledge-base/new')}
                className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
              >
                Create New Article
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
}
