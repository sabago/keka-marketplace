'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FileText,
  AlertCircle,
  Upload,
  Loader2,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import CredentialCard from '@/components/employee/CredentialCard';
import ComplianceScoreWidget from '@/components/employee/ComplianceScoreWidget';

interface DashboardData {
  employee: {
    firstName: string;
    lastName: string;
  };
  stats: {
    totalCredentials: number;
    compliant: number;
    compliancePercentage: number;
    pendingReview: number;
    expiringSoon: number;
    expired: number;
    active: number;
    needsActionCount: number;
    flaggedCount: number;
  };
  categoryBreakdown?: { category: "LICENSE" | "BACKGROUND_CHECK" | "TRAINING" | "HR" | "ID" | "INSURANCE" | "VACCINATION" | "COMPETENCY" | "OTHER"; compliant: number; total: number }[];
  credentials: any[];
  needsAction: any[];
}

type FilterType = 'all' | 'needs-action' | 'active' | 'pending' | 'expired';
type SortOption = 'name-asc' | 'name-desc' | 'expiration-asc' | 'expiration-desc' | 'upload-asc' | 'upload-desc';

export default function CredentialsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === 'AGENCY_ADMIN' ||
    session?.user?.role === 'PLATFORM_ADMIN' ||
    session?.user?.role === 'SUPERADMIN';

  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string | null>(null);
  const isSuspended = liveApprovalStatus === 'SUSPENDED' || liveApprovalStatus === 'REJECTED';
  const actionsDisabled = isSuspended && !isAdmin;

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('expiration-asc');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statusData, response] = await Promise.all([
        fetch('/api/agency/status').then((r) => r.ok ? r.json() : null),
        fetch('/api/employee/credentials/dashboard'),
      ]);
      if (statusData?.approvalStatus) setLiveApprovalStatus(statusData.approvalStatus);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch credentials');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadRenewal = () => {
    router.push('/dashboard/credentials/upload');
  };

  const getFilteredCredentials = () => {
    if (!data) return [];

    let filtered = [...data.credentials];

    // Apply status filter
    switch (filter) {
      case 'needs-action':
        filtered = data.needsAction;
        break;
      case 'active':
        filtered = filtered.filter(
          (c) => c.status === 'ACTIVE' && c.isCompliant
        );
        break;
      case 'pending':
        filtered = filtered.filter(
          (c) => c.reviewStatus === 'PENDING_REVIEW'
        );
        break;
      case 'expired':
        filtered = filtered.filter(
          (c) => c.status === 'EXPIRED'
        );
        break;
    }

    // Apply document type filter
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(
        (c) => c.documentType.id === documentTypeFilter
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.documentType.name.toLowerCase().includes(query) ||
          (c.licenseNumber && c.licenseNumber.toLowerCase().includes(query)) ||
          (c.issuer && c.issuer.toLowerCase().includes(query)) ||
          c.fileName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.documentType.name.localeCompare(b.documentType.name);
        case 'name-desc':
          return b.documentType.name.localeCompare(a.documentType.name);
        case 'expiration-asc':
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        case 'expiration-desc':
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime();
        case 'upload-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'upload-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getUniqueDocumentTypes = () => {
    if (!data) return [];
    const types = new Map();
    data.credentials.forEach((c) => {
      if (!types.has(c.documentType.id)) {
        types.set(c.documentType.id, c.documentType);
      }
    });
    return Array.from(types.values());
  };

  const filteredCredentials = getFilteredCredentials();
  const uniqueDocumentTypes = getUniqueDocumentTypes();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Credentials</h1>
          <p className="text-gray-600 mt-2">
            Manage your professional licenses and certifications
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error Loading Credentials</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && !error && data && (
          <>
            {/* Flagged credentials banner (rejected/needs correction) */}
            {data.stats.flaggedCount > 0 && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">
                      {data.stats.flaggedCount}{' '}
                      {data.stats.flaggedCount === 1 ? 'credential has' : 'credentials have'}{' '}
                      been flagged by your admin
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Review the flagged credentials below and upload corrected versions as needed.
                    </p>
                  </div>
                  <button
                    onClick={() => setFilter('needs-action')}
                    className="text-sm text-red-700 font-medium hover:underline whitespace-nowrap"
                  >
                    View flagged
                  </button>
                </div>
              </div>
            )}

            {/* Action Alert */}
            {data.stats.needsActionCount > 0 && (
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      {data.stats.needsActionCount}{' '}
                      {data.stats.needsActionCount === 1 ? 'credential needs' : 'credentials need'}{' '}
                      your attention
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {data.stats.expired > 0 && `${data.stats.expired} expired, `}
                      {data.stats.expiringSoon > 0 && `${data.stats.expiringSoon} expiring soon, `}
                      {data.stats.pendingReview > 0 && `${data.stats.pendingReview} pending review`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Quick Actions</h2>
                    <button
                      onClick={() => !actionsDisabled && handleUploadRenewal()}
                      disabled={actionsDisabled}
                      title={actionsDisabled ? "Your agency account is suspended" : undefined}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${actionsDisabled ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#0B4F96] text-white hover:bg-[#083d75]"}`}
                    >
                      <Upload className="h-4 w-4" />
                      Upload Credential
                    </button>
                  </div>
                </div>

                {/* Search, Sort & Document Type Filter */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by credential name, license number, or issuer..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      />
                    </div>

                    {/* Sort & Filter Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Sort Dropdown */}
                      <div className="flex items-center gap-2 flex-1">
                        <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Sort by:
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent text-sm"
                        >
                          <option value="expiration-asc">Expiration (soonest first)</option>
                          <option value="expiration-desc">Expiration (latest first)</option>
                          <option value="name-asc">Name (A-Z)</option>
                          <option value="name-desc">Name (Z-A)</option>
                          <option value="upload-desc">Recently uploaded</option>
                          <option value="upload-asc">Oldest uploaded</option>
                        </select>
                      </div>

                      {/* Document Type Filter */}
                      {uniqueDocumentTypes.length > 1 && (
                        <div className="flex items-center gap-2 flex-1">
                          <Filter className="h-4 w-4 text-gray-400" />
                          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Type:
                          </label>
                          <select
                            value={documentTypeFilter}
                            onChange={(e) => setDocumentTypeFilter(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent text-sm"
                          >
                            <option value="all">All types</option>
                            {uniqueDocumentTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Active Filters Display */}
                    {(searchQuery.trim() || documentTypeFilter !== 'all') && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600">Active filters:</span>
                        {searchQuery.trim() && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1">
                            Search: "{searchQuery}"
                            <button
                              onClick={() => setSearchQuery('')}
                              className="hover:text-blue-900"
                            >
                              ×
                            </button>
                          </span>
                        )}
                        {documentTypeFilter !== 'all' && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1">
                            Type: {uniqueDocumentTypes.find((t) => t.id === documentTypeFilter)?.name}
                            <button
                              onClick={() => setDocumentTypeFilter('all')}
                              className="hover:text-blue-900"
                            >
                              ×
                            </button>
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setDocumentTypeFilter('all');
                          }}
                          className="text-sm text-[#0B4F96] hover:underline"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Filters */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Filter:</span>

                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filter === 'all'
                          ? 'bg-[#0B4F96] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All ({data.stats.totalCredentials})
                    </button>

                    {data.stats.needsActionCount > 0 && (
                      <button
                        onClick={() => setFilter('needs-action')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filter === 'needs-action'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        Needs Action ({data.stats.needsActionCount})
                      </button>
                    )}

                    <button
                      onClick={() => setFilter('active')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filter === 'active'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      <CheckCircle className="inline h-3 w-3 mr-1" />
                      Active ({data.stats.active})
                    </button>

                    {data.stats.pendingReview > 0 && (
                      <button
                        onClick={() => setFilter('pending')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filter === 'pending'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        <Clock className="inline h-3 w-3 mr-1" />
                        Pending ({data.stats.pendingReview})
                      </button>
                    )}

                    {data.stats.expired > 0 && (
                      <button
                        onClick={() => setFilter('expired')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          filter === 'expired'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        <XCircle className="inline h-3 w-3 mr-1" />
                        Expired ({data.stats.expired})
                      </button>
                    )}
                  </div>
                </div>

                {/* Credentials List */}
                <div className="space-y-4">
                  {filteredCredentials.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {filter === 'all'
                          ? 'No credentials found. Upload your first credential to get started.'
                          : 'No credentials match this filter.'}
                      </p>
                      {filter === 'all' && (
                        <button
                          onClick={handleUploadRenewal}
                          className="mt-4 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors"
                        >
                          Upload Credential
                        </button>
                      )}
                    </div>
                  )}

                  {filteredCredentials.map((credential) => (
                    <CredentialCard
                      key={credential.id}
                      credential={credential}
                      onUploadRenewal={handleUploadRenewal}
                    />
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Compliance Score Widget */}
                <ComplianceScoreWidget stats={data.stats} categoryBreakdown={data.categoryBreakdown} />

                {/* Help Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">Need Help?</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Upload your professional licenses and certifications. Our AI will automatically
                    extract key information for review.
                  </p>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Supported: PDFs and images</li>
                    <li>• AI parsing saves time</li>
                    <li>• Automatic expiration reminders</li>
                    <li>• Admin review for accuracy</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
