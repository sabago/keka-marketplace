'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Shield,
  AlertCircle,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import AgencyDetailCard from '@/components/admin/AgencyDetailCard';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import ApprovalModal from '@/components/admin/ApprovalModal';
import RejectionModal from '@/components/admin/RejectionModal';
import { ApprovalStatus } from '@prisma/client';

export default function AdminAgencyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agencyId = params.id as string;

  const [agency, setAgency] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch agency details
  const fetchAgency = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch agency details');
      }

      const data = await response.json();
      setAgency(data.agency);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching agency:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (agencyId) {
      fetchAgency();
    }
  }, [agencyId]);

  const handleApprove = async (notes?: string) => {
    setActionInProgress('approve');

    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve agency');
      }

      setSuccessMessage('Agency approved successfully! Approval email sent.');
      setIsApprovalModalOpen(false);
      await fetchAgency(); // Refresh data
    } catch (err) {
      throw err; // Let modal handle the error
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (reason: string, notes?: string) => {
    setActionInProgress('reject');

    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reject agency');
      }

      setSuccessMessage('Agency rejected successfully! Rejection email sent.');
      setIsRejectionModalOpen(false);
      await fetchAgency(); // Refresh data
    } catch (err) {
      throw err; // Let modal handle the error
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Please provide a reason for suspending this agency (minimum 10 characters):');

    if (!reason) {
      return; // User cancelled
    }

    if (reason.trim().length < 10) {
      alert('Suspension reason must be at least 10 characters');
      return;
    }

    if (!confirm('Are you sure you want to suspend this agency? They will lose access to the platform.')) {
      return;
    }

    setActionInProgress('suspend');

    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to suspend agency');
      }

      setSuccessMessage('Agency suspended successfully.');
      await fetchAgency(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate this agency?')) {
      return;
    }

    setActionInProgress('reactivate');

    try {
      const response = await fetch(`/api/admin/agencies/${agencyId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reactivate agency');
      }

      setSuccessMessage('Agency reactivated successfully.');
      await fetchAgency(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading agency details...</p>
        </div>
      </div>
    );
  }

  if (error && !agency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-2">Error Loading Agency</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/admin/agencies')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to List
            </button>
            <button
              onClick={fetchAgency}
              className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/agencies')}
            className="flex items-center text-gray-600 hover:text-[#0B4F96] mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agency List
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{agency.agencyName}</h1>
              <p className="text-gray-600 mt-1">License: {agency.licenseNumber}</p>
            </div>
            <button
              onClick={fetchAgency}
              className="px-4 py-2 text-gray-600 hover:text-[#0B4F96] transition-colors flex items-center"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Administrative Actions</h2>
          <div className="flex flex-wrap gap-3">
            {/* PENDING: Show Approve and Reject */}
            {agency.approvalStatus === ApprovalStatus.PENDING && (
              <>
                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  disabled={actionInProgress !== null}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {actionInProgress === 'approve' ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Agency
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsRejectionModalOpen(true)}
                  disabled={actionInProgress !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {actionInProgress === 'reject' ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Agency
                    </>
                  )}
                </button>
              </>
            )}

            {/* APPROVED: Show Suspend */}
            {agency.approvalStatus === ApprovalStatus.APPROVED && (
              <button
                onClick={handleSuspend}
                disabled={actionInProgress !== null}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {actionInProgress === 'suspend' ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Suspending...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Suspend Agency
                  </>
                )}
              </button>
            )}

            {/* SUSPENDED: Show Reactivate */}
            {agency.approvalStatus === ApprovalStatus.SUSPENDED && (
              <button
                onClick={handleReactivate}
                disabled={actionInProgress !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {actionInProgress === 'reactivate' ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Reactivate Agency
                  </>
                )}
              </button>
            )}

            {/* REJECTED: No actions or allow re-review */}
            {agency.approvalStatus === ApprovalStatus.REJECTED && (
              <div className="text-sm text-gray-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                This agency has been rejected. Contact support to re-review.
              </div>
            )}
          </div>
        </div>

        {/* Agency Details */}
        <div className="mb-6">
          <AgencyDetailCard agency={agency} />
        </div>

        {/* Audit Log */}
        <div>
          <AuditLogViewer actions={agency.adminActions || []} />
        </div>
      </div>

      {/* Modals */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onApprove={handleApprove}
        agencyName={agency.agencyName}
      />

      <RejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onReject={handleReject}
        agencyName={agency.agencyName}
      />
    </div>
  );
}
