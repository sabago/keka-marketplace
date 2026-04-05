"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import LogReferralModal from "@/components/LogReferralModal";
import Link from "next/link";

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
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("date-desc");

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [referrals, filterStatus, sortBy]);

  const fetchReferrals = async () => {
    try {
      const response = await fetch("/api/referrals");
      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals || []);
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-6 py-3 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Log New Referral
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
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-6 py-3 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors"
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
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {new Date(referral.submissionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/knowledge-base/${referral.referralSourceSlug}`}
                          className="text-[#0B4F96] hover:text-[#48ccbc] font-medium flex items-center"
                        >
                          {referral.referralSourceTitle || referral.referralSourceSlug}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                        {referral.patientType && (
                          <span className="text-xs text-gray-500 block mt-1">
                            {referral.patientType}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {referral.submissionMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(referral.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {referral.responseTime ? `${referral.responseTime}h` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-[#0B4F96] hover:text-[#48ccbc] flex items-center">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Modal */}
      <LogReferralModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchReferrals}
      />
    </div>
  );
}
