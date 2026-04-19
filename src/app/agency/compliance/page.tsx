"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  XCircle,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  Download,
  Search,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";

interface ComplianceStats {
  employees: { total: number; active: number; inactive: number };
  documents: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    pendingReview: number;
  };
  employeesWithExpiredDocs: number;
}

interface StaffRef {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  position: string | null;
}

interface DocumentWithStaff {
  id: string;
  fileName: string;
  issueDate: string | null;
  expirationDate: string | null;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "ARCHIVED";
  reviewStatus: string | null;
  daysExpired?: number;
  daysUntilExpiration?: number;
  createdAt: string;
  documentType: { id: string; name: string };
  staffMember: StaffRef;
}

interface StaffWithIssues {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  position: string | null;
  expiredCount: number;
  expiringSoonCount: number;
}

export default function ComplianceDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [expiredDocuments, setExpiredDocuments] = useState<DocumentWithStaff[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<DocumentWithStaff[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<DocumentWithStaff[]>([]);
  const [employeesWithIssues, setEmployeesWithIssues] = useState<StaffWithIssues[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"expired" | "expiring" | "pending">("expired");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/auth/signin"); return; }
    if (!["AGENCY_ADMIN", "PLATFORM_ADMIN", "SUPERADMIN"].includes(session.user?.role ?? "")) {
      router.push("/dashboard");
      return;
    }
    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agency/compliance/dashboard");
      if (!res.ok) throw new Error("Failed to fetch compliance data");
      const data = await res.json();
      setStats(data.stats);
      setExpiredDocuments(data.expiredDocuments ?? []);
      setExpiringDocuments(data.expiringDocuments ?? []);
      setPendingDocuments(data.pendingDocuments ?? []);
      setEmployeesWithIssues(data.employeesWithIssues ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load compliance dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStaff = (userId: string | null) => {
    if (!userId) return;
    router.push(`/agency/staff/${userId}`);
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const res = await fetch(`/api/agency/documents/${documentId}/download`);
      if (!res.ok) throw new Error("Failed to generate download link");
      const data = await res.json();
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Failed to download document");
    }
  };

  // Client-side search filter
  const q = searchQuery.toLowerCase().trim();
  const matchesSearch = (staff: StaffRef) =>
    !q || `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(q);

  const filteredExpired = useMemo(() => expiredDocuments.filter((d) => matchesSearch(d.staffMember)), [expiredDocuments, q]);
  const filteredExpiring = useMemo(() => expiringDocuments.filter((d) => matchesSearch(d.staffMember)), [expiringDocuments, q]);
  const filteredPending = useMemo(() => pendingDocuments.filter((d) => matchesSearch(d.staffMember)), [pendingDocuments, q]);
  const filteredStaffWithIssues = useMemo(() => employeesWithIssues.filter((e) => matchesSearch(e)), [employeesWithIssues, q]);

  const exportCsv = () => {
    setExportingCsv(true);
    try {
      const EXPIRY_STATUS_LABELS: Record<string, string> = {
        ACTIVE: "Valid",
        EXPIRING_SOON: "Expiring Soon",
        EXPIRED: "Expired",
        ARCHIVED: "Archived",
      };
      const REVIEW_STATUS_LABELS: Record<string, string> = {
        PENDING_UPLOAD: "Not Yet Uploaded",
        PENDING_REVIEW: "Pending Review",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        NEEDS_CORRECTION: "Needs Correction",
      };

      const rows: string[][] = [
        ["Staff Name", "Position", "Document Type", "File Name", "Expiry Status", "Review Status", "Issue Date", "Expiration Date", "Days Overdue", "Days Remaining"],
      ];

      const addRow = (doc: DocumentWithStaff, daysOverdue?: number, daysRemaining?: number) => {
        rows.push([
          `${doc.staffMember.firstName} ${doc.staffMember.lastName}`,
          doc.staffMember.position ?? "",
          doc.documentType.name,
          doc.fileName,
          EXPIRY_STATUS_LABELS[doc.status] ?? doc.status,
          REVIEW_STATUS_LABELS[doc.reviewStatus ?? ""] ?? doc.reviewStatus ?? "",
          doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "",
          doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : "",
          daysOverdue != null ? String(daysOverdue) : "",
          daysRemaining != null ? String(daysRemaining) : "",
        ]);
      };

      expiredDocuments.forEach((d) => addRow(d, (d as any).daysExpired));
      expiringDocuments.forEach((d) => addRow(d, undefined, (d as any).daysUntilExpiration));
      pendingDocuments.forEach((d) => addRow(d));

      const csvContent = rows
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `compliance-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingCsv(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto" />
          <p className="mt-4 text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-gray-900 font-medium">{error || "Failed to load dashboard"}</p>
          <button onClick={fetchDashboardData} className="mt-4 text-[#0B4F96] hover:text-[#48ccbc]">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const complianceRate =
    stats.documents.total > 0
      ? Math.round(((stats.documents.active + stats.documents.expiringSoon) / stats.documents.total) * 100)
      : 100;

  const complianceColor =
    complianceRate >= 90 ? "text-green-600" : complianceRate >= 70 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitor credential expiration and review status across your agency
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by staff name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96] w-56"
              />
            </div>
            {/* CSV Export */}
            <button
              onClick={exportCsv}
              disabled={exportingCsv}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Compliance Rate</p>
                <p className={`text-3xl font-bold ${complianceColor}`}>{complianceRate}%</p>
              </div>
              <TrendingUp className={`h-10 w-10 ${complianceColor}`} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Review</p>
                <p className={`text-3xl font-bold ${stats.documents.pendingReview > 0 ? "text-blue-600" : "text-gray-400"}`}>
                  {stats.documents.pendingReview}
                </p>
              </div>
              <ClipboardCheck className={`h-10 w-10 ${stats.documents.pendingReview > 0 ? "text-blue-500" : "text-gray-300"}`} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Expired</p>
                <p className={`text-3xl font-bold ${stats.documents.expired > 0 ? "text-red-600" : "text-gray-400"}`}>
                  {stats.documents.expired}
                </p>
              </div>
              <XCircle className={`h-10 w-10 ${stats.documents.expired > 0 ? "text-red-500" : "text-gray-300"}`} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Expiring Soon</p>
                <p className={`text-3xl font-bold ${stats.documents.expiringSoon > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                  {stats.documents.expiringSoon}
                </p>
              </div>
              <AlertTriangle className={`h-10 w-10 ${stats.documents.expiringSoon > 0 ? "text-yellow-500" : "text-gray-300"}`} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Staff w/ Issues</p>
                <p className={`text-3xl font-bold ${stats.employeesWithExpiredDocs > 0 ? "text-gray-900" : "text-gray-400"}`}>
                  {stats.employeesWithExpiredDocs}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">of {stats.employees.active} active</p>
              </div>
              <Users className={`h-10 w-10 ${stats.employeesWithExpiredDocs > 0 ? "text-gray-500" : "text-gray-300"}`} />
            </div>
          </div>
        </div>

        {/* Staff Requiring Attention */}
        {filteredStaffWithIssues.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Staff Requiring Attention</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Staff Member", "Position", "Expired", "Expiring Soon", "Actions"].map((h) => (
                      <th key={h} className={`px-6 py-3 text-${h === "Actions" ? "right" : "left"} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaffWithIssues.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {staff.firstName} {staff.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{staff.position ?? "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {staff.expiredCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {staff.expiringSoonCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleViewStaff(staff.userId)}
                          className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
                          title="View Staff Credentials"
                          disabled={!staff.userId}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Document Tabs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab("pending")}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "pending"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Pending Review ({stats.documents.pendingReview})
              </button>
              <button
                onClick={() => setActiveTab("expired")}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "expired"
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Expired ({stats.documents.expired})
              </button>
              <button
                onClick={() => setActiveTab("expiring")}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "expiring"
                    ? "border-yellow-500 text-yellow-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Expiring Soon ({stats.documents.expiringSoon})
              </button>
            </nav>
          </div>

          {/* Pending Review Tab */}
          {activeTab === "pending" && (
            filteredPending.length === 0 ? (
              <EmptyState message={q ? "No results match your search" : "No credentials pending review"} icon={<ClipboardCheck />} />
            ) : (
              <DocumentTable
                docs={filteredPending}
                columns={["Staff Member", "Document Type", "Uploaded", "Actions"]}
                renderRow={(doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{doc.staffMember.firstName} {doc.staffMember.lastName}</p>
                      <p className="text-xs text-gray-500">{doc.staffMember.position ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{doc.documentType.name}</p>
                      <p className="text-xs text-gray-500">{doc.fileName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleViewStaff(doc.staffMember.userId)}
                        className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
                        title="Review credential"
                        disabled={!doc.staffMember.userId}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )}
              />
            )
          )}

          {/* Expired Tab */}
          {activeTab === "expired" && (
            filteredExpired.length === 0 ? (
              <EmptyState message={q ? "No results match your search" : "No expired credentials. Great job!"} icon={<ShieldCheck />} />
            ) : (
              <DocumentTable
                docs={filteredExpired}
                columns={["Staff Member", "Document Type", "Expired Date", "Days Overdue", "Actions"]}
                renderRow={(doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{doc.staffMember.firstName} {doc.staffMember.lastName}</p>
                      <p className="text-xs text-gray-500">{doc.staffMember.position ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{doc.documentType.name}</p>
                      <p className="text-xs text-gray-500">{doc.fileName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {(doc as any).daysExpired} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleViewStaff(doc.staffMember.userId)} className="text-[#0B4F96] hover:text-[#48ccbc] p-1" title="View Staff" disabled={!doc.staffMember.userId}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDownloadDocument(doc.id)} className="text-gray-600 hover:text-gray-900 p-1" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            )
          )}

          {/* Expiring Tab */}
          {activeTab === "expiring" && (
            filteredExpiring.length === 0 ? (
              <EmptyState message={q ? "No results match your search" : "No credentials expiring soon"} icon={<ShieldCheck />} />
            ) : (
              <DocumentTable
                docs={filteredExpiring}
                columns={["Staff Member", "Document Type", "Expiration Date", "Days Remaining", "Actions"]}
                renderRow={(doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{doc.staffMember.firstName} {doc.staffMember.lastName}</p>
                      <p className="text-xs text-gray-500">{doc.staffMember.position ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{doc.documentType.name}</p>
                      <p className="text-xs text-gray-500">{doc.fileName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (doc as any).daysUntilExpiration <= 7 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {(doc as any).daysUntilExpiration} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleViewStaff(doc.staffMember.userId)} className="text-[#0B4F96] hover:text-[#48ccbc] p-1" title="View Staff" disabled={!doc.staffMember.userId}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDownloadDocument(doc.id)} className="text-gray-600 hover:text-gray-900 p-1" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-300">{icon}</div>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
    </div>
  );
}

function DocumentTable<T>({
  docs,
  columns,
  renderRow,
}: {
  docs: T[];
  columns: string[];
  renderRow: (doc: T) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className={`px-6 py-3 text-${col === "Actions" ? "right" : "left"} text-xs font-medium text-gray-500 uppercase tracking-wider`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">{docs.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
