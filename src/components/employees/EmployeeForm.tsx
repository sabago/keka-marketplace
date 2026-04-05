"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { EmployeeStatus } from "@prisma/client";

interface EmployeeFormProps {
	employee?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string | null;
		phone: string | null;
		employeeNumber: string | null;
		hireDate: string | null;
		department: string | null;
		position: string | null;
		status: EmployeeStatus;
	};
	onSuccess: () => void;
	onClose: () => void;
}

export default function EmployeeForm({
	employee,
	onSuccess,
	onClose,
}: EmployeeFormProps) {
	const [formData, setFormData] = useState({
		firstName: employee?.firstName || "",
		lastName: employee?.lastName || "",
		email: employee?.email || "",
		phone: employee?.phone || "",
		employeeNumber: employee?.employeeNumber || "",
		hireDate: employee?.hireDate || "",
		department: employee?.department || "",
		position: employee?.position || "",
		status: employee?.status || "ACTIVE",
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isEditing = !!employee;

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Validation
		if (!formData.firstName.trim() || !formData.lastName.trim()) {
			setError("First name and last name are required");
			return;
		}

		setLoading(true);

		try {
			const url = isEditing
				? `/api/agency/employees/${employee.id}`
				: "/api/agency/employees";

			const method = isEditing ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to save employee");
			}

			// Success
			onSuccess();
		} catch (err: any) {
			setError(err.message || "Failed to save employee");
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
						{isEditing ? "Edit Employee" : "Add New Employee"}
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

					{/* Basic Information */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="firstName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								First Name *
							</label>
							<input
								type="text"
								id="firstName"
								name="firstName"
								value={formData.firstName}
								onChange={handleChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>

						<div>
							<label
								htmlFor="lastName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Last Name *
							</label>
							<input
								type="text"
								id="lastName"
								name="lastName"
								value={formData.lastName}
								onChange={handleChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
					</div>

					{/* Contact Information */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Email
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>

						<div>
							<label
								htmlFor="phone"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Phone
							</label>
							<input
								type="tel"
								id="phone"
								name="phone"
								value={formData.phone}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
					</div>

					{/* Employment Details */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="employeeNumber"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Employee Number
							</label>
							<input
								type="text"
								id="employeeNumber"
								name="employeeNumber"
								value={formData.employeeNumber}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>

						<div>
							<label
								htmlFor="hireDate"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Hire Date
							</label>
							<input
								type="date"
								id="hireDate"
								name="hireDate"
								value={formData.hireDate}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="position"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Position
							</label>
							<input
								type="text"
								id="position"
								name="position"
								value={formData.position}
								onChange={handleChange}
								placeholder="e.g., HHA, RN, Coordinator"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>

						<div>
							<label
								htmlFor="department"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Department
							</label>
							<input
								type="text"
								id="department"
								name="department"
								value={formData.department}
								onChange={handleChange}
								placeholder="e.g., Care Services, Administration"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							/>
						</div>
					</div>

					{/* Status (only show when editing) */}
					{isEditing && (
						<div>
							<label
								htmlFor="status"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Status
							</label>
							<select
								id="status"
								name="status"
								value={formData.status}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
							>
								<option value="ACTIVE">Active</option>
								<option value="INACTIVE">Inactive</option>
								<option value="ON_LEAVE">On Leave</option>
								<option value="TERMINATED">Terminated</option>
							</select>
						</div>
					)}

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
								? "Update Employee"
								: "Add Employee"}
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
