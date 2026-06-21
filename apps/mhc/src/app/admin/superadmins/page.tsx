'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shield, Mail, User, Plus, Loader2, AlertCircle, CheckCircle, X, RefreshCw, Pencil, Trash2, Building2 } from 'lucide-react';

interface Agency {
  id: string;
  agencyName: string;
}

interface Superadmin {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  emailVerified: string | null;
  isActive: boolean;
  agencyId: string | null;
  agency: { id: string; agencyName: string } | null;
}

export default function SuperadminsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Resend
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Superadmin | null>(null);
  const [editAgencyId, setEditAgencyId] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Superadmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/signin'); return; }
    if (session.user?.role !== 'PLATFORM_ADMIN') { router.push('/dashboard'); return; }
    fetchSuperadmins();
    fetchAgencies();
  }, [session, status, router]);

  const fetchSuperadmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/invite-superadmin');
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch superadmins');
      const data = await response.json();
      setSuperadmins(data.superadmins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      const res = await fetch('/api/admin/agencies?limit=500');
      if (!res.ok) return;
      const data = await res.json();
      setAgencies((data.agencies || []).map((a: any) => ({ id: a.id, agencyName: a.agencyName })));
    } catch { /* non-critical */ }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);
    try {
      const response = await fetch('/api/admin/invite-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to invite superadmin');
      setInviteSuccess(true);
      setInviteEmail('');
      setInviteName('');
      await fetchSuperadmins();
      setTimeout(() => { setInviteSuccess(false); setShowInviteForm(false); }, 2000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResend = async (userId: string) => {
    setResendingId(userId);
    setResendSuccess(null);
    try {
      const response = await fetch('/api/admin/invite-superadmin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to resend');
      setResendSuccess(userId);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const openEdit = (superadmin: Superadmin) => {
    setEditTarget(superadmin);
    setEditAgencyId(superadmin.agencyId ?? '');
    setEditIsActive(superadmin.isActive);
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/superadmins/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: editAgencyId || null,
          isActive: editIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setSuperadmins(prev => prev.map(s =>
        s.id === editTarget.id
          ? {
              ...s,
              agencyId: data.superadmin.agencyId,
              isActive: data.superadmin.isActive,
              agency: agencies.find(a => a.id === data.superadmin.agencyId) ?? null,
            }
          : s
      ));
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/superadmins/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setSuperadmins(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete superadmin');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#0B4F96]" />
              Superadmins
            </h1>
            <p className="text-gray-600 mt-1">
              Manage platform-level superadmins who can create and approve agencies.
            </p>
          </div>
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] transition-colors font-semibold"
          >
            <Plus className="h-5 w-5" />
            Invite Superadmin
          </button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Invite New Superadmin</h2>
              <button onClick={() => { setShowInviteForm(false); setInviteError(null); setInviteSuccess(false); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <p>Invitation sent successfully!</p>
              </div>
            )}
            {inviteError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p>{inviteError}</p>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} required disabled={inviteLoading || inviteSuccess}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent" placeholder="Jane Smith" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required disabled={inviteLoading || inviteSuccess}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent" placeholder="jane@platform.com" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">The superadmin will receive an email invitation with a link to set up their password. The invitation link expires in 24 hours.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowInviteForm(false); setInviteError(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50" disabled={inviteLoading}>Cancel</button>
                <button type="submit" disabled={inviteLoading || inviteSuccess}
                  className="flex-1 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {inviteLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Active Superadmins ({superadmins.length})</h2>
          </div>

          {superadmins.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No superadmins yet. Invite one to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {superadmins.map(superadmin => (
                <div key={superadmin.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${superadmin.isActive ? 'bg-[#0B4F96]' : 'bg-gray-400'}`}>
                      {superadmin.name ? superadmin.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{superadmin.name || '(no name)'}</p>
                      <p className="text-sm text-gray-600">{superadmin.email}</p>
                      {superadmin.agency && (
                        <p className="text-xs text-[#0B4F96] flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {superadmin.agency.agencyName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {!superadmin.isActive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                        Deactivated
                      </span>
                    )}
                    {superadmin.isActive && superadmin.emailVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : superadmin.isActive && (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                          Pending Setup
                        </span>
                        {resendSuccess === superadmin.id ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Sent!
                          </span>
                        ) : (
                          <button onClick={() => handleResend(superadmin.id)} disabled={resendingId === superadmin.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50">
                            {resendingId === superadmin.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Resend
                          </button>
                        )}
                      </>
                    )}
                    <span className="text-xs text-gray-500">Invited {new Date(superadmin.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => openEdit(superadmin)} title="Edit superadmin"
                      className="p-1.5 text-gray-400 hover:text-[#0B4F96] hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(superadmin)} title="Delete superadmin"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit Superadmin</h2>
                <p className="text-sm text-gray-500 mt-0.5">{editTarget.name} · {editTarget.email}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-5">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {editError}
                </div>
              )}

              {/* Agency association */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline h-4 w-4 mr-1 text-gray-400" />
                  Agency Association
                </label>
                <select
                  value={editAgencyId}
                  onChange={e => setEditAgencyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent text-sm"
                >
                  <option value="">— No agency —</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.agencyName}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This superadmin can be an agency admin or team member of any agency on the platform.
                </p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Active</p>
                  <p className="text-xs text-gray-500 mt-0.5">Deactivated superadmins cannot sign in</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editIsActive ? 'bg-[#0B4F96]' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${editIsActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)} disabled={editLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {editLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Delete Superadmin</h2>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to permanently delete <strong>{deleteTarget.name || deleteTarget.email}</strong>? Their account will be removed from the platform.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {deleteLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
