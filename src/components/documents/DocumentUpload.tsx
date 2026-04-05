"use client";

import { useState } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { validateFileUpload, formatFileSize } from "@/lib/documentHelpers";

interface DocumentUploadProps {
	employeeId: string;
	documentTypes: Array<{
		id: string;
		name: string;
		description?: string | null;
		expirationDays?: number | null;
	}>;
	onSuccess: () => void;
	onClose: () => void;
}

export default function DocumentUpload({
	employeeId,
	documentTypes,
	onSuccess,
	onClose,
}: DocumentUploadProps) {
	const [file, setFile] = useState<File | null>(null);
	const [documentTypeId, setDocumentTypeId] = useState("");
	const [issueDate, setIssueDate] = useState("");
	const [expirationDate, setExpirationDate] = useState("");
	const [notes, setNotes] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dragActive, setDragActive] = useState(false);

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleFileSelect(e.dataTransfer.files[0]);
		}
	};

	const handleFileSelect = (selectedFile: File) => {
		const validation = validateFileUpload(selectedFile, 10);
		if (!validation.valid) {
			setError(validation.error || "Invalid file");
			return;
		}

		setFile(selectedFile);
		setError(null);
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			handleFileSelect(e.target.files[0]);
		}
	};

	const removeFile = () => {
		setFile(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validation
		if (!file) {
			setError("Please select a file");
			return;
		}

		if (!documentTypeId) {
			setError("Please select a document type");
			return;
		}

		if (issueDate && expirationDate) {
			const issue = new Date(issueDate);
			const expiration = new Date(expirationDate);
			if (issue >= expiration) {
				setError("Issue date must be before expiration date");
				return;
			}
		}

		setLoading(true);

		try {
			// Create form data
			const formData = new FormData();
			formData.append("file", file);
			formData.append("employeeId", employeeId);
			formData.append("documentTypeId", documentTypeId);
			if (issueDate) formData.append("issueDate", issueDate);
			if (expirationDate) formData.append("expirationDate", expirationDate);
			if (notes) formData.append("notes", notes);

			// Upload document
			const response = await fetch("/api/agency/documents/upload", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to upload document");
			}

			// Success
			onSuccess();
		} catch (err: any) {
			setError(err.message || "Failed to upload document");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
						disabled={loading}
					>
						<X className="h-6 w-6" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Error Message */}
					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
							<p className="text-sm text-red-700">{error}</p>
						</div>
					)}

					{/* File Upload Area */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Document File *
						</label>
						{!file ? (
							<div
								className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
									dragActive
										? "border-[#48ccbc] bg-blue-50"
										: "border-gray-300 hover:border-gray-400"
								}`}
								onDragEnter={handleDrag}
								onDragLeave={handleDrag}
								onDragOver={handleDrag}
								onDrop={handleDrop}
							>
								<Upload className="mx-auto h-12 w-12 text-gray-400" />
								<p className="mt-2 text-sm text-gray-600">
									Drag and drop your file here, or click to browse
								</p>
								<p className="mt-1 text-xs text-gray-500">
									PDF, JPEG, PNG up to 10 MB
								</p>
								<input
									type="file"
									onChange={handleFileInputChange}
									accept=".pdf,.jpg,.jpeg,.png"
									className="hidden"
									id="file-upload"
								/>
								<label
									htmlFor="file-upload"
									className="mt-4 inline-block px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] cursor-pointer"
								>
									Choose File
								</label>
							</div>
						) : (
							<div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<FileText className="h-8 w-8 text-[#0B4F96]" />
									<div>
										<p className="text-sm font-medium text-gray-900">{file.name}</p>
										<p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
									</div>
								</div>
								<button
									type="button"
									onClick={removeFile}
									className="text-red-500 hover:text-red-700"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
						)}
					</div>

					{/* Document Type */}
					<div>
						<label
							htmlFor="documentTypeId"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Document Type *
						</label>
						<select
							id="documentTypeId"
							value={documentTypeId}
							onChange={(e) => setDocumentTypeId(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							required
						>
							<option value="">Select document type...</option>
							{documentTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>
					</div>

					{/* Issue Date */}
					<div>
						<label
							htmlFor="issueDate"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Issue Date
						</label>
						<input
							type="date"
							id="issueDate"
							value={issueDate}
							onChange={(e) => setIssueDate(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
						/>
					</div>

					{/* Expiration Date */}
					<div>
						<label
							htmlFor="expirationDate"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Expiration Date
						</label>
						<input
							type="date"
							id="expirationDate"
							value={expirationDate}
							onChange={(e) => setExpirationDate(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
						/>
					</div>

					{/* Notes */}
					<div>
						<label
							htmlFor="notes"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Notes
						</label>
						<textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							placeholder="Additional notes or comments..."
						/>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-4">
						<button
							type="submit"
							disabled={loading || !file}
							className="flex-1 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						>
							{loading ? "Uploading..." : "Upload Document"}
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={loading}
							className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
