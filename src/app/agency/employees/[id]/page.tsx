"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
	ArrowLeft,
	Upload,
	FileText,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Edit,
	User,
	Mail,
	Phone,
	Briefcase,
	Calendar,
	Hash,
} from "lucide-react";
import DocumentList from "@/components/documents/DocumentList";
import DocumentUpload from "@/components/documents/DocumentUpload";
import EmployeeForm from "@/components/employees/EmployeeForm";

interface Employee {
	id: string;
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	employeeNumber: string | null;
	hireDate: string | null;
	department: string | null;
	position: string | null;
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
	notes: string | null;
	createdAt: string;
	documentType: {
		id: string;
		name: string;
	};
}

interface DocumentType {
	id: string;
	name: string;
	description: string | null;
	expirationDays: number | null;
}

export default function EmployeeDetailPage() {
	const router = useRouter();
	const params = useParams();
	const { data: session, status: sessionStatus } = useSession();
	const [employee, setEmployee] = useState<Employee | null>(null);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
	const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
	const [stats, setStats] = useState({
		total: 0,
		active: 0,
		expiringSoon: 0,
		expired: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [statusFilter, setStatusFilter] = useState("ALL");
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);

	const employeeId = params.id as string;

	useEffect(() => {
		if (sessionStatus === "loading") return;

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

		fetchData();
	}, [session, sessionStatus, router, employeeId]);

	useEffect(() => {
		// Filter documents based on status
		if (statusFilter === "ALL") {
			setFilteredDocuments(documents);
		} else {
			setFilteredDocuments(
				documents.filter((doc) => doc.status === statusFilter)
			);
		}
	}, [documents, statusFilter]);

	const fetchData = async () => {
		setLoading(true);
		setError("");

		try {
			// Fetch employee details
			const employeeResponse = await fetch(
				`/api/agency/employees/${employeeId}`
			);
			if (!employeeResponse.ok) {
				throw new Error("Failed to fetch employee");
			}
			const employeeData = await employeeResponse.json();
			setEmployee(employeeData.employee);

			// Fetch documents
			const docsResponse = await fetch(
				`/api/agency/employees/${employeeId}/documents`
			);
			if (!docsResponse.ok) {
				throw new Error("Failed to fetch documents");
			}
			const docsData = await docsResponse.json();
			setDocuments(docsData.documents);
			setFilteredDocuments(docsData.documents);
			setStats(docsData.stats);

			// Fetch document types
			const typesResponse = await fetch("/api/agency/document-types");
			if (!typesResponse.ok) {
				throw new Error("Failed to fetch document types");
			}
			const typesData = await typesResponse.json();
			setDocumentTypes(typesData.documentTypes);
		} catch (err: any) {
			setError(err.message || "Failed to load employee data");
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async (documentId: string) => {
		try {
			const response = await fetch(
				`/api/agency/documents/${documentId}/download`
			);

			if (!response.ok) {
				throw new Error("Failed to generate download link");
			}

			const data = await response.json();
			// Open download URL in new tab
			window.open(data.downloadUrl, "_blank");
		} catch (err: any) {
			alert(err.message || "Failed to download document");
		}
	};

	const handleDelete = async (documentId: string) => {
		try {
			const response = await fetch(`/api/agency/documents/${documentId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("Failed to delete document");
			}

			// Refresh documents
			fetchData();
		} catch (err: any) {
			alert(err.message || "Failed to delete document");
		}
	};

	const handleUploadSuccess = () => {
		setShowUploadModal(false);
		fetchData();
	};

	const handleEditSuccess = () => {
		setShowEditModal(false);
		fetchData();
	};

	if (loading || sessionStatus === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading employee details...</p>
				</div>
			</div>
		);
	}

	if (error || !employee) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<XCircle className="mx-auto h-12 w-12 text-red-500" />
					<p className="mt-4 text-gray-900 font-medium">
						{error || "Employee not found"}
					</p>
					<button
						onClick={() => router.push("/agency/employees")}
						className="mt-4 text-[#0B4F96] hover:text-[#48ccbc]"
					>
						← Back to Employees
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Back Button */}
				<button
					onClick={() => router.push("/agency/employees")}
					className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Employees
				</button>

				{/* Employee Header */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<div className="flex items-start justify-between mb-6">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								{employee.firstName} {employee.lastName}
							</h1>
							<p className="text-gray-600 mt-1">{employee.position || "—"}</p>
						</div>
						<div className="flex items-center gap-3">
							<span
								className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
									employee.status === "ACTIVE"
										? "bg-green-100 text-green-800"
										: employee.status === "ON_LEAVE"
										? "bg-yellow-100 text-yellow-800"
										: "bg-gray-100 text-gray-800"
								}`}
							>
								{employee.status}
							</span>
							<button
								onClick={() => setShowEditModal(true)}
								className="flex items-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280]"
							>
								<Edit className="h-4 w-4" />
								Edit
							</button>
						</div>
					</div>

					{/* Employee Details Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{employee.email && (
							<div className="flex items-center gap-3">
								<Mail className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-xs text-gray-500">Email</p>
									<p className="text-sm text-gray-900">{employee.email}</p>
								</div>
							</div>
						)}

						{employee.phone && (
							<div className="flex items-center gap-3">
								<Phone className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-xs text-gray-500">Phone</p>
									<p className="text-sm text-gray-900">{employee.phone}</p>
								</div>
							</div>
						)}

						{employee.employeeNumber && (
							<div className="flex items-center gap-3">
								<Hash className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-xs text-gray-500">Employee Number</p>
									<p className="text-sm text-gray-900">
										{employee.employeeNumber}
									</p>
								</div>
							</div>
						)}

						{employee.department && (
							<div className="flex items-center gap-3">
								<Briefcase className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-xs text-gray-500">Department</p>
									<p className="text-sm text-gray-900">{employee.department}</p>
								</div>
							</div>
						)}

						{employee.hireDate && (
							<div className="flex items-center gap-3">
								<Calendar className="h-5 w-5 text-gray-400" />
								<div>
									<p className="text-xs text-gray-500">Hire Date</p>
									<p className="text-sm text-gray-900">
										{new Date(employee.hireDate).toLocaleDateString()}
									</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Document Stats */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Total Documents</p>
								<p className="text-2xl font-bold text-gray-900">{stats.total}</p>
							</div>
							<FileText className="h-10 w-10 text-[#0B4F96]" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Active</p>
								<p className="text-2xl font-bold text-green-600">
									{stats.active}
								</p>
							</div>
							<CheckCircle className="h-10 w-10 text-green-600" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Expiring Soon</p>
								<p className="text-2xl font-bold text-yellow-600">
									{stats.expiringSoon}
								</p>
							</div>
							<AlertTriangle className="h-10 w-10 text-yellow-600" />
						</div>
					</div>

					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600">Expired</p>
								<p className="text-2xl font-bold text-red-600">
									{stats.expired}
								</p>
							</div>
							<XCircle className="h-10 w-10 text-red-600" />
						</div>
					</div>
				</div>

				{/* Documents Section */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-bold text-gray-900">Documents</h2>
						<div className="flex items-center gap-3">
							{/* Status Filter */}
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							>
								<option value="ALL">All Status</option>
								<option value="ACTIVE">Active</option>
								<option value="EXPIRING_SOON">Expiring Soon</option>
								<option value="EXPIRED">Expired</option>
							</select>

							{/* Upload Button */}
							<button
								onClick={() => setShowUploadModal(true)}
								className="flex items-center gap-2 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280]"
							>
								<Upload className="h-5 w-5" />
								Upload Document
							</button>
						</div>
					</div>

					{/* Document List */}
					<DocumentList
						documents={filteredDocuments}
						onDownload={handleDownload}
						onDelete={handleDelete}
						canDelete={true}
					/>
				</div>
			</div>

			{/* Upload Modal */}
			{showUploadModal && (
				<DocumentUpload
					employeeId={employeeId}
					documentTypes={documentTypes}
					onSuccess={handleUploadSuccess}
					onClose={() => setShowUploadModal(false)}
				/>
			)}

			{/* Edit Modal */}
			{showEditModal && employee && (
				<EmployeeForm
					employee={{
						...employee,
						hireDate: employee.hireDate || null,
						status: employee.status as any,
					}}
					onSuccess={handleEditSuccess}
					onClose={() => setShowEditModal(false)}
				/>
			)}
		</div>
	);
}
