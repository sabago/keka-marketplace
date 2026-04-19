"use client";

import { useState } from "react";
import { Download, Trash2, FileText, Calendar, AlertCircle, ClipboardCheck, Eye, X } from "lucide-react";
import DocumentStatusBadge from "./DocumentStatusBadge";
import {
	formatExpirationMessage,
	formatFileSize,
	getDaysUntilExpiration,
	getDaysExpired,
} from "@/lib/documentHelpers";

interface Document {
	id: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	issueDate: string | null;
	expirationDate: string | null;
	status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "ARCHIVED";
	reviewStatus: "PENDING_UPLOAD" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_CORRECTION" | null;
	notes: string | null;
	createdAt: string;
	documentType: {
		id: string;
		name: string;
	};
}

interface GapItem {
	documentTypeId: string;
	documentTypeName: string;
}

interface DocumentListProps {
	documents: Document[];
	onDownload: (documentId: string) => void;
	onDelete?: (documentId: string) => void;
	canDelete?: boolean;
	onReview?: (documentId: string) => void;
	credentialHistory?: Record<string, Document[]>;
	gaps?: GapItem[];
	onUploadForType?: (documentTypeId: string) => void;
}

interface PreviewState {
	url: string;
	fileName: string;
	mimeType: string;
}

function DocumentPreviewModal({ preview, onClose }: { preview: PreviewState; onClose: () => void }) {
	const isImage = preview.mimeType.startsWith("image/");
	const isPdf = preview.mimeType === "application/pdf";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
			<div
				className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
					<p className="text-sm font-medium text-gray-900 truncate max-w-[80%]">{preview.fileName}</p>
					<div className="flex items-center gap-2">
						<a
							href={preview.url}
							download={preview.fileName}
							className="flex items-center gap-1 text-xs text-[#0B4F96] hover:text-[#48ccbc] px-2 py-1 border border-[#0B4F96] rounded"
						>
							<Download className="h-3 w-3" />
							Download
						</a>
						<button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-gray-50 min-h-0">
					{isImage && (
						<img
							src={preview.url}
							alt={preview.fileName}
							className="max-w-full max-h-full object-contain"
						/>
					)}
					{isPdf && (
						<iframe
							src={preview.url}
							title={preview.fileName}
							className="w-full h-full min-h-[60vh] border-0"
						/>
					)}
					{!isImage && !isPdf && (
						<div className="text-center py-12 text-gray-500">
							<FileText className="h-16 w-16 mx-auto mb-3 text-gray-300" />
							<p className="text-sm">Preview not available for this file type.</p>
							<a
								href={preview.url}
								download={preview.fileName}
								className="mt-3 inline-flex items-center gap-1 text-sm text-[#0B4F96] hover:underline"
							>
								<Download className="h-4 w-4" />
								Download to view
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function ReviewStatusBadge({ status }: { status: Document["reviewStatus"] }) {
	if (!status || status === "PENDING_UPLOAD") return null;
	const map: Record<string, { bg: string; text: string; label: string }> = {
		PENDING_REVIEW:   { bg: "bg-blue-100",   text: "text-blue-800",   label: "Pending Review" },
		APPROVED:         { bg: "bg-green-100",  text: "text-green-800",  label: "Approved" },
		REJECTED:         { bg: "bg-red-100",    text: "text-red-800",    label: "Rejected" },
		NEEDS_CORRECTION: { bg: "bg-orange-100", text: "text-orange-800", label: "Needs Correction" },
	};
	const s = map[status];
	if (!s) return null;
	return (
		<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
			{s.label}
		</span>
	);
}

export default function DocumentList({
	documents,
	onDownload,
	onDelete,
	canDelete = false,
	onReview,
	credentialHistory,
	gaps,
	onUploadForType,
}: DocumentListProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [preview, setPreview] = useState<PreviewState | null>(null);
	const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

	const handlePreview = async (doc: Document) => {
		setLoadingPreviewId(doc.id);
		try {
			const res = await fetch(`/api/agency/documents/${doc.id}/download`);
			if (!res.ok) throw new Error("Failed to get preview URL");
			const { downloadUrl } = await res.json();
			setPreview({ url: downloadUrl, fileName: doc.fileName, mimeType: doc.mimeType });
		} catch {
			// fall back to download
			onDownload(doc.id);
		} finally {
			setLoadingPreviewId(null);
		}
	};

	const handleDelete = async (documentId: string) => {
		if (!onDelete) return;

		const confirmed = confirm(
			"Are you sure you want to delete this document? This action cannot be undone."
		);

		if (!confirmed) return;

		setDeletingId(documentId);
		try {
			await onDelete(documentId);
		} finally {
			setDeletingId(null);
		}
	};

	if (documents.length === 0) {
		return (
			<div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
				<FileText className="mx-auto h-12 w-12 text-gray-400" />
				<p className="mt-2 text-sm text-gray-600">No documents uploaded yet</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{preview && <DocumentPreviewModal preview={preview} onClose={() => setPreview(null)} />}

			{/* Gap banner — missing coverage alert */}
			{gaps && gaps.length > 0 && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-sm font-medium text-red-800 mb-1">
						Missing coverage ({gaps.length} {gaps.length === 1 ? 'type' : 'types'})
					</p>
					<ul className="space-y-1">
						{gaps.map((g) => (
							<li key={g.documentTypeId} className="flex items-center gap-2 text-sm text-red-700">
								<span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
								{g.documentTypeName}
								{onUploadForType && (
									<button
										onClick={() => onUploadForType(g.documentTypeId)}
										className="text-xs text-red-600 underline hover:text-red-800 ml-1"
									>
										Upload now
									</button>
								)}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Desktop Table View */}
			<div className="hidden md:block overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Document
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Issue Date
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Expiration
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{documents.map((doc) => {
							const expirationDate = doc.expirationDate
								? new Date(doc.expirationDate)
								: null;
							const daysUntil = getDaysUntilExpiration(expirationDate);
							const daysExpired = getDaysExpired(expirationDate);

							return (
								<>
								<tr key={doc.id} className="hover:bg-gray-50">
									<td className="px-6 py-4">
										<div className="flex items-start gap-3">
											<FileText className="h-5 w-5 text-[#0B4F96] flex-shrink-0 mt-0.5" />
											<div>
												<p className="text-sm font-medium text-gray-900">
													{doc.documentType.name}
												</p>
												<p className="text-xs text-gray-500">{doc.fileName}</p>
												<p className="text-xs text-gray-400">
													{formatFileSize(doc.fileSize)}
												</p>
											</div>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{doc.issueDate ? (
											<div className="flex items-center gap-1 text-sm text-gray-600">
												<Calendar className="h-4 w-4" />
												{new Date(doc.issueDate).toLocaleDateString()}
											</div>
										) : (
											<span className="text-sm text-gray-400">N/A</span>
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{expirationDate ? (
											<div>
												<p className="text-sm text-gray-900">
													{expirationDate.toLocaleDateString()}
												</p>
												<p className="text-xs text-gray-500">
													{formatExpirationMessage(expirationDate)}
												</p>
											</div>
										) : (
											<span className="text-sm text-gray-400">
												No expiration
											</span>
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="flex flex-col gap-1">
											{/* Only show the expiry status badge once the credential
											    is approved — before that, review status is all that matters */}
											{doc.reviewStatus === "APPROVED" && (
												<DocumentStatusBadge status={doc.status} />
											)}
											<ReviewStatusBadge status={doc.reviewStatus} />
										</div>
										{daysExpired && (
											<p className="text-xs text-red-600 mt-1">
												{daysExpired} days overdue
											</p>
										)}
										{daysUntil !== null && daysUntil >= 0 && daysUntil <= 30 && (
											<p className="text-xs text-yellow-600 mt-1">
												{daysUntil} days remaining
											</p>
										)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div className="flex items-center justify-end gap-2">
											{onReview && (
												<button
													onClick={() => onReview(doc.id)}
													className="flex items-center gap-1 text-[#0B4F96] hover:text-[#48ccbc] px-2 py-1 text-xs border border-[#0B4F96] rounded"
													title="Review credential"
												>
													<ClipboardCheck className="h-3 w-3" />
													Review
												</button>
											)}
											<button
												onClick={() => handlePreview(doc)}
												disabled={loadingPreviewId === doc.id}
												className="text-[#0B4F96] hover:text-[#48ccbc] p-1 disabled:opacity-50"
												title="View"
											>
												<Eye className="h-4 w-4" />
											</button>
											<button
												onClick={() => onDownload(doc.id)}
												className="text-[#0B4F96] hover:text-[#48ccbc] p-1"
												title="Download"
											>
												<Download className="h-4 w-4" />
											</button>
											{canDelete && onDelete && (
												<button
													onClick={() => handleDelete(doc.id)}
													disabled={deletingId === doc.id}
													className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
								{/* History toggle — shows archived previous credentials for this type */}
								{credentialHistory?.[doc.documentType.id]?.length ? (
									<tr>
										<td colSpan={5} className="px-6 pb-3 pt-0 bg-white">
											<details className="text-xs">
												<summary className="cursor-pointer text-gray-400 hover:text-gray-600 select-none list-none flex items-center gap-1">
													<span className="text-gray-300">▸</span>
													Show history ({credentialHistory[doc.documentType.id].length} previous)
												</summary>
												<table className="mt-2 w-full">
													<tbody className="divide-y divide-gray-100">
														{credentialHistory[doc.documentType.id].map((h) => (
															<tr key={h.id} className="text-gray-400">
																<td className="py-1 pr-4 text-xs truncate max-w-[200px]">{h.fileName}</td>
																<td className="py-1 pr-4 text-xs whitespace-nowrap">
																	{h.issueDate ? new Date(h.issueDate).toLocaleDateString() : '—'}
																</td>
																<td className="py-1 pr-4 text-xs whitespace-nowrap">
																	{h.expirationDate ? new Date(h.expirationDate).toLocaleDateString() : 'No expiry'}
																</td>
																<td className="py-1 text-xs">
																	<span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Archived</span>
																</td>
																<td className="py-1 text-right">
																	<button
																		onClick={() => onDownload(h.id)}
																		className="text-gray-400 hover:text-[#0B4F96] p-1"
																		title="Download"
																	>
																		<Download className="h-3 w-3" />
																	</button>
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</details>
										</td>
									</tr>
								) : null}
								</>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Mobile Card View */}
			<div className="md:hidden space-y-3">
				{documents.map((doc) => {
					const expirationDate = doc.expirationDate
						? new Date(doc.expirationDate)
						: null;

					return (
						<div
							key={doc.id}
							className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
						>
							{/* Header */}
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-start gap-2 flex-1 min-w-0">
									<FileText className="h-5 w-5 text-[#0B4F96] flex-shrink-0 mt-0.5" />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-gray-900 truncate">
											{doc.documentType.name}
										</p>
										<p className="text-xs text-gray-500 truncate">{doc.fileName}</p>
									</div>
								</div>
								<div className="flex flex-col gap-1 items-end">
									{doc.reviewStatus === "APPROVED" && (
										<DocumentStatusBadge status={doc.status} />
									)}
									<ReviewStatusBadge status={doc.reviewStatus} />
								</div>
							</div>

							{/* Details */}
							<div className="space-y-2 text-sm">
								{doc.issueDate && (
									<div className="flex items-center gap-2 text-gray-600">
										<span className="font-medium">Issue:</span>
										{new Date(doc.issueDate).toLocaleDateString()}
									</div>
								)}
								{expirationDate && (
									<div className="flex items-center gap-2 text-gray-600">
										<span className="font-medium">Expires:</span>
										{expirationDate.toLocaleDateString()}
										<span className="text-xs">
											({formatExpirationMessage(expirationDate)})
										</span>
									</div>
								)}
								<p className="text-xs text-gray-500">
									{formatFileSize(doc.fileSize)}
								</p>
							</div>

							{/* Actions */}
							<div className="flex gap-2 pt-2 border-t border-gray-200">
								{onReview && (
									<button
										onClick={() => onReview(doc.id)}
										className="flex items-center justify-center gap-1 px-3 py-2 border border-[#0B4F96] text-[#0B4F96] rounded-lg hover:bg-blue-50 text-sm"
									>
										<ClipboardCheck className="h-4 w-4" />
										Review
									</button>
								)}
								<button
									onClick={() => handlePreview(doc)}
									disabled={loadingPreviewId === doc.id}
									className="flex items-center justify-center gap-1 px-3 py-2 border border-[#0B4F96] text-[#0B4F96] rounded-lg hover:bg-blue-50 text-sm disabled:opacity-50"
								>
									<Eye className="h-4 w-4" />
									View
								</button>
								<button
									onClick={() => onDownload(doc.id)}
									className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#0a4280] text-sm"
								>
									<Download className="h-4 w-4" />
									Download
								</button>
								{canDelete && onDelete && (
									<button
										onClick={() => handleDelete(doc.id)}
										disabled={deletingId === doc.id}
										className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								)}
							</div>

							{/* History toggle — mobile */}
							{credentialHistory?.[doc.documentType.id]?.length ? (
								<details className="text-xs border-t border-gray-100 pt-2">
									<summary className="cursor-pointer text-gray-400 hover:text-gray-600 select-none list-none">
										Show history ({credentialHistory[doc.documentType.id].length} previous)
									</summary>
									<div className="mt-2 space-y-1">
										{credentialHistory[doc.documentType.id].map((h) => (
											<div key={h.id} className="flex items-center justify-between text-gray-400 py-0.5">
												<span className="truncate max-w-[60%]">{h.fileName}</span>
												<span className="whitespace-nowrap">
													{h.expirationDate ? new Date(h.expirationDate).toLocaleDateString() : 'No expiry'}
												</span>
												<button
													onClick={() => onDownload(h.id)}
													className="text-gray-400 hover:text-[#0B4F96] p-1"
												>
													<Download className="h-3 w-3" />
												</button>
											</div>
										))}
									</div>
								</details>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}
