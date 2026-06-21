'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Building2, Users, CheckCircle, Clock, AlertTriangle,
  ShieldCheck, FileCheck, ChevronRight, Crown
} from 'lucide-react';

// ─── Admin dashboard view ─────────────────────────────────────────────────────

interface PlatformStats {
  totalAgencies: number;
  pendingAgencies: number;
  approvedAgencies: number;
  totalUsers: number;
  recentActions: {
    id: string;
    actionType: string;
    createdAt: string;
    admin: { name: string | null; email: string };
    targetAgency: { agencyName: string } | null;
  }[];
}

function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/platform-stats')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: 'Total Agencies', value: stats.totalAgencies, color: 'bg-blue-50 text-[#0B4F96]' },
          { icon: Clock, label: 'Pending Approval', value: stats.pendingAgencies, color: 'bg-yellow-50 text-yellow-600' },
          { icon: CheckCircle, label: 'Approved', value: stats.approvedAgencies, color: 'bg-green-50 text-green-600' },
          { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'bg-purple-50 text-purple-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Pending banner */}
      {stats.pendingAgencies > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              {stats.pendingAgencies} {stats.pendingAgencies === 1 ? 'agency' : 'agencies'} pending approval
            </p>
          </div>
          <Link href="/admin/agencies?status=PENDING" className="flex items-center gap-1 text-sm font-medium text-yellow-800 hover:text-yellow-900 ml-4">
            Review <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/agencies" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="h-5 w-5 text-[#0B4F96]" />
            <span className="font-medium text-gray-900 group-hover:text-[#0B4F96]">Agencies</span>
          </div>
          <p className="text-sm text-gray-500">Manage registrations and approvals</p>
        </Link>
        <Link href="/admin/admins" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-5 w-5 text-[#0B4F96]" />
            <span className="font-medium text-gray-900 group-hover:text-[#0B4F96]">Admins</span>
          </div>
          <p className="text-sm text-gray-500">Invite and manage admin users</p>
        </Link>
      </div>

      {/* Recent actions */}
      {stats.recentActions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Recent Admin Actions</div>
          <div className="divide-y divide-gray-50">
            {stats.recentActions.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {a.actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                  {a.targetAgency && <p className="text-xs text-gray-500">{a.targetAgency.agencyName}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">{a.admin.name || a.admin.email}</p>
                  <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agency admin view ────────────────────────────────────────────────────────

interface AgencyStats {
  pendingReview: number;
  expiringSoon: number;
  expired: number;
  staffCount: number;
}

function AgencyAdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AgencyStats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/compliance/dashboard?countsOnly=true').then((r) => r.json()),
      fetch('/api/staff').then((r) => r.json()),
    ]).then(([compliance, staff]) => {
      setStats({
        pendingReview: compliance?.stats?.documents?.pendingReview ?? 0,
        expiringSoon: compliance?.stats?.documents?.expiringSoon ?? 0,
        expired: compliance?.stats?.documents?.expired ?? 0,
        staffCount: (staff?.records ?? []).length,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Welcome back, {session?.user?.name || session?.user?.email}
        </h2>
        <p className="text-gray-500 text-sm">Here's your agency at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Staff Members', value: stats?.staffCount ?? '—', href: '/agency/staff', color: 'bg-purple-50 text-purple-600' },
          { icon: FileCheck, label: 'Pending Review', value: stats?.pendingReview ?? '—', href: '/agency/credentials/review', color: 'bg-blue-50 text-[#0B4F96]' },
          { icon: AlertTriangle, label: 'Expiring Soon', value: stats?.expiringSoon ?? '—', href: '/agency/compliance', color: 'bg-yellow-50 text-yellow-600' },
          { icon: ShieldCheck, label: 'Expired', value: stats?.expired ?? '—', href: '/agency/compliance', color: 'bg-red-50 text-red-600' },
        ].map(({ icon: Icon, label, value, href, color }) => (
          <Link key={label} href={href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/agency" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 mb-1">
            <Building2 className="h-5 w-5 text-[#0B4F96]" />
            <span className="font-medium text-gray-900 group-hover:text-[#0B4F96]">My Agency</span>
          </div>
          <p className="text-sm text-gray-500">Overview, staff, compliance, settings</p>
        </Link>
        <Link href="/agency/credentials/review" className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#0B4F96] hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3 mb-1">
            <FileCheck className="h-5 w-5 text-[#0B4F96]" />
            <span className="font-medium text-gray-900 group-hover:text-[#0B4F96]">Review Queue</span>
          </div>
          <p className="text-sm text-gray-500">Verify AI-parsed credential documents</p>
        </Link>
      </div>
    </div>
  );
}

// ─── Employee view ────────────────────────────────────────────────────────────

function EmployeeDashboard() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Welcome back, {session?.user?.name || session?.user?.email}
        </h2>
        <p className="text-gray-500 text-sm">Manage your credentials and compliance documents.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Crown className="h-5 w-5 text-[#0B4F96]" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">Your Credentials</h3>
          <p className="text-sm text-gray-500 mb-3">Upload and manage your compliance documents here.</p>
          <Link
            href="/my-credentials"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm font-medium"
          >
            View My Credentials
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  const role = session.user?.role;
  const orgId = (session.user as { orgId?: string | null })?.orgId;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {(role === 'PLATFORM_ADMIN' || role === 'SUPERADMIN') && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1 text-sm">Platform overview</p>
            </div>
            <AdminDashboard />
            {/* PLATFORM_ADMIN with an agency also gets agency section */}
            {role === 'PLATFORM_ADMIN' && orgId && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">My Agency</h2>
                <AgencyAdminDashboard />
              </div>
            )}
          </>
        )}

        {role === 'AGENCY_ADMIN' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <AgencyAdminDashboard />
          </>
        )}

        {role === 'AGENCY_USER' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <EmployeeDashboard />
          </>
        )}
      </div>
    </div>
  );
}
