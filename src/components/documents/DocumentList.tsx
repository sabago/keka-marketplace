"use client";

import { useState } from "react";
import { Download, Trash2, FileText, Calendar, AlertCircle } from "lucide-react";
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
	notes: string | null;
	createdAt: string;
	documentType: {
		id: string;
		name: string;
	};
}

interface DocumentListProps {
	documents: Document[];
	onDownload: (documentId: string) => void;
	onDelete?: (documentId: string) => void;
	canDelete?: boolean;
}

export default function DocumentList({
	documents,
	onDownload,
	onDelete,
	canDelete = false,
}: DocumentListProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null);

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
										<DocumentStatusBadge status={doc.status} />
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
								<DocumentStatusBadge status={doc.status} />
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
						</div>
					);
				})}
			</div>
		</div>
	);
}
