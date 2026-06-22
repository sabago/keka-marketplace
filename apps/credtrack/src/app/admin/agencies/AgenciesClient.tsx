'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Search, Plus, ChevronLeft, ChevronRight, Users, Building2 } from 'lucide-react';

type ApprovalStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

interface AgencyUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isPrimaryContact: boolean;
}

interface Agency {
  id: string;
  agencyName: string;
  licenseNumber: string;
  primaryContactName: string;
  primaryContactEmail: string;
  approvalStatus: string;
  subscriptionPlan: string;
  createdAt: string;
  users: AgencyUser[];
  _count: { staffMembers: number };
}

const STATUS_TABS: ApprovalStatus[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    SUSPENDED: 'bg-gray-100 text-gray-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
};

export default function AdminAgenciesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<ApprovalStatus>(
    (searchParams.get('status') as ApprovalStatus) ?? 'ALL'
  );
  const [activeSection, setActiveSection] = useState<'AGENCIES' | 'USERS'>('AGENCIES');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAgencies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      status: activeTab,
      page: String(page),
      limit: '10',
    });
    if (search) params.set('search', search);

    const res = await fetch(`/api/admin/agencies?${params.toString()}`);
    const data = await res.json();
    if (!data.error) {
      setAgencies(data.agencies ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    }
    setLoading(false);
  }, [activeTab, page, search]);

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    if (!session || (role !== 'PLATFORM_ADMIN' && role !== 'SUPERADMIN')) {
      router.replace('/dashboard');
      return;
    }
    fetchAgencies();
  }, [session, status, router, fetchAgencies]);

  // All users across agencies for the USERS tab
  const allUsers = agencies.flatMap((a) =>
    a.users.map((u) => ({ ...u, agencyName: a.agencyName, agencyId: a.id }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agencies</h1>
            <p className="text-gray-500 mt-1">Manage agency registrations and users</p>
          </div>
          <Link
            href="/admin/agencies/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Agency
          </Link>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          {(['AGENCIES', 'USERS'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeSection === section
                  ? 'bg-white text-[#0B4F96] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {section === 'AGENCIES' ? (
                <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />Agencies</span>
              ) : (
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />Users</span>
              )}
            </button>
          ))}
        </div>

        {activeSection === 'AGENCIES' && (
          <>
            {/* Status Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-200">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab
                      ? 'border-[#0B4F96] text-[#0B4F96]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              />
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B4F96]" />
                </div>
              ) : agencies.length === 0 ? (
                <div className="text-center py-16 text-gray-500">No agencies found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Agency</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Contact</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {agencies.map((agency) => (
                      <tr
                        key={agency.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{agency.agencyName}</p>
                          <p className="text-xs text-gray-400">{agency.licenseNumber}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                          {agency.subscriptionPlan}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(agency.approvalStatus)}`}>
                            {agency.approvalStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-gray-700">{agency.primaryContactName}</p>
                          <p className="text-xs text-gray-400">{agency.primaryContactEmail}</p>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-gray-500">
                          {new Date(agency.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                <p>Showing {agencies.length} of {total} agencies</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>Page {page} of {pages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeSection === 'USERS' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B4F96]" />
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No users found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Agency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.name || '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        <Link href={`/admin/agencies/${u.agencyId}`} className="hover:text-[#0B4F96]">
                          {u.agencyName}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
