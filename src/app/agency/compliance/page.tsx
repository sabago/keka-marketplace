"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import DocumentStatusBadge from "@/components/documents/DocumentStatusBadge";

interface ComplianceStats {
	employees: {
		total: number;
		active: number;
		inactive: number;
	};
	documents: {
		total: number;
		active: number;
		expiringSoon: number;
		expired: number;
	};
	employeesWithExpiredDocs: number;
}

interface DocumentWithEmployee {
	id: string;
	fileName: string;
	expirationDate: string;
	status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "ARCHIVED";
	daysExpired?: number;
	daysUntilExpiration?: number;
	documentType: {
		id: string;
		name: string;
	};
	employee: {
		id: string;
		firstName: string;
		lastName: string;
		position: string | null;
	};
}

interface EmployeeWithIssues {
	id: string;
	firstName: string;
	lastName: string;
	position: string | null;
	status: string;
	expiredCount: number;
	expiringCount: number;
	totalIssues: number;
}

export default function ComplianceDashboardPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const [stats, setStats] = useState<ComplianceStats | null>(null);
	const [expiredDocuments, setExpiredDocuments] = useState<
		DocumentWithEmployee[]
	>([]);
	const [expiringDocuments, setExpiringDocuments] = useState<
		DocumentWithEmployee[]
	>([]);
	const [employeesWithIssues, setEmployeesWithIssues] = useState<
		EmployeeWithIssues[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [activeTab, setActiveTab] = useState<"expired" | "expiring">("expired");

	useEffect(() => {
		if (status === "loading") return;

		if (!session) {
			router.push("/auth/signin");
			return;
		}

		if (
			session.user?.role !== "AGENCY_ADMIN" &&
			session.user?.role !== "PLATFORM_ADMIN"
		) {
			router.push("/dashboard");
			return;
		}

		fetchDashboardData();
	}, [session, status, router]);

	const fetchDashboardData = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/agency/compliance/dashboard");

			if (!response.ok) {
				throw new Error("Failed to fetch compliance data");
			}

			const data = await response.json();
			setStats(data.stats);
			setExpiredDocuments(data.expiredDocuments);
			setExpiringDocuments(data.expiringDocuments);
			setEmployeesWithIssues(data.employeesWithIssues);
		} catch (err: any) {
			setError(err.message || "Failed to load compliance dashboard");
		} finally {
			setLoading(false);
		}
	};

	const handleViewEmployee = (employeeId: string) => {
		router.push(`/agency/employees/${employeeId}`);
	};

	const handleDownloadDocument = async (documentId: string) => {
		try {
			const response = await fetch(
				`/api/agency/documents/${documentId}/download`
			);

			if (!response.ok) {
				throw new Error("Failed to generate download link");
			}

			const data = await response.json();
			window.open(data.downloadUrl, "_blank");
		} catch (err: any) {
			alert(err.message || "Failed to download document");
		}
	};

	if (loading || status === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
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
					<p className="mt-4 text-gray-900 font-medium">
						{error || "Failed to load dashboard"}
					</p>
					<button
						onClick={fetchDashboardData}
						className="mt-4 text-[#0B4F96] hover:text-[#48ccbc]"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	const complianceRate =
		stats.documents.total > 0
			? Math.round(
					((stats.documents.active + stats.documents.expiringSoon) /
						stats.documents.total) *
						100
			  )
			: 100;

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900">
						Compliance Dashboard
					</h1>
					<p className="text-gray-600 mt-1">
						Monitor document expiration and compliance status across your agency
					</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
					{/* Overall Compliance Rate */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Compliance Rate</p>
								<p
									className={`text-3xl font-bold ${
										complianceRate >= 90
											? "text-green-600"
											: complianceRate >= 70
											? "text-yellow-600"
											: "text-red-600"
									}`}
								>
									{complianceRate}%
								</p>
							</div>
							<TrendingUp
								className={`h-12 w-12 ${
									complianceRate >= 90
										? "text-green-600"
										: complianceRate >= 70
										? "text-yellow-600"
										: "text-red-600"
								}`}
							/>
						</div>
					</div>

					{/* Expired Documents */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Expired Documents</p>
								<p className="text-3xl font-bold text-red-600">
									{stats.documents.expired}
								</p>
							</div>
							<XCircle className="h-12 w-12 text-red-600" />
						</div>
					</div>

					{/* Expiring Soon */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Expiring Soon</p>
								<p className="text-3xl font-bold text-yellow-600">
									{stats.documents.expiringSoon}
								</p>
							</div>
							<AlertTriangle className="h-12 w-12 text-yellow-600" />
						</div>
					</div>

					{/* Employees with Issues */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Employees w/ Issues</p>
								<p className="text-3xl font-bold text-gray-900">
									{stats.employeesWithExpiredDocs}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									of {stats.employees.active} active
								</p>
							</div>
							<Users className="h-12 w-12 text-gray-600" />
						</div>
					</div>
				</div>

				{/* Employees with Issues */}
				{employeesWithIssues.length > 0 && (
					<div className="bg-white rounded-lg shadow-md p-6 mb-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4">
							Employees Requiring Attention
						</h2>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Employee
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Position
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Expired
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Expiring
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Total Issues
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{employeesWithIssues.map((employee) => (
										<tr key={employee.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="font-medium text-gray-900">
													{employee.firstName} {employee.lastName}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm text-gray-600">
													{employee.position || "—"}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
													{employee.expiredCount}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
													{employee.expiringCount}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="text-sm font-medium text-gray-900">
													{employee.totalIssues}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right">
												<button
													onClick={() => handleViewEmployee(employee.id)}
													className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
													title="View Employee"
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

				{/* Document Lists */}
				<div className="bg-white rounded-lg shadow-md p-6">
					{/* Tabs */}
					<div className="border-b border-gray-200 mb-6">
						<nav className="-mb-px flex space-x-8">
							<button
								onClick={() => setActiveTab("expired")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									activeTab === "expired"
										? "border-red-500 text-red-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Expired Documents ({expiredDocuments.length})
							</button>
							<button
								onClick={() => setActiveTab("expiring")}
								className={`py-4 px-1 border-b-2 font-medium text-sm ${
									activeTab === "expiring"
										? "border-yellow-500 text-yellow-600"
										: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
								}`}
							>
								Expiring Soon ({expiringDocuments.length})
							</button>
						</nav>
					</div>

					{/* Expired Documents Table */}
					{activeTab === "expired" && (
						<>
							{expiredDocuments.length === 0 ? (
								<div className="text-center py-12">
									<FileText className="mx-auto h-12 w-12 text-gray-400" />
									<p className="mt-2 text-sm text-gray-600">
										No expired documents. Great job!
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Employee
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Document Type
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Expired Date
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Days Overdue
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{expiredDocuments.map((doc) => (
												<tr key={doc.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap">
														<div>
															<p className="font-medium text-gray-900">
																{doc.employee.firstName}{" "}
																{doc.employee.lastName}
															</p>
															<p className="text-xs text-gray-500">
																{doc.employee.position || "—"}
															</p>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div>
															<p className="text-sm text-gray-900">
																{doc.documentType.name}
															</p>
															<p className="text-xs text-gray-500">
																{doc.fileName}
															</p>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center gap-1 text-sm text-gray-600">
															<Calendar className="h-4 w-4" />
															{new Date(doc.expirationDate).toLocaleDateString()}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
															{doc.daysExpired} days
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right">
														<div className="flex items-center justify-end gap-2">
															<button
																onClick={() => handleViewEmployee(doc.employee.id)}
																className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
																title="View Employee"
															>
																<Eye className="h-4 w-4" />
															</button>
															<button
																onClick={() => handleDownloadDocument(doc.id)}
																className="text-gray-600 hover:text-gray-900 p-1"
																title="Download"
															>
																<Download className="h-4 w-4" />
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</>
					)}

					{/* Expiring Soon Documents Table */}
					{activeTab === "expiring" && (
						<>
							{expiringDocuments.length === 0 ? (
								<div className="text-center py-12">
									<FileText className="mx-auto h-12 w-12 text-gray-400" />
									<p className="mt-2 text-sm text-gray-600">
										No documents expiring soon
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Employee
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Document Type
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Expiration Date
												</th>
												<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Days Remaining
												</th>
												<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{expiringDocuments.map((doc) => (
												<tr key={doc.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap">
														<div>
															<p className="font-medium text-gray-900">
																{doc.employee.firstName}{" "}
																{doc.employee.lastName}
															</p>
															<p className="text-xs text-gray-500">
																{doc.employee.position || "—"}
															</p>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div>
															<p className="text-sm text-gray-900">
																{doc.documentType.name}
															</p>
															<p className="text-xs text-gray-500">
																{doc.fileName}
															</p>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center gap-1 text-sm text-gray-600">
															<Calendar className="h-4 w-4" />
															{new Date(doc.expirationDate).toLocaleDateString()}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<span
															className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																doc.daysUntilExpiration! <= 7
																	? "bg-red-100 text-red-800"
																	: "bg-yellow-100 text-yellow-800"
															}`}
														>
															{doc.daysUntilExpiration} days
														</span>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right">
														<div className="flex items-center justify-end gap-2">
															<button
																onClick={() => handleViewEmployee(doc.employee.id)}
																className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
																title="View Employee"
															>
																<Eye className="h-4 w-4" />
															</button>
															<button
																onClick={() => handleDownloadDocument(doc.id)}
																className="text-gray-600 hover:text-gray-900 p-1"
																title="Download"
															>
																<Download className="h-4 w-4" />
															</button>
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
