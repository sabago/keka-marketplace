'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shield, Mail, User, Plus, Loader2, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

interface Superadmin {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  emailVerified: string | null;
}

export default function SuperadminsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    if (session.user?.role !== 'PLATFORM_ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchSuperadmins();
  }, [session, status, router]);

  const fetchSuperadmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/invite-superadmin');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch superadmins');
      }
      const data = await response.json();
      setSuperadmins(data.superadmins);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite superadmin');
      }

      setInviteSuccess(true);
      setInviteEmail('');
      setInviteName('');
      await fetchSuperadmins();
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInviteForm(false);
      }, 2000);
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
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <p>Invitation sent successfully! The superadmin will receive an email to set up their account.</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                    disabled={inviteLoading || inviteSuccess}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="Jane Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={inviteLoading || inviteSuccess}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    placeholder="jane@platform.com"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  The superadmin will receive an email invitation with a link to set up their password.
                  They will be able to create and approve agencies on the platform.
                  The invitation link expires in 24 hours.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={inviteLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || inviteSuccess}
                  className="flex-1 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
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

        {/* Superadmins List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              Active Superadmins ({superadmins.length})
            </h2>
          </div>

          {superadmins.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No superadmins yet. Invite one to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {superadmins.map((superadmin) => (
                <div key={superadmin.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-[#0B4F96] rounded-full flex items-center justify-center text-white font-semibold">
                      {superadmin.name ? superadmin.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{superadmin.name || '(no name)'}</p>
                      <p className="text-sm text-gray-600">{superadmin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {superadmin.emailVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
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
                          <button
                            onClick={() => handleResend(superadmin.id)}
                            disabled={resendingId === superadmin.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {resendingId === superadmin.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Resend
                          </button>
                        )}
                      </>
                    )}
                    <span className="text-xs text-gray-500">
                      Invited {new Date(superadmin.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
