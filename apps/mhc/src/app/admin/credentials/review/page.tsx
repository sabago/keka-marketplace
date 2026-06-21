'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import CredentialReviewCard from '@/components/admin/CredentialReviewCard';
import DocumentViewer from '@/components/admin/DocumentViewer';

interface Credential {
  id: string;
  fileName: string;
  mimeType: string;
  issuer: string | null;
  licenseNumber: string | null;
  issueDate: Date | null;
  expirationDate: Date | null;
  verificationUrl: string | null;
  aiConfidence: number | null;
  aiParsedData: any;
  reviewStatus: string;
  reviewNotes: string | null;
  status: string;
  createdAt: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    agency: {
      id: string;
      agencyName: string;
    };
  };
  documentType: {
    name: string;
  };
  downloadUrl?: string;
}

const statusTabs = [
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'NEEDS_CORRECTION', label: 'Needs Correction' },
];

export default function AdminCredentialReviewPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch credentials list
  useEffect(() => {
    fetchCredentials();
  }, [statusFilter, currentPage]);

  const fetchCredentials = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: '20',
      });

      const response = await fetch(`/api/admin/credentials/pending?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch credentials');
      }

      const data = await response.json();
      setCredentials(data.credentials);
      setStats(data.stats);

      // Auto-select first credential if none selected
      if (data.credentials.length > 0 && !selectedCredential) {
        fetchCredentialDetail(data.credentials[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching credentials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCredentialDetail = async (credentialId: string) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/admin/credentials/${credentialId}/review`);

      if (!response.ok) {
        throw new Error('Failed to fetch credential details');
      }

      const data = await response.json();
      setSelectedCredential(data.credential);
    } catch (err) {
      console.error('Error fetching credential detail:', err);
      alert('Failed to load credential details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCredentialClick = (credential: Credential) => {
    fetchCredentialDetail(credential.id);
  };

  const handleApprove = async (notes?: string) => {
    if (!selectedCredential) return;

    try {
      const response = await fetch(`/api/admin/credentials/${selectedCredential.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve credential');
      }

      // Refresh list and clear selection
      await fetchCredentials();
      setSelectedCredential(null);
      alert('Credential approved successfully');
    } catch (error) {
      console.error('Error approving:', error);
      throw error;
    }
  };

  const handleReject = async (notes: string) => {
    if (!selectedCredential) return;

    try {
      const response = await fetch(`/api/admin/credentials/${selectedCredential.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject credential');
      }

      // Refresh list and clear selection
      await fetchCredentials();
      setSelectedCredential(null);
      alert('Credential rejected');
    } catch (error) {
      console.error('Error rejecting:', error);
      throw error;
    }
  };

  const handleRequestCorrection = async (notes: string) => {
    if (!selectedCredential) return;

    try {
      const response = await fetch(`/api/admin/credentials/${selectedCredential.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'needs_correction',
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request correction');
      }

      await fetchCredentials();
      setSelectedCredential(null);
      alert('Correction requested — employee will be notified');
    } catch (error) {
      console.error('Error requesting correction:', error);
      throw error;
    }
  };

  const handleEdit = async (corrections: any, notes?: string) => {
    if (!selectedCredential) return;

    try {
      const response = await fetch(`/api/admin/credentials/${selectedCredential.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          corrections,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save edits');
      }

      // Refresh list and clear selection
      await fetchCredentials();
      setSelectedCredential(null);
      alert('Credential corrected and approved');
    } catch (error) {
      console.error('Error editing:', error);
      throw error;
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setSelectedCredential(null);
    }
  };

  const handleNextPage = () => {
    if (currentPage < stats.totalPages) {
      setCurrentPage(currentPage + 1);
      setSelectedCredential(null);
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null;

    const percent = Math.round(confidence * 100);
    let colorClass = '';

    if (confidence >= 0.9) colorClass = 'bg-green-100 text-green-700';
    else if (confidence >= 0.7) colorClass = 'bg-yellow-100 text-yellow-700';
    else colorClass = 'bg-red-100 text-red-700';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        <Sparkles className="h-3 w-3" />
        {percent}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credential Review</h1>
          <p className="text-gray-600 mt-2">
            Review and approve AI-parsed credentials from employees
          </p>
        </div>

        {/* Status Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <nav className="flex -mb-px overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                  setSelectedCredential(null);
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  statusFilter === tab.value
                    ? 'border-[#0B4F96] text-[#0B4F96]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {!isLoading && statusFilter === tab.value && (
                  <span className="ml-2 bg-[#0B4F96] text-white text-xs px-2 py-0.5 rounded-full">
                    {stats.total}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Credentials List */}
          <div className="col-span-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Credentials ({stats.total})</h2>
            </div>

            <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
              {isLoading && (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading credentials...</p>
                </div>
              )}

              {error && (
                <div className="p-8 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-900 font-medium">{error}</p>
                </div>
              )}

              {!isLoading && !error && credentials.length === 0 && (
                <div className="p-8 text-center">
                  <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No credentials to review</p>
                </div>
              )}

              {!isLoading && credentials.map((credential) => (
                <button
                  key={credential.id}
                  onClick={() => handleCredentialClick(credential)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedCredential?.id === credential.id ? 'bg-blue-50 border-l-4 border-[#0B4F96]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {credential.documentType.name}
                    </h3>
                    {getConfidenceBadge(credential.aiConfidence)}
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {credential.employee.firstName} {credential.employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {credential.employee.agency.agencyName}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(credential.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {!isLoading && stats.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {stats.totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= stats.totalPages}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Detail View */}
          <div className="col-span-8 space-y-6">
            {isLoadingDetail && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading details...</p>
              </div>
            )}

            {!isLoadingDetail && !selectedCredential && !isLoading && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Select a credential to review</p>
              </div>
            )}

            {!isLoadingDetail && selectedCredential && (
              <>
                {/* Document Viewer */}
                <DocumentViewer
                  fileName={selectedCredential.fileName}
                  downloadUrl={selectedCredential.downloadUrl!}
                  mimeType={selectedCredential.mimeType}
                />

                {/* Review Card */}
                <CredentialReviewCard
                  credential={selectedCredential}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={handleEdit}
                  onRequestCorrection={handleRequestCorrection}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
