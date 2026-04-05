"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
	Users,
	UserCheck,
	UserX,
	AlertTriangle,
	Plus,
	Search,
	Eye,
	Edit,
	UserMinus,
	FileText,
} from "lucide-react";
import EmployeeForm from "@/components/employees/EmployeeForm";
import LogReferralModal from "@/components/LogReferralModal";

interface Employee {
	id: string;
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	position: string | null;
	status: string;
	documentCount: number;
	expiringDocCount: number;
	expiredDocCount: number;
}

export default function EmployeesPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
	const [stats, setStats] = useState({
		total: 0,
		active: 0,
		inactive: 0,
		withExpiringDocs: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("ALL");
	const [showForm, setShowForm] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [showLogReferral, setShowLogReferral] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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

		fetchEmployees();
	}, [session, status, router]);

	useEffect(() => {
		// Filter employees based on search and status
		let filtered = employees;

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(emp) =>
					emp.firstName.toLowerCase().includes(query) ||
					emp.lastName.toLowerCase().includes(query) ||
					emp.email?.toLowerCase().includes(query) ||
					emp.position?.toLowerCase().includes(query)
			);
		}

		if (statusFilter !== "ALL") {
			filtered = filtered.filter((emp) => emp.status === statusFilter);
		}

		setFilteredEmployees(filtered);
	}, [employees, searchQuery, statusFilter]);

	const fetchEmployees = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/agency/employees");

			if (!response.ok) {
				throw new Error("Failed to fetch employees");
			}

			const data = await response.json();
			setEmployees(data.employees);
			setFilteredEmployees(data.employees);
			setStats(data.stats);
		} catch (err: any) {
			setError(err.message || "Failed to load employees");
		} finally {
			setLoading(false);
		}
	};

	const handleDeactivate = async (employeeId: string) => {
		const confirmed = confirm(
			"Are you sure you want to deactivate this employee? They will no longer appear in the active employee list."
		);

		if (!confirmed) return;

		try {
			const response = await fetch(`/api/agency/employees/${employeeId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to deactivate employee");
			}

			// Refresh list
			fetchEmployees();
		} catch (err: any) {
			alert(err.message || "Failed to deactivate employee");
		}
	};

	const handleFormSuccess = () => {
		setShowForm(false);
		setEditingEmployee(null);
		fetchEmployees();
	};

	const handleEdit = (employee: Employee) => {
		setEditingEmployee(employee);
		setShowForm(true);
	};

	const handleLogReferral = (employee: Employee) => {
		setSelectedEmployee(employee);
		setShowLogReferral(true);
	};

	const handleReferralSuccess = () => {
		setShowLogReferral(false);
		setSelectedEmployee(null);
		// Optionally refresh data
	};

	if (loading || status === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading employees...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Employees</h1>
						<p className="text-gray-600 mt-1">
							Manage your agency's employees and their compliance documents
						</p>
					</div>
					<button
						onClick={() => {
							setEditingEmployee(null);
							setShowForm(true);
						}}
						className="flex items-center gap-2 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] font-medium"
					>
						<Plus className="h-5 w-5" />
						Add Employee
					</button>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-700">{error}</p>
					</div>
				)}

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Total Employees</p>
								<p className="text-3xl font-bold text-gray-900">{stats.total}</p>
							</div>
							<Users className="h-12 w-12 text-[#0B4F96]" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Active</p>
								<p className="text-3xl font-bold text-green-600">{stats.active}</p>
							</div>
							<UserCheck className="h-12 w-12 text-green-600" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Inactive</p>
								<p className="text-3xl font-bold text-gray-600">
									{stats.inactive}
								</p>
							</div>
							<UserX className="h-12 w-12 text-gray-600" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">With Expiring Docs</p>
								<p className="text-3xl font-bold text-yellow-600">
									{stats.withExpiringDocs}
								</p>
							</div>
							<AlertTriangle className="h-12 w-12 text-yellow-600" />
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-lg shadow-md p-4 mb-6">
					<div className="flex flex-col md:flex-row gap-4">
						{/* Search */}
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search by name, email, or position..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
								/>
							</div>
						</div>

						{/* Status Filter */}
						<div>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							>
								<option value="ALL">All Status</option>
								<option value="ACTIVE">Active</option>
								<option value="INACTIVE">Inactive</option>
								<option value="ON_LEAVE">On Leave</option>
								<option value="TERMINATED">Terminated</option>
							</select>
						</div>
					</div>
				</div>

				{/* Employee Table */}
				<div className="bg-white rounded-lg shadow-md overflow-hidden">
					{filteredEmployees.length === 0 ? (
						<div className="text-center py-12">
							<Users className="mx-auto h-12 w-12 text-gray-400" />
							<p className="mt-2 text-sm text-gray-600">
								{searchQuery || statusFilter !== "ALL"
									? "No employees match your filters"
									: "No employees yet. Add your first employee to get started."}
							</p>
						</div>
					) : (
						<>
							{/* Desktop Table */}
							<div className="hidden md:block overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Name
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Position
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Contact
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Status
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Documents
											</th>
											<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{filteredEmployees.map((employee) => (
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
													<div className="text-sm text-gray-600">
														{employee.email || "—"}
													</div>
													<div className="text-xs text-gray-500">
														{employee.phone || ""}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
															employee.status === "ACTIVE"
																? "bg-green-100 text-green-800"
																: "bg-gray-100 text-gray-800"
														}`}
													>
														{employee.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-2">
														<span className="text-sm text-gray-900">
															{employee.documentCount}
														</span>
														{employee.expiredDocCount > 0 && (
															<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
																{employee.expiredDocCount} expired
															</span>
														)}
														{employee.expiringDocCount > 0 && (
															<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
																{employee.expiringDocCount} expiring
															</span>
														)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													<div className="flex items-center justify-end gap-2">
														<button
															onClick={() => handleLogReferral(employee)}
															className="text-green-600 hover:text-green-800 p-1"
															title="Log Referral"
														>
															<FileText className="h-4 w-4" />
														</button>
														<button
															onClick={() =>
																router.push(`/agency/employees/${employee.id}`)
															}
															className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
															title="View Details"
														>
															<Eye className="h-4 w-4" />
														</button>
														<button
															onClick={() => handleEdit(employee)}
															className="text-gray-600 hover:text-gray-900 p-1"
															title="Edit"
														>
															<Edit className="h-4 w-4" />
														</button>
														{employee.status === "ACTIVE" && (
															<button
																onClick={() => handleDeactivate(employee.id)}
																className="text-red-600 hover:text-red-800 p-1"
																title="Deactivate"
															>
																<UserMinus className="h-4 w-4" />
															</button>
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Mobile Card View */}
							<div className="md:hidden divide-y divide-gray-200">
								{filteredEmployees.map((employee) => (
									<div key={employee.id} className="p-4 space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<p className="font-medium text-gray-900">
													{employee.firstName} {employee.lastName}
												</p>
												<p className="text-sm text-gray-600">
													{employee.position || "—"}
												</p>
											</div>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													employee.status === "ACTIVE"
														? "bg-green-100 text-green-800"
														: "bg-gray-100 text-gray-800"
												}`}
											>
												{employee.status}
											</span>
										</div>

										{employee.email && (
											<p className="text-sm text-gray-600">{employee.email}</p>
										)}

										<div className="flex items-center gap-2">
											<span className="text-sm text-gray-600">
												{employee.documentCount} documents
											</span>
											{employee.expiredDocCount > 0 && (
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
													{employee.expiredDocCount} expired
												</span>
											)}
										</div>

										<div className="flex gap-2 pt-2">
											<button
												onClick={() => handleLogReferral(employee)}
												className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
												title="Log Referral"
											>
												<FileText className="h-4 w-4" />
											</button>
											<button
												onClick={() =>
													router.push(`/agency/employees/${employee.id}`)
												}
												className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm"
											>
												<Eye className="h-4 w-4" />
												View Details
											</button>
											<button
												onClick={() => handleEdit(employee)}
												className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
											>
												<Edit className="h-4 w-4" />
											</button>
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Employee Form Modal */}
			{showForm && (
				<EmployeeForm
					employee={editingEmployee || undefined}
					onSuccess={handleFormSuccess}
					onClose={() => {
						setShowForm(false);
						setEditingEmployee(null);
					}}
				/>
			)}

			{/* Log Referral Modal */}
			{showLogReferral && selectedEmployee && (
				<LogReferralModal
					isOpen={showLogReferral}
					onClose={() => {
						setShowLogReferral(false);
						setSelectedEmployee(null);
					}}
					onSuccess={handleReferralSuccess}
					employeeName={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
				/>
			)}
		</div>
	);
}
