"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  User,
  Mail,
  Briefcase,
  Loader2,
} from "lucide-react";
import DocumentList from "@/components/documents/DocumentList";
import DocumentUpload from "@/components/documents/DocumentUpload";
import CredentialReviewModal from "@/components/documents/CredentialReviewModal";

interface StaffRecord {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  status: string;
}

interface StaffUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  issueDate: string | null;
  expirationDate: string | null;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "ARCHIVED";
  reviewStatus: "PENDING_UPLOAD" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_CORRECTION" | null;
  reviewNotes: string | null;
  notes: string | null;
  createdAt: string;
  documentType: { id: string; name: string };
  parsingJob?: { id: string; status: string } | null;
}

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  expirationDays: number | null;
  requiresFrontBack: boolean;
  allowsMultiPage: boolean;
  minFiles: number;
  maxFiles: number;
  recheckCadenceDays?: number | null;
  customFields?: Record<string, string> | null;
  isGlobal: boolean;
}

export default function StaffCredentialsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();

  const userId = params.id as string;

  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [staffRecord, setStaffRecord] = useState<StaffRecord | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expiringSoon: 0, expired: 0, pendingReview: 0, parsingQueue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDocumentId, setReviewDocumentId] = useState<string | null>(null);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [credentialHistory, setCredentialHistory] = useState<Record<string, Document[]>>({});
  const [gaps, setGaps] = useState<Array<{ documentTypeId: string; documentTypeName: string }>>([]);
  const [preselectedTypeId, setPreselectedTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) { router.push("/auth/signin"); return; }
    const role = session.user?.role;
    if (role !== "AGENCY_ADMIN" && role !== "PLATFORM_ADMIN" && role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [session, sessionStatus, userId]);

  useEffect(() => {
    if (statusFilter === "ALL") {
      setFilteredDocuments(documents);
    } else if (statusFilter === "PENDING_REVIEW") {
      setFilteredDocuments(documents.filter((d) => d.reviewStatus === "PENDING_REVIEW"));
    } else {
      setFilteredDocuments(documents.filter((d) => d.status === statusFilter));
    }
  }, [documents, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/agency/staff/${userId}/credentials`);
      if (!res.ok) throw new Error("Failed to load staff credentials");
      const data = await res.json();
      setStaffUser(data.staffUser);
      setStaffRecord(data.staffRecord);
      setDocuments(data.documents);
      setFilteredDocuments(data.documents);
      setStats(data.stats);
      setDocumentTypes(data.documentTypes);
      setCredentialHistory(data.credentialHistory ?? {});
      setGaps(data.gaps ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh — updates data without showing the loading spinner.
  // Used by the polling loop so parsing completion doesn't flicker the page.
  const silentRefresh = async () => {
    try {
      const res = await fetch(`/api/agency/staff/${userId}/credentials`);
      if (!res.ok) return;
      const data = await res.json();
      setStaffUser(data.staffUser);
      setStaffRecord(data.staffRecord);
      setDocuments(data.documents);
      setFilteredDocuments(data.documents);
      setStats(data.stats);
      setDocumentTypes(data.documentTypes);
      setCredentialHistory(data.credentialHistory ?? {});
      setGaps(data.gaps ?? []);
    } catch {
      // ignore — next poll will retry
    }
  };

  const handleCreateRecord = async () => {
    if (!staffUser) return;
    setCreatingRecord(true);
    try {
      const nameParts = (staffUser.name || "").split(" ");
      const res = await fetch("/api/agency/staff/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffUser.id,
          firstName: nameParts[0] || staffUser.name || "Staff",
          lastName: nameParts.slice(1).join(" ") || "Member",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to set up tracking");
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingRecord(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/agency/documents/${documentId}/download`);
      if (!res.ok) throw new Error("Failed to generate download link");
      const data = await res.json();
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Failed to download document");
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const res = await fetch(`/api/agency/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  };

  const handleReview = (documentId: string) => {
    setReviewDocumentId(documentId);
    setShowReviewModal(true);
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto" />
          <p className="mt-4 text-gray-600">Loading credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !staffUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-gray-900 font-medium">{error || "Staff member not found"}</p>
          <button onClick={() => router.push("/agency/staff")} className="mt-4 text-[#0B4F96] hover:text-[#48ccbc]">
            ← Back to Staff
          </button>
        </div>
      </div>
    );
  }

  const displayName = staffUser.name || staffUser.email;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/agency/staff")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[#0B4F96] flex items-center justify-center text-white font-bold text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{staffUser.email}</span>
                  {staffRecord?.position && (
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{staffRecord.position}</span>
                  )}
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              staffUser.role === "AGENCY_ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
            }`}>
              {staffUser.role === "AGENCY_ADMIN" ? "Admin" : "Staff"}
            </span>
          </div>
        </div>

        {/* No record yet */}
        {!staffRecord ? (
          <div className="bg-white rounded-lg shadow-md p-10 text-center">
            <User className="h-14 w-14 text-gray-300 mx-auto mb-4" />
            {staffUser.role === "AGENCY_ADMIN" || staffUser.role === "PLATFORM_ADMIN" || staffUser.role === "SUPERADMIN" ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Account</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  {displayName} is an administrator. Credential tracking is for staff members (non-admin users) only.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Credential Tracking Not Set Up</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Enable credential tracking for {displayName} to upload and manage their compliance documents.
                </p>
                <button
                  onClick={handleCreateRecord}
                  disabled={creatingRecord}
                  className="inline-flex items-center gap-2 bg-[#0B4F96] text-white px-6 py-3 rounded-lg hover:bg-[#0a4280] disabled:opacity-50 font-medium"
                >
                  <UserPlus className="h-5 w-5" />
                  {creatingRecord ? "Setting up..." : "Enable Credential Tracking"}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className={`grid grid-cols-2 ${gaps.length > 0 || stats.parsingQueue > 0 ? "md:grid-cols-6" : "md:grid-cols-5"} gap-4 mb-6`}>
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div>
                  <FileText className="h-9 w-9 text-[#0B4F96]" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Active</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></div>
                  <CheckCircle className="h-9 w-9 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</p></div>
                  <AlertTriangle className="h-9 w-9 text-yellow-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Expired</p><p className="text-2xl font-bold text-red-600">{stats.expired}</p></div>
                  <XCircle className="h-9 w-9 text-red-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Review</p>
                    <p className={`text-2xl font-bold ${stats.pendingReview > 0 ? "text-blue-600" : "text-gray-400"}`}>{stats.pendingReview}</p>
                  </div>
                  <Clock className={`h-9 w-9 ${stats.pendingReview > 0 ? "text-blue-600" : "text-gray-300"}`} />
                </div>
              </div>
              {gaps.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Missing Coverage</p>
                      <p className="text-2xl font-bold text-red-700">{gaps.length}</p>
                    </div>
                    <AlertCircle className="h-9 w-9 text-red-400" />
                  </div>
                </div>
              )}
              {stats.parsingQueue > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Parsing Queue</p>
                      <p className="text-2xl font-bold text-blue-700">{stats.parsingQueue}</p>
                    </div>
                    <Loader2 className="h-9 w-9 text-blue-400 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Credentials</h2>
                <div className="flex items-center gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRING_SOON">Expiring Soon</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] text-sm font-medium"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Credential
                  </button>
                </div>
              </div>
              <DocumentList
                documents={filteredDocuments}
                onDownload={handleDownload}
                onDelete={handleDelete}
                canDelete={true}
                onReview={handleReview}
                credentialHistory={credentialHistory}
                gaps={gaps}
                onUploadForType={(typeId) => {
                  setPreselectedTypeId(typeId);
                  setShowUploadModal(true);
                }}
                onParsingComplete={silentRefresh}
                onRefresh={fetchData}
              />
            </div>
          </>
        )}
      </div>

      {showUploadModal && staffRecord && (
        <DocumentUpload
          staffRecordId={staffRecord.id}
          documentTypes={documentTypes}
          defaultDocumentTypeId={preselectedTypeId ?? undefined}
          onSuccess={() => { setShowUploadModal(false); setPreselectedTypeId(null); fetchData(); }}
          onClose={() => { setShowUploadModal(false); setPreselectedTypeId(null); }}
        />
      )}

      {showReviewModal && reviewDocumentId && (
        <CredentialReviewModal
          documentId={reviewDocumentId}
          onClose={() => { setShowReviewModal(false); setReviewDocumentId(null); }}
          onSuccess={() => { setShowReviewModal(false); setReviewDocumentId(null); fetchData(); }}
        />
      )}
    </div>
  );
}
