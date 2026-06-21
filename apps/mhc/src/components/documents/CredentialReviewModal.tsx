"use client";

import { useState, useEffect } from "react";
import {
	X,
	ExternalLink,
	CheckCircle,
	XCircle,
	AlertTriangle,
	Edit,
	Loader2,
	AlertCircle,
	Bot,
} from "lucide-react";

interface CredentialReviewModalProps {
	documentId: string;
	onClose: () => void;
	onSuccess: () => void;
}

type ReviewAction = "approve" | "reject" | "needs_correction" | "edit";

export default function CredentialReviewModal({
	documentId,
	onClose,
	onSuccess,
}: CredentialReviewModalProps) {
	const [credential, setCredential] = useState<any>(null);
	const [parsingJob, setParsingJob] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState("");
	const [action, setAction] = useState<ReviewAction | null>(null);
	const [notes, setNotes] = useState("");
	const [corrections, setCorrections] = useState({
		issuer: "",
		licenseNumber: "",
		issueDate: "",
		expirationDate: "",
		verificationUrl: "",
	});
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");

	useEffect(() => {
		async function fetchCredential() {
			try {
				const res = await fetch(`/api/admin/credentials/${documentId}/review`);
				const data = await res.json();
				if (!res.ok) {
					setFetchError(data.error || "Failed to load credential");
					return;
				}
				setCredential(data.credential);
				setParsingJob(data.parsingJob);
				// Pre-populate edit fields from existing credential values
				setCorrections({
					issuer: data.credential.issuer || "",
					licenseNumber: data.credential.licenseNumber || "",
					issueDate: data.credential.issueDate
						? new Date(data.credential.issueDate).toISOString().split("T")[0]
						: "",
					expirationDate: data.credential.expirationDate
						? new Date(data.credential.expirationDate).toISOString().split("T")[0]
						: "",
					verificationUrl: data.credential.verificationUrl || "",
				});
			} catch {
				setFetchError("Failed to load credential details");
			} finally {
				setLoading(false);
			}
		}
		fetchCredential();
	}, [documentId]);

	const handleSubmit = async () => {
		if (!action) return;
		setSubmitError("");

		// Validate required fields
		if ((action === "reject" || action === "needs_correction") && !notes.trim()) {
			setSubmitError(
				action === "reject"
					? "A reason for rejection is required."
					: "Please describe what needs to be corrected."
			);
			return;
		}
		if (action === "edit") {
			const hasAnyCorrection = Object.values(corrections).some((v) => v.trim());
			if (!hasAnyCorrection) {
				setSubmitError("Please provide at least one corrected field.");
				return;
			}
		}

		setSubmitting(true);
		try {
			const body: any = { action };
			if (notes.trim()) body.notes = notes.trim();
			if (action === "edit") {
				const filteredCorrections: any = {};
				if (corrections.issuer.trim()) filteredCorrections.issuer = corrections.issuer.trim();
				if (corrections.licenseNumber.trim()) filteredCorrections.licenseNumber = corrections.licenseNumber.trim();
				if (corrections.issueDate) filteredCorrections.issueDate = corrections.issueDate;
				if (corrections.expirationDate) filteredCorrections.expirationDate = corrections.expirationDate;
				if (corrections.verificationUrl.trim()) filteredCorrections.verificationUrl = corrections.verificationUrl.trim();
				body.corrections = filteredCorrections;
			}

			const res = await fetch(`/api/admin/credentials/${documentId}/review`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (!res.ok) {
				setSubmitError(data.error || "Failed to submit review");
				return;
			}
			onSuccess();
		} catch {
			setSubmitError("An unexpected error occurred. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const confidenceColor = (confidence: number) => {
		if (confidence >= 0.7) return "bg-green-500";
		if (confidence >= 0.5) return "bg-yellow-400";
		return "bg-red-500";
	};

	const confidenceLabel = (confidence: number) => {
		if (confidence >= 0.7) return "text-green-700";
		if (confidence >= 0.5) return "text-yellow-700";
		return "text-red-700";
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-bold text-gray-900">Review Credential</h2>
					<button
						onClick={onClose}
						disabled={submitting}
						className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
					>
						<X className="h-6 w-6" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-6">
					{loading && (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin" />
						</div>
					)}

					{fetchError && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
							<p className="text-sm text-red-700">{fetchError}</p>
						</div>
					)}

					{!loading && !fetchError && credential && (
						<>
							{/* Credential Details */}
							<div>
								<h3 className="text-lg font-semibold text-gray-900 mb-1">
									{credential.documentType?.name || "Credential"}
								</h3>
								<p className="text-sm text-gray-500">
									Employee:{" "}
									<span className="font-medium text-gray-700">
										{credential.staffMember?.firstName} {credential.staffMember?.lastName}
									</span>
								</p>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Issuer</p>
									<p className="text-gray-900">{credential.issuer || <span className="text-gray-400">Not found</span>}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">License / Certificate #</p>
									<p className="text-gray-900">{credential.licenseNumber || <span className="text-gray-400">Not found</span>}</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Issue Date</p>
									<p className="text-gray-900">
										{credential.issueDate
											? new Date(credential.issueDate).toLocaleDateString()
											: <span className="text-gray-400">Not found</span>}
									</p>
								</div>
								<div>
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Expiration Date</p>
									<p className={credential.expirationDate ? "text-gray-900" : "text-red-500 font-medium"}>
										{credential.expirationDate
											? new Date(credential.expirationDate).toLocaleDateString()
											: "Not found"}
									</p>
								</div>
								{credential.verificationUrl && (
									<div className="sm:col-span-2">
										<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Verification URL</p>
										<a
											href={credential.verificationUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#0B4F96] hover:text-[#48ccbc] flex items-center gap-1 truncate"
										>
											{credential.verificationUrl}
											<ExternalLink className="h-3 w-3 flex-shrink-0" />
										</a>
									</div>
								)}
							</div>

							{/* File Download */}
							<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
								<a
									href={credential.downloadUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2 text-[#0B4F96] hover:text-[#48ccbc] text-sm font-medium"
								>
									<ExternalLink className="h-4 w-4" />
									View original document — {credential.fileName}
								</a>
							</div>

							{/* AI Confidence Panel */}
							{parsingJob && parsingJob.status === "COMPLETED" && (
								<div className="border border-gray-200 rounded-lg p-4 space-y-3">
									<div className="flex items-center gap-2">
										<Bot className="h-4 w-4 text-gray-500" />
										<span className="text-sm font-medium text-gray-700">AI Analysis</span>
									</div>

									{credential.aiConfidence !== null && credential.aiConfidence !== undefined && (
										<div className="space-y-1">
											<div className="flex items-center justify-between">
												<span className="text-xs text-gray-500">Confidence</span>
												<span className={`text-xs font-semibold ${confidenceLabel(credential.aiConfidence)}`}>
													{Math.round(credential.aiConfidence * 100)}%
												</span>
											</div>
											<div className="w-full bg-gray-200 rounded-full h-2">
												<div
													className={`h-2 rounded-full transition-all ${confidenceColor(credential.aiConfidence)}`}
													style={{ width: `${Math.round(credential.aiConfidence * 100)}%` }}
												/>
											</div>
										</div>
									)}

									{credential.reviewNotes && (
										<div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded p-2">
											<AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
											<p className="text-xs text-yellow-800">
												<span className="font-semibold">Flagged: </span>
												{credential.reviewNotes}
											</p>
										</div>
									)}
								</div>
							)}

							{parsingJob && parsingJob.status === "FAILED" && (
								<div className="border border-red-200 rounded-lg p-4 flex items-start gap-2 bg-red-50">
									<Bot className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
									<p className="text-xs text-red-700">
										<span className="font-semibold">AI parsing failed.</span> Manual review required — please inspect the original document.
									</p>
								</div>
							)}

							{/* Action Selector */}
							<div>
								<p className="text-sm font-medium text-gray-700 mb-3">Select action:</p>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
									<button
										onClick={() => setAction("approve")}
										className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
											action === "approve"
												? "border-green-500 bg-green-50 text-green-700"
												: "border-gray-200 hover:border-green-300 text-gray-600"
										}`}
									>
										<CheckCircle className="h-5 w-5" />
										Approve
									</button>
									<button
										onClick={() => setAction("reject")}
										className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
											action === "reject"
												? "border-red-500 bg-red-50 text-red-700"
												: "border-gray-200 hover:border-red-300 text-gray-600"
										}`}
									>
										<XCircle className="h-5 w-5" />
										Reject
									</button>
									<button
										onClick={() => setAction("needs_correction")}
										className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
											action === "needs_correction"
												? "border-orange-500 bg-orange-50 text-orange-700"
												: "border-gray-200 hover:border-orange-300 text-gray-600"
										}`}
									>
										<AlertTriangle className="h-5 w-5" />
										Correction
									</button>
									<button
										onClick={() => setAction("edit")}
										className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
											action === "edit"
												? "border-[#0B4F96] bg-blue-50 text-[#0B4F96]"
												: "border-gray-200 hover:border-blue-300 text-gray-600"
										}`}
									>
										<Edit className="h-5 w-5" />
										Edit & Approve
									</button>
								</div>
							</div>

							{/* Conditional Form Area */}
							{action === "approve" && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Notes <span className="text-gray-400">(optional)</span>
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={3}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
										placeholder="Add any approval notes..."
									/>
								</div>
							)}

							{action === "reject" && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Reason for rejection <span className="text-red-500">*</span>
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={3}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
										placeholder="Explain why this credential is being rejected..."
									/>
								</div>
							)}

							{action === "needs_correction" && (
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										What needs to be corrected <span className="text-red-500">*</span>
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={3}
										className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
										placeholder="Describe what information is incorrect or missing..."
									/>
								</div>
							)}

							{action === "edit" && (
								<div className="space-y-4">
									<p className="text-sm text-gray-600">
										Correct any fields below, then approve. Leave unchanged fields as-is.
									</p>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<label className="block text-xs font-medium text-gray-700 mb-1">Issuer</label>
											<input
												type="text"
												value={corrections.issuer}
												onChange={(e) => setCorrections({ ...corrections, issuer: e.target.value })}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-700 mb-1">License / Certificate #</label>
											<input
												type="text"
												value={corrections.licenseNumber}
												onChange={(e) => setCorrections({ ...corrections, licenseNumber: e.target.value })}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
											<input
												type="date"
												value={corrections.issueDate}
												onChange={(e) => setCorrections({ ...corrections, issueDate: e.target.value })}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
											/>
										</div>
										<div>
											<label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date</label>
											<input
												type="date"
												value={corrections.expirationDate}
												onChange={(e) => setCorrections({ ...corrections, expirationDate: e.target.value })}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
											/>
										</div>
										<div className="sm:col-span-2">
											<label className="block text-xs font-medium text-gray-700 mb-1">Verification URL</label>
											<input
												type="url"
												value={corrections.verificationUrl}
												onChange={(e) => setCorrections({ ...corrections, verificationUrl: e.target.value })}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
												placeholder="https://"
											/>
										</div>
									</div>
									<div>
										<label className="block text-xs font-medium text-gray-700 mb-1">
											Notes <span className="text-gray-400">(optional)</span>
										</label>
										<textarea
											value={notes}
											onChange={(e) => setNotes(e.target.value)}
											rows={2}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
											placeholder="Additional notes about the corrections..."
										/>
									</div>
								</div>
							)}

							{/* Submit Error */}
							{submitError && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
									<AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
									<p className="text-sm text-red-700">{submitError}</p>
								</div>
							)}
						</>
					)}
				</div>

				{/* Footer */}
				{!loading && !fetchError && credential && (
					<div className="flex gap-3 px-6 pb-6">
						<button
							onClick={handleSubmit}
							disabled={!action || submitting}
							className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
								action === "reject"
									? "bg-red-600 hover:bg-red-700 text-white"
									: action === "needs_correction"
									? "bg-orange-500 hover:bg-orange-600 text-white"
									: "bg-[#0B4F96] hover:bg-[#0a4280] text-white"
							}`}
						>
							{submitting && <Loader2 className="h-4 w-4 animate-spin" />}
							{!submitting && (
								<>
									{action === "approve" && "Approve Credential"}
									{action === "reject" && "Reject Credential"}
									{action === "needs_correction" && "Request Correction"}
									{action === "edit" && "Save & Approve"}
									{!action && "Select an action"}
								</>
							)}
							{submitting && "Submitting..."}
						</button>
						<button
							onClick={onClose}
							disabled={submitting}
							className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
						>
							Cancel
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
