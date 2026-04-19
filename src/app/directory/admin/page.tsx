"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	Building2,
	Search,
	Loader2,
	AlertCircle,
	RefreshCw,
	ArrowLeft,
} from "lucide-react";
import AgencyList from "@/components/admin/AgencyList";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

interface User {
	id: string;
	name: string | null;
	email: string;
	role: string;
}

interface Agency {
	id: string;
	agencyName: string;
	licenseNumber: string;
	agencySize: import("@prisma/client").AgencySize;
	primaryContactName: string;
	primaryContactEmail: string;
	serviceArea: string[];
	approvalStatus: ApprovalStatus;
	createdAt: string;
	users: User[];
	_count: {
		users: number;
	};
}

interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
}

/**
 * Directory Admin Page
 *
 * Allows platform admins to moderate agencies in the referral directory
 * This page focuses on approved agencies that appear in the directory
 */
export default function DirectoryAdminPage() {
	const router = useRouter();
	const [agencies, setAgencies] = useState<Agency[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [activeTab, setActiveTab] = useState<ApprovalStatus | "ALL">("APPROVED");
	const [searchQuery, setSearchQuery] = useState("");
	const [pagination, setPagination] = useState<PaginationInfo>({
		page: 1,
		limit: 10,
		total: 0,
		totalPages: 0,
		hasMore: false,
	});

	// Fetch agencies from API
	const fetchAgencies = async (
		status?: ApprovalStatus | "ALL",
		search?: string,
		page: number = 1
	) => {
		try {
			setLoading(true);
			setError("");

			const params = new URLSearchParams({
				page: page.toString(),
				limit: "10",
			});

			if (status && status !== "ALL") {
				params.append("status", status);
			}

			if (search && search.trim()) {
				params.append("search", search.trim());
			}

			const response = await fetch(`/api/admin/agencies?${params.toString()}`);

			if (!response.ok) {
				throw new Error("Failed to fetch agencies");
			}

			const data = await response.json();
			setAgencies(data.agencies || []);
			setPagination(data.pagination || pagination);
		} catch (err) {
			console.error("Error fetching agencies:", err);
			setError(err instanceof Error ? err.message : "Failed to load agencies");
		} finally {
			setLoading(false);
		}
	};

	// Load agencies on mount and when filters change
	useEffect(() => {
		fetchAgencies(activeTab, searchQuery, pagination.page);
	}, [activeTab]);

	const handleTabChange = (tab: ApprovalStatus | "ALL") => {
		setActiveTab(tab);
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setPagination((prev) => ({ ...prev, page: 1 }));
		fetchAgencies(activeTab, searchQuery, 1);
	};

	const handleClearSearch = () => {
		setSearchQuery("");
		setPagination((prev) => ({ ...prev, page: 1 }));
		fetchAgencies(activeTab, "", 1);
	};

	const handlePageChange = (newPage: number) => {
		setPagination((prev) => ({ ...prev, page: newPage }));
		fetchAgencies(activeTab, searchQuery, newPage);
	};

	const handleAgencyClick = (agencyId: string) => {
		router.push(`/admin/agencies/${agencyId}`);
	};

	// Count agencies by status for tab badges
	const statusCounts = {
		ALL: pagination.total,
		APPROVED: 0,
		PENDING: 0,
		REJECTED: 0,
		SUSPENDED: 0,
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<Link
							href="/directory"
							className="flex items-center gap-2 text-gray-600 hover:text-[#0B4F96] transition-colors"
						>
							<ArrowLeft className="w-5 h-5" />
							<span>Back to Directory</span>
						</Link>
					</div>

					<div className="flex items-center gap-4">
						<div className="w-12 h-12 bg-[#0B4F96] rounded-lg flex items-center justify-center">
							<Building2 className="w-7 h-7 text-white" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Directory Admin</h1>
							<p className="text-gray-600 mt-1">
								Manage agencies in the referral directory
							</p>
						</div>
					</div>
				</div>

				{/* Status Tabs */}
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
					<div className="flex flex-wrap border-b border-gray-200">
						{(["ALL", "APPROVED", "PENDING", "REJECTED", "SUSPENDED"] as const).map(
							(tab) => (
								<button
									key={tab}
									onClick={() => handleTabChange(tab)}
									className={`px-6 py-4 text-sm font-medium transition-colors relative ${
										activeTab === tab
											? "text-[#0B4F96] border-b-2 border-[#0B4F96]"
											: "text-gray-600 hover:text-gray-900"
									}`}
								>
									{tab === "ALL"
										? "All Agencies"
										: tab.charAt(0) + tab.slice(1).toLowerCase()}
									{statusCounts[tab] > 0 && (
										<span
											className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
												activeTab === tab
													? "bg-[#0B4F96] text-white"
													: "bg-gray-200 text-gray-600"
											}`}
										>
											{statusCounts[tab]}
										</span>
									)}
								</button>
							)
						)}
					</div>

					{/* Search Bar */}
					<div className="p-4 bg-gray-50 border-t border-gray-200">
						<form onSubmit={handleSearch} className="flex gap-2">
							<div className="flex-1 relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search by agency name, license number, or city..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
								/>
							</div>
							<button
								type="submit"
								disabled={loading}
								className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#094080] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
							>
								Search
							</button>
							{searchQuery && (
								<button
									type="button"
									onClick={handleClearSearch}
									className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
								>
									Clear
								</button>
							)}
						</form>
					</div>
				</div>

				{/* Error State */}
				{error && (
					<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<p className="text-red-700 font-medium">Error loading agencies</p>
							<p className="text-red-600 text-sm mt-1">{error}</p>
						</div>
						<button
							onClick={() => fetchAgencies(activeTab, searchQuery, pagination.page)}
							className="text-red-700 hover:text-red-900"
						>
							<RefreshCw className="w-5 h-5" />
						</button>
					</div>
				)}

				{/* Loading State */}
				{loading ? (
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
						<Loader2 className="w-12 h-12 text-[#0B4F96] animate-spin mb-4" />
						<p className="text-gray-600">Loading agencies...</p>
					</div>
				) : agencies.length === 0 ? (
					/* Empty State */
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
						<Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							No agencies found
						</h3>
						<p className="text-gray-600">
							{searchQuery
								? "Try adjusting your search criteria"
								: `No ${
										activeTab === "ALL" ? "" : activeTab.toLowerCase()
								  } agencies to display`}
						</p>
					</div>
				) : (
					/* Agency List */
					<>
						<AgencyList agencies={agencies} onAgencyClick={handleAgencyClick} />

						{/* Pagination */}
						{pagination.totalPages > 1 && (
							<div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
								<div className="text-sm text-gray-600">
									Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
									{Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
									{pagination.total} agencies
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => handlePageChange(pagination.page - 1)}
										disabled={pagination.page === 1}
										className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Previous
									</button>
									<div className="flex items-center gap-1">
										{Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
											.filter(
												(page) =>
													page === 1 ||
													page === pagination.totalPages ||
													Math.abs(page - pagination.page) <= 1
											)
											.map((page, index, array) => (
												<div key={page} className="flex items-center">
													{index > 0 && array[index - 1] !== page - 1 && (
														<span className="px-2 text-gray-400">...</span>
													)}
													<button
														onClick={() => handlePageChange(page)}
														className={`px-4 py-2 rounded-lg transition-colors ${
															pagination.page === page
																? "bg-[#0B4F96] text-white"
																: "bg-gray-100 text-gray-700 hover:bg-gray-200"
														}`}
													>
														{page}
													</button>
												</div>
											))}
									</div>
									<button
										onClick={() => handlePageChange(pagination.page + 1)}
										disabled={!pagination.hasMore}
										className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Next
									</button>
								</div>
							</div>
						)}
					</>
				)}

				{/* Info Card */}
				<div className="mt-8 bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg">
					<p className="text-sm text-gray-700">
						<strong>Directory Admin:</strong> Use this page to manage agencies that
						appear in the public referral directory. Only approved agencies are
						visible to directory users. Click on any agency to view details or take
						moderation actions.
					</p>
				</div>
			</div>
		</div>
	);
}
