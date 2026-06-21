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
  Briefcase,
  Loader2,
  Mail,
} from "lucide-react";
import DocumentList from "@/components/documents/DocumentList";
import DocumentUpload from "@/components/documents/DocumentUpload";
import CredentialReviewModal from "@/components/documents/CredentialReviewModal";
import type { CredTrackPlan } from "@/types/next-auth";

const AI_PLANS: CredTrackPlan[] = ["GROWTH", "ENTERPRISE", "BUNDLED"];

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  email: string | null;
  status: string;
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

export default function StaffCredentialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();

  const staffId = params.id as string;

  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [stats, setStats] = useState({
    total: 0, active: 0, expiringSoon: 0, expired: 0, pendingReview: 0, parsingQueue: 0,
  });
  const [credentialHistory, setCredentialHistory] = useState<Record<string, Document[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canUseAI = session?.user?.credtrackPlan
    ? AI_PLANS.includes(session.user.credtrackPlan as CredTrackPlan)
    : true;
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDocumentId, setReviewDocumentId] = useState<string | null>(null);
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
  }, [session, sessionStatus, staffId]);

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
      const staffRes = await fetch(`/api/staff/${staffId}`);
      if (!staffRes.ok) throw new Error("Failed to load staff member");
      const data = await staffRes.json();

      setStaffMember(data.record);
      setDocuments(data.documents);
      setFilteredDocuments(data.documents);
      setDocumentTypes(data.documentTypes);
      setCredentialHistory(data.credentialHistory ?? {});

      const creds = data.documents as Document[];
      const parsingQueue = creds.filter(
        (c) => c.parsingJob && (c.parsingJob.status === "PENDING" || c.parsingJob.status === "PROCESSING")
      ).length;
      setStats({
        total: creds.length,
        active: creds.filter((c) => c.status === "ACTIVE" && c.reviewStatus === "APPROVED").length,
        expiringSoon: creds.filter((c) => c.status === "EXPIRING_SOON").length,
        expired: creds.filter((c) => c.status === "EXPIRED").length,
        pendingReview: creds.filter((c) => c.reviewStatus === "PENDING_REVIEW").length,
        parsingQueue,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}`);
      if (!res.ok) return;
      const data = await res.json();
      setStaffMember(data.record);
      setDocuments(data.documents);
      setDocumentTypes(data.documentTypes);
      setCredentialHistory(data.credentialHistory ?? {});

      const creds = data.documents as Document[];
      const parsingQueue = creds.filter(
        (c) => c.parsingJob && (c.parsingJob.status === "PENDING" || c.parsingJob.status === "PROCESSING")
      ).length;
      setStats({
        total: creds.length,
        active: creds.filter((c) => c.status === "ACTIVE" && c.reviewStatus === "APPROVED").length,
        expiringSoon: creds.filter((c) => c.status === "EXPIRING_SOON").length,
        expired: creds.filter((c) => c.status === "EXPIRED").length,
        pendingReview: creds.filter((c) => c.reviewStatus === "PENDING_REVIEW").length,
        parsingQueue,
      });
    } catch {
      // ignore — next poll will retry
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}/download`);
      if (!res.ok) throw new Error("Failed to generate download link");
      const data = await res.json();
      window.open(data.downloadUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Failed to download document");
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
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

  if (error || !staffMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-gray-900 font-medium">{error || "Staff member not found"}</p>
          <button onClick={() => router.push("/staff")} className="mt-4 text-[#0B4F96] hover:text-[#48ccbc]">
            Back to Staff
          </button>
        </div>
      </div>
    );
  }

  const displayName = `${staffMember.firstName} ${staffMember.lastName}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/staff")}
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
                {staffMember.firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  {staffMember.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />{staffMember.email}
                    </span>
                  )}
                  {staffMember.position && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />{staffMember.position}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              {staffMember.status}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 ${stats.parsingQueue > 0 ? "md:grid-cols-6" : "md:grid-cols-5"} gap-4 mb-6`}>
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
                <p className={`text-2xl font-bold ${stats.pendingReview > 0 ? "text-blue-600" : "text-gray-400"}`}>
                  {stats.pendingReview}
                </p>
              </div>
              <Clock className={`h-9 w-9 ${stats.pendingReview > 0 ? "text-blue-600" : "text-gray-300"}`} />
            </div>
          </div>
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

        {/* Missing coverage notice */}
        {!canUseAI && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">AI parsing not available on your plan</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Documents will be saved but fields won&apos;t be auto-extracted. Upgrade to enable AI parsing.
              </p>
            </div>
          </div>
        )}

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
            onUploadForType={(typeId) => {
              setPreselectedTypeId(typeId);
              setShowUploadModal(true);
            }}
            onParsingComplete={silentRefresh}
            onRefresh={fetchData}
          />
        </div>
      </div>

      {showUploadModal && (
        <DocumentUpload
          staffRecordId={staffMember.id}
          documentTypes={documentTypes}
          defaultDocumentTypeId={preselectedTypeId ?? undefined}
          canUseAI={canUseAI}
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
