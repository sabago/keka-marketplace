"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

interface DocumentTypeFormProps {
	documentType?: {
		id: string;
		name: string;
		description: string | null;
		expirationDays: number | null;
		reminderDays: number[];
		isRequired: boolean;
	};
	onSuccess: () => void;
	onClose: () => void;
}

export default function DocumentTypeForm({
	documentType,
	onSuccess,
	onClose,
}: DocumentTypeFormProps) {
	const [formData, setFormData] = useState({
		name: documentType?.name || "",
		description: documentType?.description || "",
		expirationDays: documentType?.expirationDays?.toString() || "",
		reminderDays: documentType?.reminderDays.join(", ") || "30, 7",
		isRequired: documentType?.isRequired || false,
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isEditing = !!documentType;

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value, type } = e.target;
		const checked = (e.target as HTMLInputElement).checked;

		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validation
		if (!formData.name.trim()) {
			setError("Document type name is required");
			return;
		}

		// Parse reminder days
		let reminderDaysArray: number[] = [];
		if (formData.reminderDays.trim()) {
			try {
				reminderDaysArray = formData.reminderDays
					.split(",")
					.map((day) => parseInt(day.trim()))
					.filter((day) => !isNaN(day) && day > 0);

				if (reminderDaysArray.length === 0) {
					setError(
						"Please provide at least one valid reminder day (e.g., 30, 7)"
					);
					return;
				}
			} catch (err) {
				setError("Invalid reminder days format. Use comma-separated numbers.");
				return;
			}
		}

		setLoading(true);

		try {
			const url = isEditing
				? `/api/agency/document-types/${documentType.id}`
				: "/api/agency/document-types";

			const method = isEditing ? "PUT" : "POST";

			const payload = {
				name: formData.name.trim(),
				description: formData.description.trim() || null,
				expirationDays: formData.expirationDays
					? parseInt(formData.expirationDays)
					: null,
				reminderDays: reminderDaysArray,
				isRequired: formData.isRequired,
			};

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save document type");
			}

			// Success
			onSuccess();
		} catch (err: any) {
			setError(err.message || "Failed to save document type");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-bold text-gray-900">
						{isEditing ? "Edit Document Type" : "Add Custom Document Type"}
					</h2>
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

					{/* Name */}
					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Document Type Name *
						</label>
						<input
							type="text"
							id="name"
							name="name"
							value={formData.name}
							onChange={handleChange}
							required
							placeholder="e.g., Background Check, Drug Screening"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
						/>
					</div>

					{/* Description */}
					<div>
						<label
							htmlFor="description"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Description
						</label>
						<textarea
							id="description"
							name="description"
							value={formData.description}
							onChange={handleChange}
							rows={3}
							placeholder="Optional description of this document type..."
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
						/>
					</div>

					{/* Expiration Days */}
					<div>
						<label
							htmlFor="expirationDays"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Default Expiration Days
						</label>
						<input
							type="number"
							id="expirationDays"
							name="expirationDays"
							value={formData.expirationDays}
							onChange={handleChange}
							min="1"
							placeholder="e.g., 365 (leave empty if no expiration)"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
						/>
						<p className="mt-1 text-xs text-gray-500">
							Number of days until this document type typically expires. Leave
							empty if documents don't expire.
						</p>
					</div>

					{/* Reminder Days */}
					<div>
						<label
							htmlFor="reminderDays"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Reminder Days Before Expiration
						</label>
						<input
							type="text"
							id="reminderDays"
							name="reminderDays"
							value={formData.reminderDays}
							onChange={handleChange}
							placeholder="e.g., 30, 7"
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
						/>
						<p className="mt-1 text-xs text-gray-500">
							Comma-separated list of days before expiration to send reminders
							(e.g., "30, 7" sends reminders at 30 and 7 days before
							expiration)
						</p>
					</div>

					{/* Is Required */}
					<div className="flex items-center gap-3">
						<input
							type="checkbox"
							id="isRequired"
							name="isRequired"
							checked={formData.isRequired}
							onChange={handleChange}
							className="h-4 w-4 text-[#0B4F96] border-gray-300 rounded focus:ring-[#0B4F96]"
						/>
						<label htmlFor="isRequired" className="text-sm text-gray-700">
							Mark as required document for all employees
						</label>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-4">
						<button
							type="submit"
							disabled={loading}
							className="flex-1 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						>
							{loading
								? "Saving..."
								: isEditing
								? "Update Document Type"
								: "Add Document Type"}
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
