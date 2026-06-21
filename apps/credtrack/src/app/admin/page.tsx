'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Building2, Users, Clock, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';

interface PlatformStats {
  totalAgencies: number;
  pendingAgencies: number;
  approvedAgencies: number;
  totalUsers: number;
  recentActions: {
    id: string;
    actionType: string;
    createdAt: string;
    notes: string | null;
    admin: { id: string; name: string | null; email: string };
    targetAgency: { id: string; agencyName: string } | null;
  }[];
}

function formatActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    if (!session || (role !== 'PLATFORM_ADMIN' && role !== 'SUPERADMIN')) {
      router.replace('/dashboard');
      return;
    }

    fetch('/api/admin/platform-stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setStats(data);
      })
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and management</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[#0B4F96]" />
              </div>
              <span className="text-sm text-gray-500">Total Agencies</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAgencies}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-500">Pending Approval</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingAgencies}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Approved</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.approvedAgencies}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        {/* Pending Approvals Banner */}
        {stats.pendingAgencies > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">
                  {stats.pendingAgencies} {stats.pendingAgencies === 1 ? 'agency' : 'agencies'} pending approval
                </p>
                <p className="text-sm text-yellow-700">Review and approve or reject pending agency registrations.</p>
              </div>
            </div>
            <Link
              href="/admin/agencies?status=PENDING"
              className="flex items-center gap-1 text-sm font-medium text-yellow-800 hover:text-yellow-900 whitespace-nowrap ml-4"
            >
              Review now
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/admin/agencies"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-[#0B4F96]" />
              <span className="font-medium text-gray-900 group-hover:text-[#0B4F96]">Agencies</span>
            </div>
            <p className="text-sm text-gray-500">Manage agency registrations, approvals, and users</p>
          </Link>
          <Link
            href="/admin/admins"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-[#0B4F96]" />
              <span className="font-medium text-gray-900 group-hover:text-[#0B4F96]">Admins</span>
            </div>
            <p className="text-sm text-gray-500">Manage superadmins and agency admin users</p>
          </Link>
        </div>

        {/* Recent Admin Actions */}
        {stats.recentActions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent Admin Actions</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {stats.recentActions.map((action) => (
                <div key={action.id} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatActionType(action.actionType)}</p>
                    {action.targetAgency && (
                      <p className="text-xs text-gray-500">{action.targetAgency.agencyName}</p>
                    )}
                    {action.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{action.notes}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">{action.admin.name || action.admin.email}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(action.createdAt).toLocaleDateString()}
                    </p>
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
