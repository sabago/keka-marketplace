"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
	Plus,
	Edit,
	Trash2,
	FileText,
	Globe,
	Building,
	Calendar,
	Bell,
	CheckCircle,
} from "lucide-react";
import DocumentTypeForm from "@/components/documents/DocumentTypeForm";

interface DocumentType {
	id: string;
	name: string;
	description: string | null;
	expirationDays: number | null;
	reminderDays: number[];
	isRequired: boolean;
	isGlobal: boolean;
	isActive: boolean;
	_count?: {
		documents: number;
	};
}

export default function DocumentTypesPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showForm, setShowForm] = useState(false);
	const [editingType, setEditingType] = useState<DocumentType | null>(null);

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

		fetchDocumentTypes();
	}, [session, status, router]);

	const fetchDocumentTypes = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/agency/document-types");

			if (!response.ok) {
				throw new Error("Failed to fetch document types");
			}

			const data = await response.json();
			setDocumentTypes(data.documentTypes);
		} catch (err: any) {
			setError(err.message || "Failed to load document types");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (documentTypeId: string) => {
		const confirmed = confirm(
			"Are you sure you want to delete this document type? This will not delete existing documents, but you won't be able to create new documents of this type."
		);

		if (!confirmed) return;

		try {
			const response = await fetch(
				`/api/agency/document-types/${documentTypeId}`,
				{
					method: "DELETE",
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete document type");
			}

			// Refresh list
			fetchDocumentTypes();
		} catch (err: any) {
			alert(err.message || "Failed to delete document type");
		}
	};

	const handleEdit = (documentType: DocumentType) => {
		setEditingType(documentType);
		setShowForm(true);
	};

	const handleFormSuccess = () => {
		setShowForm(false);
		setEditingType(null);
		fetchDocumentTypes();
	};

	if (loading || status === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading document types...</p>
				</div>
			</div>
		);
	}

	const globalTypes = documentTypes.filter((type) => type.isGlobal);
	const customTypes = documentTypes.filter((type) => !type.isGlobal);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Document Types</h1>
						<p className="text-gray-600 mt-1">
							Manage document types for your agency's compliance tracking
						</p>
					</div>
					<button
						onClick={() => {
							setEditingType(null);
							setShowForm(true);
						}}
						className="flex items-center gap-2 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] font-medium"
					>
						<Plus className="h-5 w-5" />
						Add Custom Type
					</button>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
						<p className="text-red-700">{error}</p>
					</div>
				)}

				{/* System-Wide Document Types */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<div className="flex items-center gap-2 mb-4">
						<Globe className="h-5 w-5 text-[#0B4F96]" />
						<h2 className="text-xl font-bold text-gray-900">
							System-Wide Document Types
						</h2>
					</div>
					<p className="text-sm text-gray-600 mb-4">
						These document types are available to all agencies and cannot be
						modified.
					</p>

					{globalTypes.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							No system-wide document types available
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{globalTypes.map((type) => (
								<div
									key={type.id}
									className="border border-gray-200 rounded-lg p-4 bg-gray-50"
								>
									<div className="flex items-start justify-between mb-2">
										<h3 className="font-medium text-gray-900">{type.name}</h3>
										{type.isRequired && (
											<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
												Required
											</span>
										)}
									</div>

									{type.description && (
										<p className="text-sm text-gray-600 mb-3">
											{type.description}
										</p>
									)}

									<div className="space-y-2 text-sm">
										{type.expirationDays && (
											<div className="flex items-center gap-2 text-gray-600">
												<Calendar className="h-4 w-4" />
												<span>Expires in {type.expirationDays} days</span>
											</div>
										)}

										{type.reminderDays.length > 0 && (
											<div className="flex items-center gap-2 text-gray-600">
												<Bell className="h-4 w-4" />
												<span>
													Reminders: {type.reminderDays.join(", ")} days before
												</span>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Agency Custom Document Types */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center gap-2 mb-4">
						<Building className="h-5 w-5 text-[#0B4F96]" />
						<h2 className="text-xl font-bold text-gray-900">
							Custom Document Types
						</h2>
					</div>
					<p className="text-sm text-gray-600 mb-4">
						Document types specific to your agency. You can edit or delete these
						as needed.
					</p>

					{customTypes.length === 0 ? (
						<div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
							<FileText className="mx-auto h-12 w-12 text-gray-400" />
							<p className="mt-2 text-sm text-gray-600">
								No custom document types yet
							</p>
							<button
								onClick={() => {
									setEditingType(null);
									setShowForm(true);
								}}
								className="mt-4 text-[#0B4F96] hover:text-[#48ccbc] font-medium"
							>
								Add your first custom document type
							</button>
						</div>
					) : (
						<div className="space-y-4">
							{customTypes.map((type) => (
								<div
									key={type.id}
									className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<h3 className="font-medium text-gray-900 text-lg">
													{type.name}
												</h3>
												{type.isRequired && (
													<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
														Required
													</span>
												)}
												{type._count && type._count.documents > 0 && (
													<span className="text-xs text-gray-500">
														({type._count.documents}{" "}
														{type._count.documents === 1
															? "document"
															: "documents"}
														)
													</span>
												)}
											</div>

											{type.description && (
												<p className="text-sm text-gray-600 mb-3">
													{type.description}
												</p>
											)}

											<div className="flex flex-wrap gap-4 text-sm">
												{type.expirationDays ? (
													<div className="flex items-center gap-2 text-gray-600">
														<Calendar className="h-4 w-4" />
														<span>Expires in {type.expirationDays} days</span>
													</div>
												) : (
													<div className="flex items-center gap-2 text-gray-600">
														<CheckCircle className="h-4 w-4" />
														<span>No expiration</span>
													</div>
												)}

												{type.reminderDays.length > 0 && (
													<div className="flex items-center gap-2 text-gray-600">
														<Bell className="h-4 w-4" />
														<span>
															Reminders: {type.reminderDays.join(", ")} days
														</span>
													</div>
												)}
											</div>
										</div>

										{/* Actions */}
										<div className="flex items-center gap-2 ml-4">
											<button
												onClick={() => handleEdit(type)}
												className="text-gray-600 hover:text-gray-900 p-2"
												title="Edit"
											>
												<Edit className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleDelete(type.id)}
												className="text-red-600 hover:text-red-800 p-2"
												title="Delete"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Document Type Form Modal */}
			{showForm && (
				<DocumentTypeForm
					documentType={editingType || undefined}
					onSuccess={handleFormSuccess}
					onClose={() => {
						setShowForm(false);
						setEditingType(null);
					}}
				/>
			)}
		</div>
	);
}
