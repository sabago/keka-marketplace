'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, Loader2, X } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  agency: { id: string; agencyName: string; approvalStatus: string } | null;
  passwordSetupTokens: { used: boolean; expiresAt: string }[];
}

interface Agency {
  id: string;
  agencyName: string;
}

function inviteStatus(user: AdminUser): string {
  const token = user.passwordSetupTokens[0];
  if (!token) return 'No invite';
  if (token.used) return 'Accepted';
  if (new Date(token.expiresAt) < new Date()) return 'Expired';
  return 'Pending';
}

function inviteStatusBadge(status: string): string {
  switch (status) {
    case 'Accepted': return 'bg-green-50 text-green-700';
    case 'Pending': return 'bg-yellow-50 text-yellow-700';
    case 'Expired': return 'bg-red-50 text-red-700';
    default: return 'bg-gray-50 text-gray-500';
  }
}

export default function AdminAdminsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showSuperadminModal, setShowSuperadminModal] = useState(false);
  const [showAgencyAdminModal, setShowAgencyAdminModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', agencyId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const isPlatformAdmin = session?.user?.role === 'PLATFORM_ADMIN';

  const fetchAdmins = useCallback(async () => {
    const res = await fetch('/api/admin/admins');
    const data = await res.json();
    if (!data.error) setAdmins(data.admins ?? []);
    setLoading(false);
  }, []);

  const fetchAgencies = useCallback(async () => {
    const res = await fetch('/api/admin/agencies?limit=100&status=APPROVED');
    const data = await res.json();
    if (!data.error) setAgencies(data.agencies ?? []);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    if (!session || (role !== 'PLATFORM_ADMIN' && role !== 'SUPERADMIN')) {
      router.replace('/dashboard');
      return;
    }
    fetchAdmins();
    fetchAgencies();
  }, [session, status, router, fetchAdmins, fetchAgencies]);

  const handleInviteSuperadmin = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/invite-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed'); return; }
      setShowSuperadminModal(false);
      setForm({ name: '', email: '', agencyId: '' });
      fetchAdmins();
    } catch {
      setFormError('An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteAgencyAdmin = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/invite-agency-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, agencyId: form.agencyId }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed'); return; }
      setShowAgencyAdminModal(false);
      setForm({ name: '', email: '', agencyId: '' });
      fetchAdmins();
    } catch {
      setFormError('An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const superadmins = admins.filter((a) => a.role === 'SUPERADMIN');
  const agencyAdmins = admins.filter((a) => a.role === 'AGENCY_ADMIN');

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  const AdminTable = ({ users, emptyText }: { users: AdminUser[]; emptyText: string }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {users.length === 0 ? (
        <p className="text-center py-10 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Agency</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invite Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => {
              const inv = inviteStatus(u);
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {u.agency?.agencyName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inviteStatusBadge(inv)}`}>
                      {inv}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const InviteModal = ({
    title,
    onClose,
    onSubmit,
    showAgency,
  }: {
    title: string;
    onClose: () => void;
    onSubmit: () => void;
    showAgency: boolean;
  }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
          </div>
          {showAgency && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agency</label>
              <select
                value={form.agencyId}
                onChange={(e) => setForm({ ...form, agencyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              >
                <option value="">Select agency...</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.agencyName}</option>
                ))}
              </select>
            </div>
          )}
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onSubmit}
              disabled={submitting || !form.name.trim() || !form.email.trim() || (showAgency && !form.agencyId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] disabled:opacity-50 text-sm font-medium"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Sending...' : 'Send Invite'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-gray-500 mt-1">Manage superadmins and agency admins</p>
        </div>

        {/* Superadmins section — PLATFORM_ADMIN only */}
        {isPlatformAdmin && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Superadmins</h2>
                <p className="text-sm text-gray-500">Can manage agencies. Never have an agency of their own.</p>
              </div>
              <button
                onClick={() => { setForm({ name: '', email: '', agencyId: '' }); setFormError(''); setShowSuperadminModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Invite Superadmin
              </button>
            </div>
            <AdminTable users={superadmins} emptyText="No superadmins yet." />
          </div>
        )}

        {/* Agency Admins section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Agency Admins</h2>
              <p className="text-sm text-gray-500">One admin per agency. Manages staff credentials for their agency.</p>
            </div>
            <button
              onClick={() => { setForm({ name: '', email: '', agencyId: '' }); setFormError(''); setShowAgencyAdminModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Invite Agency Admin
            </button>
          </div>
          <AdminTable users={agencyAdmins} emptyText="No agency admins yet." />
        </div>
      </div>

      {showSuperadminModal && (
        <InviteModal
          title="Invite Superadmin"
          onClose={() => setShowSuperadminModal(false)}
          onSubmit={handleInviteSuperadmin}
          showAgency={false}
        />
      )}

      {showAgencyAdminModal && (
        <InviteModal
          title="Invite Agency Admin"
          onClose={() => setShowAgencyAdminModal(false)}
          onSubmit={handleInviteAgencyAdmin}
          showAgency={true}
        />
      )}
    </div>
  );
}
