"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
	ArrowLeft,
	Download,
	Search,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	AlertCircle,
	Loader2,
	FileText,
} from "lucide-react";

interface AuditEntry {
	id: string;
	createdAt: string;
	adminId: string;
	adminName: string | null;
	adminEmail: string | null;
	agencyName: string | null;
	actionType: string;
	details: Record<string, unknown>;
	notes: string | null;
}

interface AuditResponse {
	actions: AuditEntry[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

const ACTION_TYPES = [
	"APPROVE_AGENCY",
	"REJECT_AGENCY",
	"SUSPEND_AGENCY",
	"REACTIVATE_AGENCY",
	"AGENCY_ADMIN_REINVITED",
	"AGENCY_ADMIN_REASSIGNED",
	"AGENCY_SETTINGS_UPDATED",
	"APPROVE_CREDENTIAL",
	"REJECT_CREDENTIAL",
	"EDIT_CREDENTIAL",
	"REQUEST_CORRECTION",
	"BULK_CREDENTIAL_APPROVE",
	"BULK_CREDENTIAL_REJECT",
	"BULK_CREDENTIAL_IMPORT",
	"STAFF_INVITED",
	"STAFF_REMOVED",
	"INVITATION_RESENT",
	"SUPERADMIN_INVITED",
	"DATA_PURGE",
	"CREDENTIAL_DOWNLOAD",
];

const ACTION_COLORS: Record<string, string> = {
	APPROVE_AGENCY: "bg-green-100 text-green-800",
	REJECT_AGENCY: "bg-red-100 text-red-800",
	SUSPEND_AGENCY: "bg-orange-100 text-orange-800",
	REACTIVATE_AGENCY: "bg-teal-100 text-teal-800",
	AGENCY_ADMIN_REINVITED: "bg-blue-100 text-blue-800",
	AGENCY_ADMIN_REASSIGNED: "bg-blue-100 text-blue-800",
	AGENCY_SETTINGS_UPDATED: "bg-gray-100 text-gray-800",
	APPROVE_CREDENTIAL: "bg-green-100 text-green-800",
	REJECT_CREDENTIAL: "bg-red-100 text-red-800",
	EDIT_CREDENTIAL: "bg-yellow-100 text-yellow-800",
	REQUEST_CORRECTION: "bg-yellow-100 text-yellow-800",
	BULK_CREDENTIAL_APPROVE: "bg-green-100 text-green-800",
	BULK_CREDENTIAL_REJECT: "bg-red-100 text-red-800",
	BULK_CREDENTIAL_IMPORT: "bg-purple-100 text-purple-800",
	STAFF_INVITED: "bg-blue-100 text-blue-800",
	STAFF_REMOVED: "bg-orange-100 text-orange-800",
	INVITATION_RESENT: "bg-blue-100 text-blue-800",
	SUPERADMIN_INVITED: "bg-purple-100 text-purple-800",
	DATA_PURGE: "bg-red-100 text-red-800",
	CREDENTIAL_DOWNLOAD: "bg-gray-100 text-gray-800",
};

export default function AuditLogPage() {
	const router = useRouter();
	const { data: session, status } = useSession();

	const [data, setData] = useState<AuditResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [exporting, setExporting] = useState(false);

	// Filters
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [agencyFilter, setAgencyFilter] = useState("");
	const [actionType, setActionType] = useState("");
	const [page, setPage] = useState(1);

	useEffect(() => {
		if (status === "loading") return;
		if (!session) {
			router.push("/auth/signin");
			return;
		}
		const role = session.user?.role;
		if (role !== "SUPERADMIN" && role !== "PLATFORM_ADMIN") {
			router.push("/admin");
		}
	}, [session, status, router]);

	const fetchLogs = useCallback(
		async (currentPage = 1) => {
			setLoading(true);
			setError("");
			try {
				const params = new URLSearchParams({
					page: String(currentPage),
					limit: "25",
				});
				if (dateFrom) params.set("dateFrom", dateFrom);
				if (dateTo) params.set("dateTo", dateTo);
				if (agencyFilter.trim()) params.set("agencyName", agencyFilter.trim());
				if (actionType) params.set("actionType", actionType);

				const res = await fetch(`/api/admin/audit-log?${params}`);
				if (!res.ok) throw new Error("Failed to fetch audit log");
				const json = await res.json();
				setData(json);
				setPage(currentPage);
			} catch (err: any) {
				setError(err.message || "Failed to load audit log");
			} finally {
				setLoading(false);
			}
		},
		[dateFrom, dateTo, agencyFilter, actionType],
	);

	useEffect(() => {
		if (session) fetchLogs(1);
	}, [session]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		fetchLogs(1);
	};

	const handleExportCSV = async () => {
		setExporting(true);
		try {
			const params = new URLSearchParams({ format: "csv", limit: "10000" });
			if (dateFrom) params.set("dateFrom", dateFrom);
			if (dateTo) params.set("dateTo", dateTo);
			if (agencyFilter.trim()) params.set("agencyName", agencyFilter.trim());
			if (actionType) params.set("actionType", actionType);

			const res = await fetch(`/api/admin/audit-log?${params}`);
			if (!res.ok) throw new Error("Export failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err: any) {
			setError(err.message || "Export failed");
		} finally {
			setExporting(false);
		}
	};

	if (status === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-[#0B4F96]" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-6">
					<button
						onClick={() => router.push("/admin")}
						className="flex items-center text-gray-600 hover:text-[#0B4F96] mb-4 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Admin
					</button>
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
								<FileText className="h-8 w-8 text-[#0B4F96]" />
								Audit Log
							</h1>
							<p className="text-gray-600 mt-1">
								Platform-wide action trail for HIPAA compliance
							</p>
						</div>
						<button
							onClick={handleExportCSV}
							disabled={exporting || loading}
							className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] disabled:opacity-50 transition-colors"
						>
							{exporting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							Export CSV
						</button>
					</div>
				</div>

				{/* Filters */}
				<form
					onSubmit={handleSearch}
					className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6"
				>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								From Date
							</label>
							<input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								To Date
							</label>
							<input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Action Type
							</label>
							<select
								value={actionType}
								onChange={(e) => setActionType(e.target.value)}
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							>
								<option value="">All actions</option>
								{ACTION_TYPES.map((t) => (
									<option key={t} value={t}>
										{t.replace(/_/g, " ")}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								Agency Name
							</label>
							<input
								type="text"
								value={agencyFilter}
								onChange={(e) => setAgencyFilter(e.target.value)}
								placeholder="Filter by agency name"
								className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
					</div>
					<div className="flex gap-3 mt-4">
						<button
							type="submit"
							className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm"
						>
							<Search className="h-4 w-4" />
							Search
						</button>
						<button
							type="button"
							onClick={() => {
								setDateFrom("");
								setDateTo("");
								setAgencyFilter("");
								setActionType("");
								setTimeout(() => fetchLogs(1), 0);
							}}
							className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
						>
							<RefreshCw className="h-4 w-4" />
							Clear
						</button>
					</div>
				</form>

				{/* Error */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
						<p className="text-red-800 text-sm">{error}</p>
					</div>
				)}

				{/* Table */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="h-8 w-8 animate-spin text-[#0B4F96]" />
						</div>
					) : !data || data.actions.length === 0 ? (
						<div className="text-center py-16 text-gray-500">
							<FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
							<p className="font-medium">No audit records found</p>
							<p className="text-sm mt-1">Try adjusting your filters</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-gray-50 border-b border-gray-200">
										<tr>
											<th className="text-left px-4 py-3 font-medium text-gray-700">
												Timestamp
											</th>
											<th className="text-left px-4 py-3 font-medium text-gray-700">
												Admin
											</th>
											<th className="text-left px-4 py-3 font-medium text-gray-700">
												Agency
											</th>
											<th className="text-left px-4 py-3 font-medium text-gray-700">
												Action
											</th>
											<th className="text-left px-4 py-3 font-medium text-gray-700">
												Details
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{data.actions.map((entry) => (
											<tr key={entry.id} className="hover:bg-gray-50 transition-colors">
												<td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
													{new Date(entry.createdAt).toLocaleString()}
												</td>
												<td className="px-4 py-3">
													<div className="font-medium text-gray-900">
														{entry.adminName || "Unknown"}
													</div>
													<div className="text-xs text-gray-500">
														{entry.adminEmail || entry.adminId}
													</div>
												</td>
												<td className="px-4 py-3 text-gray-700">
													{entry.agencyName || (
														<span className="text-gray-400 italic">—</span>
													)}
												</td>
												<td className="px-4 py-3">
													<span
														className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[entry.actionType] || "bg-gray-100 text-gray-800"}`}
													>
														{entry.actionType.replace(/_/g, " ")}
													</span>
												</td>
												<td className="px-4 py-3 max-w-xs">
													{entry.notes && (
														<div className="text-gray-700 mb-1">{entry.notes}</div>
													)}
													{entry.details && Object.keys(entry.details).length > 0 && (
														<details className="cursor-pointer">
															<summary className="text-xs text-gray-500 hover:text-gray-700">
																View details
															</summary>
															<pre className="mt-1 text-xs bg-gray-50 rounded p-2 overflow-x-auto max-w-xs">
																{JSON.stringify(entry.details, null, 2)}
															</pre>
														</details>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
								<p className="text-sm text-gray-600">
									Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, data.total)} of{" "}
									{data.total.toLocaleString()} records
								</p>
								<div className="flex items-center gap-2">
									<button
										onClick={() => fetchLogs(page - 1)}
										disabled={page <= 1 || loading}
										className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<ChevronLeft className="h-5 w-5 text-gray-600" />
									</button>
									<span className="text-sm text-gray-700 px-2">
										Page {page} of {data.totalPages}
									</span>
									<button
										onClick={() => fetchLogs(page + 1)}
										disabled={page >= data.totalPages || loading}
										className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<ChevronRight className="h-5 w-5 text-gray-600" />
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
