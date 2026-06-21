'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, CheckCircle, Bot } from 'lucide-react';
import CredentialReviewModal from '@/components/documents/CredentialReviewModal';

interface PendingCredential {
  id: string;
  fileName: string;
  aiConfidence: number | null;
  reviewNotes: string | null;
  createdAt: string;
  documentType: { id: string; name: string };
  staffMember: {
    firstName: string;
    lastName: string;
    email: string;
    agency: { id: string; agencyName: string } | null;
  };
}

function confidenceLabel(score: number | null): { text: string; cls: string } {
  if (score === null) return { text: 'N/A', cls: 'text-gray-500' };
  if (score >= 0.7) return { text: `${Math.round(score * 100)}%`, cls: 'text-green-700' };
  if (score >= 0.5) return { text: `${Math.round(score * 100)}%`, cls: 'text-yellow-700' };
  return { text: `${Math.round(score * 100)}%`, cls: 'text-red-700' };
}

function confidenceBg(score: number | null): string {
  if (score === null) return 'bg-gray-200';
  if (score >= 0.7) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-400';
  return 'bg-red-500';
}

export default function CredentialReviewQueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [credentials, setCredentials] = useState<PendingCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/credentials/pending');
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else { setCredentials(data.credentials ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    const allowedRoles = ['AGENCY_ADMIN', 'PLATFORM_ADMIN', 'SUPERADMIN'];
    if (!session || !allowedRoles.includes(role ?? '')) {
      router.replace('/dashboard');
      return;
    }
    fetchPending();
  }, [session, status, router, fetchPending]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Credential Review Queue</h1>
          <p className="text-gray-500 mt-1">
            Review AI-parsed credentials — sorted by lowest confidence first.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
        )}

        {credentials.length === 0 && !error ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
            <p className="text-sm text-gray-500">No credentials are currently pending review.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Staff Member</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Document Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Uploaded</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">AI Confidence</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Flags</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {credentials.map((cred) => {
                  const conf = confidenceLabel(cred.aiConfidence);
                  return (
                    <tr key={cred.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {cred.staffMember.firstName} {cred.staffMember.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{cred.staffMember.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{cred.documentType.name}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                        {new Date(cred.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Bot className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <span className={`text-xs font-semibold ${conf.cls}`}>{conf.text}</span>
                            {cred.aiConfidence !== null && (
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${confidenceBg(cred.aiConfidence)}`}
                                  style={{ width: `${Math.round(cred.aiConfidence * 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {cred.reviewNotes ? (
                          <div className="flex items-center gap-1 text-xs text-yellow-700">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="line-clamp-1">{cred.reviewNotes}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setReviewingId(cred.id)}
                          className="px-3 py-1.5 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-xs font-medium whitespace-nowrap"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewingId && (
        <CredentialReviewModal
          documentId={reviewingId}
          onClose={() => setReviewingId(null)}
          onSuccess={() => {
            setReviewingId(null);
            fetchPending();
          }}
        />
      )}
    </div>
  );
}
