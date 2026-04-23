"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  FileText,
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import LogReferralModal from "@/components/LogReferralModal";
import Link from "next/link";

interface StatusHistoryEntry {
  id: string;
  status: string;
  changedAt: string;
  notes?: string | null;
}

interface Referral {
  id: string;
  referralSourceSlug: string;
  referralSourceTitle?: string;
  submissionDate: string;
  submissionMethod: string;
  patientType?: string;
  status: string;
  responseTime?: number;
  accepted?: boolean;
  patientStarted?: boolean;
  notes?: string;
  createdAt: string;
  statusHistory?: StatusHistoryEntry[];
}

export default function ReferralsPage() {
  const { data: session } = useSession();
  const isStaff = session?.user?.role === "AGENCY_USER";
  const isAdmin =
    session?.user?.role === "AGENCY_ADMIN" ||
    session?.user?.role === "PLATFORM_ADMIN" ||
    session?.user?.role === "SUPERADMIN";

  const [liveApprovalStatus, setLiveApprovalStatus] = useState<string | null>(null);
  const [liveIsActive, setLiveIsActive] = useState<boolean | null>(null);
  const isSuspended = liveApprovalStatus === "SUSPENDED" || liveApprovalStatus === "REJECTED";
  const isDeactivated = liveIsActive === false;
  const actionsDisabled = (isSuspended || isDeactivated) && !isAdmin;

  const [myReferrals, setMyReferrals] = useState<Referral[]>([]);
  const [agencyReferrals, setAgencyReferrals] = useState<Referral[]>([]);
  const [view, setView] = useState<"mine" | "agency">("agency");
  const referrals = (isStaff || view === "mine") ? myReferrals : agencyReferrals;

  // Once session loads, force staff to "mine" view
  useEffect(() => {
    if (isStaff) setView("mine");
  }, [isStaff]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("date-desc");
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [editForm, setEditForm] = useState({ status: "", notes: "", responseTime: "", accepted: false, patientStarted: false });
  const [editSaving, setEditSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [referrals, filterStatus, sortBy]);

  const fetchReferrals = async () => {
    try {
      const [statusResult, accountResult, refResult] = await Promise.allSettled([
        fetch("/api/agency/status").then((r) => {
          const header = r.headers.get("X-Agency-Status");
          if (header) return { approvalStatus: header };
          return r.ok ? r.json() : null;
        }),
        fetch("/api/account/status").then((r) => r.ok ? r.json() : null),
        fetch("/api/referrals").then((r) => r.ok ? r.json() : null),
      ]);
      if (statusResult.status === "fulfilled" && statusResult.value?.approvalStatus)
        setLiveApprovalStatus(statusResult.value.approvalStatus);
      if (accountResult.status === "fulfilled" && accountResult.value?.isActive === false)
        setLiveIsActive(false);
      if (refResult.status === "fulfilled" && refResult.value) {
        setMyReferrals(refResult.value.myReferrals || []);
        setAgencyReferrals(refResult.value.agencyReferrals || refResult.value.referrals || []);
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...referrals];

    // Apply status filter
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((ref) => ref.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
        case "date-asc":
          return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
        case "source":
          return (a.referralSourceTitle || "").localeCompare(b.referralSourceTitle || "");
        default:
          return 0;
      }
    });

    setFilteredReferrals(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; bg: string; icon: any; label: string }
    > = {
      SUBMITTED: {
        color: "text-blue-700",
        bg: "bg-blue-100",
        icon: Clock,
        label: "Submitted",
      },
      RESPONDED: {
        color: "text-purple-700",
        bg: "bg-purple-100",
        icon: FileText,
        label: "Responded",
      },
      ACCEPTED: {
        color: "text-green-700",
        bg: "bg-green-100",
        icon: CheckCircle,
        label: "Accepted",
      },
      DECLINED: {
        color: "text-red-700",
        bg: "bg-red-100",
        icon: XCircle,
        label: "Declined",
      },
      PATIENT_STARTED: {
        color: "text-teal-700",
        bg: "bg-teal-100",
        icon: CheckCircle,
        label: "Started",
      },
    };

    const config = statusConfig[status] || statusConfig.SUBMITTED;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    );
  };

  const openEdit = (referral: Referral) => {
    setEditingReferral(referral);
    setEditForm({
      status: referral.status,
      notes: referral.notes || "",
      responseTime: referral.responseTime != null ? String(referral.responseTime) : "",
      accepted: referral.accepted ?? false,
      patientStarted: referral.patientStarted ?? false,
    });
  };

  const saveEdit = async () => {
    if (!editingReferral) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/referrals/${editingReferral.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editForm.status,
          notes: editForm.notes,
          responseTime: editForm.responseTime,
          accepted: editForm.status === "ACCEPTED" || editForm.status === "PATIENT_STARTED",
          patientStarted: editForm.status === "PATIENT_STARTED",
        }),
      });
      if (res.ok) {
        setEditingReferral(null);
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save changes");
      }
    } catch {
      alert("An error occurred while saving");
    } finally {
      setEditSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Source",
      "Method",
      "Patient Type",
      "Status",
      "Response Time",
      "Notes",
    ];
    const rows = filteredReferrals.map((ref) => [
      new Date(ref.submissionDate).toLocaleDateString(),
      ref.referralSourceTitle || ref.referralSourceSlug,
      ref.submissionMethod,
      ref.patientType || "",
      ref.status,
      ref.responseTime ? `${ref.responseTime}h` : "",
      ref.notes || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referrals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Referral Tracking</h1>
            <p className="text-gray-600">
              Monitor and manage all your referral submissions
            </p>
          </div>
          <button
            onClick={() => !actionsDisabled && setIsModalOpen(true)}
            disabled={actionsDisabled}
            title={actionsDisabled ? "Your agency account is suspended" : undefined}
            className={`flex items-center px-6 py-3 rounded-lg shadow-md transition-colors ${actionsDisabled ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#0B4F96] text-white hover:bg-[#48ccbc]"}`}
          >
            <Plus className="h-5 w-5 mr-2" />
            Log New Referral
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          {!isStaff && (
            <button
              onClick={() => setView("agency")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${view === "agency" ? "bg-[#0B4F96] text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
            >
              All Agency ({agencyReferrals.length})
            </button>
          )}
          <button
            onClick={() => setView("mine")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${(isStaff || view === "mine") ? "bg-[#0B4F96] text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"}`}
          >
            Logged by Me ({myReferrals.length})
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Status Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-gray-500 mr-2" />
                <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="RESPONDED">Responded</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="PATIENT_STARTED">Patient Started</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="source">Source (A-Z)</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading referrals...</p>
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No referrals found</h3>
              <p className="text-gray-600 mb-6">
                {filterStatus === "ALL"
                  ? "Get started by logging your first referral"
                  : "No referrals match the selected filters"}
              </p>
              <button
                onClick={() => !actionsDisabled && setIsModalOpen(true)}
                disabled={actionsDisabled}
                title={actionsDisabled ? "Your agency account is suspended" : undefined}
                className={`inline-flex items-center px-6 py-3 rounded-lg transition-colors ${actionsDisabled ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#0B4F96] text-white hover:bg-[#48ccbc]"}`}
              >
                <Plus className="h-5 w-5 mr-2" />
                Log Your First Referral
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Referral Source
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Response Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReferrals.map((referral) => {
                    const isExpanded = expandedId === referral.id;
                    const history = referral.statusHistory || [];
                    return (
                      <>
                        <tr
                          key={referral.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : referral.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            <div className="flex items-center gap-2">
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                              {referral.submissionDate.slice(0, 10).replace(/-/g, '/').replace(/^(\d{4})\/(\d{2})\/(\d{2})$/, '$2/$3/$1')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Link
                              href={`/knowledge-base/${referral.referralSourceSlug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#0B4F96] hover:text-[#48ccbc] font-medium flex items-center"
                            >
                              {referral.referralSourceTitle || referral.referralSourceSlug}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                            {referral.patientType && (
                              <span className="text-xs text-gray-500 block mt-1">{referral.patientType}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {referral.submissionMethod}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(referral.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {referral.responseTime != null && referral.responseTime > 0
                              ? referral.responseTime < 60
                                ? `${referral.responseTime}m`
                                : `${Math.floor(referral.responseTime / 60)}h${referral.responseTime % 60 > 0 ? ` ${referral.responseTime % 60}m` : ""}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(referral); }}
                              className="text-[#0B4F96] hover:text-[#48ccbc] flex items-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${referral.id}-history`} className="bg-gray-50">
                            <td colSpan={6} className="px-10 py-4">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</p>
                              {history.length === 0 ? (
                                <p className="text-sm text-gray-400">No status history recorded.</p>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {history.map((entry, i) => {
                                    const prev = history[i - 1];
                                    const minsElapsed = prev
                                      ? Math.round((new Date(entry.changedAt).getTime() - new Date(prev.changedAt).getTime()) / 60_000)
                                      : null;
                                    const elapsedLabel = minsElapsed === null ? null
                                      : minsElapsed < 60 ? `${minsElapsed}m`
                                      : `${Math.floor(minsElapsed / 60)}h${minsElapsed % 60 > 0 ? ` ${minsElapsed % 60}m` : ""}`;
                                    return (
                                      <div key={entry.id} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                          <div className="w-2.5 h-2.5 rounded-full bg-[#0B4F96] mt-1 flex-shrink-0" />
                                          {i < history.length - 1 && <div className="w-px flex-1 bg-gray-300 mt-1" style={{ minHeight: 16 }} />}
                                        </div>
                                        <div className="pb-2">
                                          <span className="text-sm font-semibold text-gray-800 capitalize">{entry.status.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                                          <span className="text-xs text-gray-400 ml-2">
                                            {new Date(entry.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                                            {new Date(entry.changedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                          </span>
                                          {elapsedLabel !== null && (
                                            <span className="text-xs text-gray-400 ml-2">({elapsedLabel} after previous)</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {referral.notes && (
                                <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-200">
                                  <span className="font-medium text-gray-700">Notes:</span> {referral.notes}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredReferrals.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-gray-800">{filteredReferrals.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600 mb-1">Accepted</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredReferrals.filter((r) => r.status === "ACCEPTED").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredReferrals.filter((r) => r.status === "SUBMITTED").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600 mb-1">Declined</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredReferrals.filter((r) => r.status === "DECLINED").length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Log Modal */}
      <LogReferralModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchReferrals}
      />

      {/* Edit Modal */}
      {editingReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Edit Referral</h2>
              <button onClick={() => setEditingReferral(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm text-gray-500 mb-1">Source</p>
                <p className="font-medium text-gray-800">
                  {editingReferral.referralSourceTitle || editingReferral.referralSourceSlug}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    const updates: Partial<typeof editForm> = { status: newStatus };
                    // Auto-calculate response time (in minutes) only when first moving to RESPONDED
                    // and only if no response time has been recorded yet.
                    if (
                      newStatus === "RESPONDED" &&
                      editingReferral &&
                      !editForm.responseTime &&
                      !editingReferral.responseTime
                    ) {
                      const submittedMs = new Date(editingReferral.createdAt).getTime();
                      const minutesElapsed = Math.round((Date.now() - submittedMs) / 60_000);
                      updates.responseTime = String(minutesElapsed);
                    }
                    if (newStatus === "SUBMITTED") updates.responseTime = "";
                    setEditForm({ ...editForm, ...updates });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="RESPONDED">Responded</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="DECLINED">Declined</option>
                  <option value="PATIENT_STARTED">Patient Started</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Add notes about this referral..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setEditingReferral(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] disabled:opacity-50"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
