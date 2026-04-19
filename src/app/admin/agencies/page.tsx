'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import AgencyList from '@/components/admin/AgencyList';
import { ApprovalStatus, AgencySize } from '@prisma/client';

type ActiveTab = 'AGENCIES' | 'USERS';
type StatusFilter = 'ALL' | ApprovalStatus;

interface AgencyUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Agency {
  id: string;
  agencyName: string;
  licenseNumber: string;
  agencySize: AgencySize;
  primaryContactName: string;
  primaryContactEmail: string;
  approvalStatus: ApprovalStatus;
  createdAt: string | Date;
  serviceArea: string[];
  users: AgencyUser[];
  _count?: {
    users: number;
  };
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerified: string | null;
  agency: { id: string; agencyName: string } | null;
}

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

export default function AdminAgenciesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('AGENCIES');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users tab state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersTotal, setUsersTotal] = useState(0);

  // Fetch agencies
  useEffect(() => {
    const fetchAgencies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '10',
        });

        if (statusFilter !== 'ALL') {
          params.append('status', statusFilter);
        }

        if (searchQuery) {
          params.append('search', searchQuery);
        }

        const response = await fetch(`/api/admin/agencies?${params}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch agencies');
        }

        const data = await response.json();
        setAgencies(data.agencies);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching agencies:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgencies();
  }, [statusFilter, searchQuery, currentPage]);

  // Fetch users when Users tab is active
  useEffect(() => {
    if (activeTab !== 'USERS') return;
    const fetchUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const response = await fetch('/api/admin/users?limit=200');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data.users);
        setUsersTotal(data.total);
      } catch (err) {
        setUsersError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleAgencyClick = (agencyId: string) => {
    router.push(`/admin/agencies/${agencyId}`);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agency Management</h1>
            <p className="text-gray-600 mt-2">
              Review and manage agency applications and approvals
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/agencies/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Agency
          </button>
        </div>

        {/* Top-level tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1">
            {(['AGENCIES', 'USERS'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#0B4F96] text-[#0B4F96]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'AGENCIES' ? 'Agencies' : 'Users'}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'AGENCIES' && (
          <>
            {/* Filters and Search */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
              {/* Status Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => handleStatusChange(tab.value)}
                      className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                        statusFilter === tab.value
                          ? 'border-[#0B4F96] text-[#0B4F96]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                      {!isLoading && statusFilter === tab.value && (
                        <span className="ml-2 bg-[#0B4F96] text-white text-xs px-2 py-0.5 rounded-full">
                          {pagination.total}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Search Bar */}
              <div className="p-4">
                <form onSubmit={handleSearch} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search by agency name, license number, or location..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B4F96] transition-colors"
                  >
                    Search
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchInput('');
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin mb-4" />
                  <p className="text-gray-600">Loading agencies...</p>
                </div>
              )}
              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
                  <p className="text-red-600 font-medium mb-2">Error Loading Agencies</p>
                  <p className="text-gray-600 text-sm mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
              {!isLoading && !error && (
                <div className="p-6">
                  <AgencyList agencies={agencies} onAgencyClick={handleAgencyClick} />
                </div>
              )}
              {!isLoading && !error && agencies.length > 0 && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing{' '}
                      <span className="font-medium">{(currentPage - 1) * pagination.limit + 1}</span>{' '}
                      to{' '}
                      <span className="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span>{' '}
                      of <span className="font-medium">{pagination.total}</span> agencies
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </button>
                      <div className="text-sm text-gray-600">
                        Page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{pagination.totalPages}</span>
                      </div>
                      <button
                        onClick={handleNextPage}
                        disabled={!pagination.hasMore}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'USERS' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {usersLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin mb-4" />
                <p className="text-gray-600">Loading users...</p>
              </div>
            )}
            {usersError && !usersLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
                <p className="text-red-600 font-medium">{usersError}</p>
              </div>
            )}
            {!usersLoading && !usersError && (
              <>
                <div className="p-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{usersTotal}</span> users across all agencies
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agency</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No users found</td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr
                            key={user.id}
                            onClick={() => user.agency && router.push(`/admin/agencies/${user.agency.id}`)}
                            className={`hover:bg-gray-50 transition-colors ${user.agency ? 'cursor-pointer' : ''}`}
                          >
                            <td className="px-6 py-4 font-medium text-gray-900">{user.name || '—'}</td>
                            <td className="px-6 py-4 text-gray-600">{user.email}</td>
                            <td className="px-6 py-4">
                              {(() => {
                                const roleBadge: Record<string, { color: string; label: string }> = {
                                  AGENCY_ADMIN:   { color: 'bg-blue-100 text-blue-700',     label: 'Admin' },
                                  PLATFORM_ADMIN: { color: 'bg-red-100 text-red-700',       label: 'Platform Admin' },
                                  SUPERADMIN:     { color: 'bg-purple-100 text-purple-700', label: 'Superadmin' },
                                };
                                const badge = roleBadge[user.role] ?? { color: 'bg-gray-100 text-gray-700', label: 'Employee' };
                                return (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 text-gray-600">{user.agency?.agencyName || '—'}</td>
                            <td className="px-6 py-4">
                              {user.emailVerified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-amber-600">Pending Setup</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
