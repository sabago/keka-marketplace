'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Loader2, Ban, RefreshCw } from 'lucide-react';

interface AgencyDetail {
  id: string;
  agencyName: string;
  licenseNumber: string;
  primaryContactName: string;
  primaryContactEmail: string;
  approvalStatus: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  subscriptionPlan: string;
  createdAt: string;
  users: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isPrimaryContact: boolean;
    isActive: boolean;
    createdAt: string;
  }[];
  adminActions: {
    id: string;
    actionType: string;
    notes: string | null;
    createdAt: string;
    admin: { id: string; name: string | null; email: string };
  }[];
  _count: { staffMembers: number };
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    SUSPENDED: 'bg-gray-100 text-gray-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
};

export default function AgencyDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const agencyId = params?.id as string;

  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [showReasonFor, setShowReasonFor] = useState<'reject' | 'suspend' | null>(null);

  const fetchAgency = useCallback(async () => {
    const res = await fetch(`/api/admin/agencies/${agencyId}`);
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    setAgency(data.agency);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    if (!session || (role !== 'PLATFORM_ADMIN' && role !== 'SUPERADMIN')) {
      router.replace('/dashboard');
      return;
    }
    fetchAgency();
  }, [session, status, router, fetchAgency]);

  const doAction = async (action: 'approve' | 'reject' | 'suspend' | 'reactivate', reason?: string) => {
    setActionLoading(action);
    try {
      const body = reason ? { reason } : undefined;
      const res = await fetch(`/api/admin/agencies/${agencyId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Action failed'); return; }
      setShowReasonFor(null);
      setReasonInput('');
      await fetchAgency();
    } catch {
      setError('An error occurred.');
    } finally {
      setActionLoading('');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  if (error && !agency) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!agency) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/admin/agencies" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B4F96] mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Agencies
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
        )}

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agency.agencyName}</h1>
              <p className="text-sm text-gray-500 mt-1">License: {agency.licenseNumber}</p>
              <p className="text-sm text-gray-500">Plan: {agency.subscriptionPlan}</p>
              <p className="text-sm text-gray-500">Created: {new Date(agency.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge(agency.approvalStatus)}`}>
                {agency.approvalStatus}
              </span>
            </div>
          </div>

          {agency.rejectionReason && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <span className="font-medium">Rejection reason:</span> {agency.rejectionReason}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {agency.approvalStatus === 'PENDING' && (
              <>
                <button
                  onClick={() => doAction('approve')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  onClick={() => setShowReasonFor('reject')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
            {agency.approvalStatus === 'APPROVED' && (
              <button
                onClick={() => setShowReasonFor('suspend')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium"
              >
                <Ban className="h-4 w-4" />
                Suspend
              </button>
            )}
            {(agency.approvalStatus === 'SUSPENDED' || agency.approvalStatus === 'REJECTED') && (
              <button
                onClick={() => doAction('reactivate')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading === 'reactivate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reactivate
              </button>
            )}
          </div>

          {/* Reason input for reject/suspend */}
          {showReasonFor && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {showReasonFor === 'reject' ? 'Rejection reason' : 'Suspension reason'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!reasonInput.trim()) return;
                    doAction(showReasonFor, reasonInput);
                  }}
                  disabled={!reasonInput.trim() || !!actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${showReasonFor}`}
                </button>
                <button
                  onClick={() => { setShowReasonFor(null); setReasonInput(''); }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users */}
        <div className="bg-white border border-gray-200 rounded-xl mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Users</h2>
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{agency.users.length}</span>
          </div>
          {agency.users.length === 0 ? (
            <p className="text-sm text-gray-500 p-5">No users for this agency.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {agency.users.map((u) => (
                <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{u.role}</span>
                    {u.isPrimaryContact && (
                      <span className="text-xs bg-purple-50 text-purple-700 rounded-full px-2 py-0.5">Primary</span>
                    )}
                    <span className={`text-xs rounded-full px-2 py-0.5 ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Actions History */}
        {agency.adminActions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Action History</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {agency.adminActions.map((action) => (
                <div key={action.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {action.actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {action.notes && <p className="text-xs text-gray-500 mt-0.5">{action.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">{action.admin.name || action.admin.email}</p>
                    <p className="text-xs text-gray-400">{new Date(action.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
