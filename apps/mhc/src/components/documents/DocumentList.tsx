"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Trash2, FileText, Calendar, AlertCircle, ClipboardCheck, Eye, X, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
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
	reviewNotes: string | null;
	notes: string | null;
	createdAt: string;
	documentType: {
		id: string;
		name: string;
	};
	parsingJob?: { id: string; status: string } | null;
}

interface GapItem {
	documentTypeId: string;
	documentTypeName: string;
	pendingReview?: boolean;
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
	onParsingComplete?: () => void;
	onRefresh?: () => void;
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
	onParsingComplete,
	onRefresh,
}: DocumentListProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [preview, setPreview] = useState<PreviewState | null>(null);
	const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
	const [pollingJobs, setPollingJobs] = useState<Record<string, string>>({});
	// Tracks completed job IDs across re-renders so the interval doesn't reset on document refresh.
	const completedJobsRef = useRef<Set<string>>(new Set());
	// Stable ref for onParsingComplete so we don't retrigger the effect when the callback identity changes.
	const onParsingCompleteRef = useRef(onParsingComplete);
	useEffect(() => { onParsingCompleteRef.current = onParsingComplete; }, [onParsingComplete]);

	// Poll parsing job status for any PENDING_REVIEW rows that have a parsingJob attached.
	// Single interval polls all pending jobs in one batch request instead of N concurrent intervals.
	// Depends on a stable key (sorted job IDs) rather than the full documents array, so a
	// silentRefresh that updates documents does NOT tear down and recreate the interval.
	const pendingJobIds = documents
		.filter((d) => d.parsingJob?.id && d.reviewStatus === "PENDING_REVIEW")
		.map((d) => d.parsingJob!.id)
		.sort()
		.join(",");

	useEffect(() => {
		if (!pendingJobIds) return;

		const jobIdToDocId = new Map(
			documents
				.filter((d) => d.parsingJob?.id && d.reviewStatus === "PENDING_REVIEW")
				.map((d) => [d.parsingJob!.id, d.id])
		);
		const jobIds = pendingJobIds.split(",");

		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/internal/parsing?ids=${jobIds.join(',')}`);
				if (!res.ok) return;
				const { jobs } = await res.json() as { jobs: Array<{ id: string; status: string }> };
				const updates: Record<string, string> = {};
				let newlyCompleted = false;
				for (const job of jobs) {
					const docId = jobIdToDocId.get(job.id);
					if (!docId) continue;
					updates[docId] = job.status;
					if ((job.status === "COMPLETED" || job.status === "FAILED") && !completedJobsRef.current.has(job.id)) {
						completedJobsRef.current.add(job.id);
						newlyCompleted = true;
					}
				}
				if (Object.keys(updates).length > 0) {
					setPollingJobs((prev) => ({ ...prev, ...updates }));
				}
				// Trigger parent refresh only once when a job first finishes, not on every tick
				if (newlyCompleted) {
					onParsingCompleteRef.current?.();
				}
				// Stop polling once all jobs in this batch are done
				if (jobIds.every((id) => completedJobsRef.current.has(id))) {
					clearInterval(interval);
				}
			} catch {
				// ignore transient errors
			}
		}, 4000);

		return () => clearInterval(interval);
	// pendingJobIds is a stable string derived from job IDs — only changes when the set of pending jobs changes
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pendingJobIds]);

	const handlePreview = async (doc: Document) => {
		setLoadingPreviewId(doc.id);
		try {
			const res = await fetch(`/api/agency/documents/${doc.id}/download`);
			if (!res.ok) throw new Error("Failed to get preview URL");
			const { downloadUrl } = await res.json();

			// Fetch the file bytes and create a blob: URL so the iframe can display it
			// without being blocked by X-Frame-Options (blob: URLs bypass that header).
			const fileRes = await fetch(downloadUrl);
			if (!fileRes.ok) throw new Error("Failed to fetch file for preview");
			const arrayBuf = await fileRes.arrayBuffer();
			// Force the correct MIME type — response may come back as octet-stream
			const blob = new Blob([arrayBuf], { type: doc.mimeType || "application/octet-stream" });
			const blobUrl = URL.createObjectURL(blob);
			setPreview({ url: blobUrl, fileName: doc.fileName, mimeType: doc.mimeType });
		} catch {
			// fall back to download
			onDownload(doc.id);
		} finally {
			setLoadingPreviewId(null);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!onDelete || !deleteConfirmId) return;
		setDeletingId(deleteConfirmId);
		setDeleteConfirmId(null);
		try {
			await onDelete(deleteConfirmId);
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
			{preview && <DocumentPreviewModal preview={preview} onClose={() => {
				URL.revokeObjectURL(preview.url);
				setPreview(null);
			}} />}

			{/* Delete confirmation modal */}
			{deleteConfirmId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
						<div className="flex items-center gap-3 mb-3">
							<div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
								<Trash2 className="h-5 w-5 text-red-600" />
							</div>
							<h3 className="text-base font-semibold text-gray-900">Delete document?</h3>
						</div>
						<p className="text-sm text-gray-500 mb-5">
							This document will be permanently deleted and cannot be recovered.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setDeleteConfirmId(null)}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDeleteConfirm}
								className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Gap banner — missing coverage alert */}
			{gaps && gaps.length > 0 && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-sm font-medium text-red-800 mb-1">
						Missing coverage ({gaps.length} {gaps.length === 1 ? 'type' : 'types'})
					</p>
					<ul className="space-y-1">
						{gaps.map((g) => (
							<li key={g.documentTypeId} className="flex items-center gap-2 text-sm">
								{g.pendingReview ? (
									<>
										<span className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
										<span className="text-amber-700">{g.documentTypeName}</span>
										<span className="text-xs text-amber-600 ml-1">Pending review</span>
									</>
								) : (
									<>
										<span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
										<span className="text-red-700">{g.documentTypeName}</span>
										{onUploadForType && (
											<button
												onClick={() => onUploadForType(g.documentTypeId)}
												className="text-xs text-red-600 underline hover:text-red-800 ml-1"
											>
												Upload now
											</button>
										)}
									</>
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
											{/* Parsing job live status */}
											{doc.reviewStatus === "PENDING_REVIEW" && pollingJobs[doc.id] === "PROCESSING" && (
												<span className="flex items-center gap-1 text-xs text-blue-600">
													<Loader2 className="h-3 w-3 animate-spin" /> Parsing…
												</span>
											)}
											{doc.reviewStatus === "PENDING_REVIEW" && pollingJobs[doc.id] === "PENDING" && (
												<span className="text-xs text-gray-400">In queue…</span>
											)}
											{doc.reviewStatus === "PENDING_REVIEW" && pollingJobs[doc.id] === "FAILED" && (
												<span className="text-xs text-red-500">Parse failed</span>
											)}
											{/* Name mismatch warning */}
											{doc.reviewNotes?.includes("Name on document") && (
												<span
													title={doc.reviewNotes}
													className="flex items-center gap-1 text-xs text-amber-600 cursor-help"
												>
													<AlertTriangle className="h-3 w-3 flex-shrink-0" /> Name mismatch
												</span>
											)}
											{/* Category mismatch warning */}
											{doc.reviewNotes?.includes("Document type mismatch") && (
												<span
													title={doc.reviewNotes}
													className="flex items-center gap-1 text-xs text-red-600 cursor-help"
												>
													<AlertTriangle className="h-3 w-3 flex-shrink-0" /> Wrong doc type
												</span>
											)}
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
											{/* Refresh button for docs that are still being parsed */}
											{doc.reviewStatus === "PENDING_REVIEW" && onRefresh && (
												<button
													onClick={onRefresh}
													title="Refresh parsing status"
													className="text-gray-400 hover:text-[#0B4F96] p-1"
												>
													<RefreshCw className="h-4 w-4" />
												</button>
											)}
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
													onClick={() => setDeleteConfirmId(doc.id)}
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
									{/* Parsing live status — mobile */}
									{doc.reviewStatus === "PENDING_REVIEW" && pollingJobs[doc.id] === "PROCESSING" && (
										<span className="flex items-center gap-1 text-xs text-blue-600">
											<Loader2 className="h-3 w-3 animate-spin" /> Parsing…
										</span>
									)}
									{doc.reviewStatus === "PENDING_REVIEW" && pollingJobs[doc.id] === "PENDING" && (
										<span className="text-xs text-gray-400">In queue…</span>
									)}
									{doc.reviewStatus === "PENDING_REVIEW" && pollingJobs[doc.id] === "FAILED" && (
										<span className="text-xs text-red-500">Parse failed</span>
									)}
									{/* Name mismatch — mobile */}
									{doc.reviewNotes?.includes("Name on document") && (
										<span
											title={doc.reviewNotes}
											className="flex items-center gap-1 text-xs text-amber-600 cursor-help"
										>
											<AlertTriangle className="h-3 w-3" /> Name mismatch
										</span>
									)}
									{/* Category mismatch — mobile */}
									{doc.reviewNotes?.includes("Document type mismatch") && (
										<span
											title={doc.reviewNotes}
											className="flex items-center gap-1 text-xs text-red-600 cursor-help"
										>
											<AlertTriangle className="h-3 w-3" /> Wrong doc type
										</span>
									)}
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
								{/* Refresh button — mobile */}
								{doc.reviewStatus === "PENDING_REVIEW" && onRefresh && (
									<button
										onClick={onRefresh}
										title="Refresh parsing status"
										className="px-3 py-2 border border-gray-300 text-gray-500 rounded-lg hover:border-[#0B4F96] hover:text-[#0B4F96] text-sm"
									>
										<RefreshCw className="h-4 w-4" />
									</button>
								)}
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
										onClick={() => setDeleteConfirmId(doc.id)}
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
