"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FileText,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  Search,
  ChevronRight,
} from "lucide-react";
import DocumentUpload from "@/components/documents/DocumentUpload";

interface StaffRecord {
  staffRecordId: string;
  userId: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  status: string;
  user: { id: string; name: string | null; email: string; role: string } | null;
  credentialCount: number;
  expiringSoon: number;
  expired: number;
  pendingReview: number;
}

interface Stats {
  totalTracked: number;
  totalCredentials: number;
  pendingReview: number;
}

type StatusFilter = "ALL" | "HAS_EXPIRING" | "HAS_EXPIRED" | "HAS_PENDING";

export default function StaffCredentialsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTracked: 0, totalCredentials: 0, pendingReview: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [uploadForRecord, setUploadForRecord] = useState<StaffRecord | null>(null);
  const [documentTypes, setDocumentTypes] = useState<Array<{
    id: string; name: string; description: string | null; category: string;
    expirationDays: number | null; requiresFrontBack: boolean; allowsMultiPage: boolean;
    minFiles: number; maxFiles: number; recheckCadenceDays?: number | null;
    customFields?: Record<string, string> | null; isGlobal: boolean;
  }>>([]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) { router.push("/auth/signin"); return; }
    const role = session.user?.role;
    if (role !== "AGENCY_ADMIN" && role !== "PLATFORM_ADMIN" && role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [session, sessionStatus]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const [recordsRes, typesRes] = await Promise.all([
        fetch(`/api/agency/staff/records${params}`),
        documentTypes.length === 0 ? fetch("/api/agency/document-types") : Promise.resolve(null),
      ]);
      if (!recordsRes.ok) throw new Error("Failed to load staff records");
      const data = await recordsRes.json();
      setRecords(data.records);
      setStats(data.stats);
      if (typesRes && typesRes.ok) {
        const typesData = await typesRes.json();
        setDocumentTypes(typesData.documentTypes || typesData || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const filteredRecords = records.filter((r) => {
    if (statusFilter === "HAS_EXPIRING") return r.expiringSoon > 0;
    if (statusFilter === "HAS_EXPIRED") return r.expired > 0;
    if (statusFilter === "HAS_PENDING") return r.pendingReview > 0;
    return true;
  });

  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto" />
          <p className="mt-4 text-gray-600">Loading staff credentials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-gray-900 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 text-[#0B4F96] hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Staff Credentials</h1>
          <p className="text-gray-500 mt-1">Manage credential tracking across all staff members</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staff Tracked</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTracked}</p>
            </div>
            <Users className="h-9 w-9 text-[#0B4F96]" />
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Credentials</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCredentials}</p>
            </div>
            <FileText className="h-9 w-9 text-[#0B4F96]" />
          </div>
          <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className={`text-2xl font-bold ${stats.pendingReview > 0 ? "text-blue-600" : "text-gray-400"}`}>{stats.pendingReview}</p>
            </div>
            <Clock className={`h-9 w-9 ${stats.pendingReview > 0 ? "text-blue-600" : "text-gray-300"}`} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, position..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg text-sm hover:bg-[#0a4280]">
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
          >
            <option value="ALL">All Staff</option>
            <option value="HAS_EXPIRING">Has Expiring</option>
            <option value="HAS_EXPIRED">Has Expired</option>
            <option value="HAS_PENDING">Has Pending Review</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {records.length === 0
                  ? "No staff have credential tracking set up yet. Visit a staff member's profile to enable it."
                  : "No staff match your current filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Expiring</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Expired</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Review</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((r) => (
                      <tr key={r.staffRecordId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[#0B4F96] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                              {r.firstName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{r.firstName} {r.lastName}</div>
                              {r.user?.email && <div className="text-xs text-gray-500">{r.user.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.position || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">{r.credentialCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {r.expiringSoon > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="h-3 w-3" />{r.expiringSoon}
                            </span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {r.expired > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3" />{r.expired}
                            </span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {r.pendingReview > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3" />{r.pendingReview}
                            </span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setUploadForRecord(r)}
                              className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                            >
                              Upload
                            </button>
                            <button
                              onClick={() => router.push(`/agency/staff/${r.userId}`)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#0B4F96] text-white rounded hover:bg-[#0a4280] transition-colors"
                            >
                              Manage <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredRecords.map((r) => (
                  <div key={r.staffRecordId} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#0B4F96] flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {r.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{r.firstName} {r.lastName}</div>
                          <div className="text-xs text-gray-500">{r.position || r.user?.email || ""}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      <span className="text-gray-600">{r.credentialCount} credentials</span>
                      {r.expiringSoon > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="h-3 w-3" />{r.expiringSoon} expiring
                        </span>
                      )}
                      {r.expired > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3" />{r.expired} expired
                        </span>
                      )}
                      {r.pendingReview > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3" />{r.pendingReview} pending
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUploadForRecord(r)}
                        className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => router.push(`/agency/staff/${r.userId}`)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#0B4F96] text-white rounded hover:bg-[#0a4280] transition-colors"
                      >
                        Manage <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {uploadForRecord && (
        <DocumentUpload
          staffRecordId={uploadForRecord.staffRecordId}
          documentTypes={documentTypes}
          onSuccess={() => { setUploadForRecord(null); fetchData(); }}
          onClose={() => setUploadForRecord(null)}
        />
      )}
    </div>
  );
}
