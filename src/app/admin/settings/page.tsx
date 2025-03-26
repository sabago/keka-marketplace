"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";

// Import SiteSettings interface from useSettings
import { SiteSettings } from "@/lib/useSettings";

export default function SettingsPage() {
	const [settings, setSettings] = useState<SiteSettings>({
		siteName: "Digital Marketplace",
		siteDescription: "Your one-stop shop for digital products",
		contactEmail: "contact@example.com",
		currency: "USD",
		downloadExpiryDays: 30,
		maxDownloadsPerPurchase: 5,
		allowGuestCheckout: true,
		requireEmailVerification: false,
		enableReviews: true,
		enableRatings: true,
		enableWishlist: false,
		enableNewsletter: false,
		maintenanceMode: false,
		memberDiscountPercentage: 10, // Default 10% discount for members
	});

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Fetch settings from API
	useEffect(() => {
		const fetchSettings = async () => {
			try {
				const response = await fetch("/api/admin/settings");
				if (!response.ok) {
					throw new Error("Failed to fetch settings");
				}
				const data = await response.json();
				setSettings(data);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching settings:", err);
				setError("Failed to load settings. Using defaults.");
				setLoading(false);
			}
		};

		fetchSettings();
	}, []);

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch("/api/admin/settings", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(settings),
			});

			if (!response.ok) {
				throw new Error("Failed to save settings");
			}

			setSuccess("Settings saved successfully!");
			setSaving(false);
		} catch (err) {
			console.error("Error saving settings:", err);
			setError("Failed to save settings. Please try again.");
			setSaving(false);
		}
	};

	// Handle input change
	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>
	) => {
		const { name, value, type } = e.target as HTMLInputElement;

		setSettings({
			...settings,
			[name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
		});
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex items-center mb-8">
				<Link href="/admin" className="mr-4">
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<h1 className="text-3xl font-bold">Settings</h1>
			</div>

			{/* Loading State */}
			{loading && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading settings...</p>
				</div>
			)}

			{/* Settings Form */}
			{!loading && (
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Notification Messages */}
					{error && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							<p>{error}</p>
						</div>
					)}

					{success && (
						<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
							<p>{success}</p>
						</div>
					)}

					{/* Site Information */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-4">Site Information</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label
									htmlFor="siteName"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Site Name
								</label>
								<input
									type="text"
									id="siteName"
									name="siteName"
									value={settings.siteName}
									onChange={handleChange}
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="contactEmail"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Contact Email
								</label>
								<input
									type="email"
									id="contactEmail"
									name="contactEmail"
									value={settings.contactEmail}
									onChange={handleChange}
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									required
								/>
							</div>

							<div className="md:col-span-2">
								<label
									htmlFor="siteDescription"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Site Description
								</label>
								<textarea
									id="siteDescription"
									name="siteDescription"
									value={settings.siteDescription}
									onChange={handleChange}
									rows={3}
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
					</div>

					{/* Store Settings */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-4">Store Settings</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label
									htmlFor="currency"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Currency
								</label>
								<select
									id="currency"
									name="currency"
									value={settings.currency}
									onChange={handleChange}
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="USD">USD - US Dollar</option>
									<option value="EUR">EUR - Euro</option>
									<option value="GBP">GBP - British Pound</option>
									<option value="CAD">CAD - Canadian Dollar</option>
									<option value="AUD">AUD - Australian Dollar</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="downloadExpiryDays"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Download Expiry (Days)
								</label>
								<input
									type="number"
									id="downloadExpiryDays"
									name="downloadExpiryDays"
									value={settings.downloadExpiryDays}
									onChange={handleChange}
									min="1"
									max="365"
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label
									htmlFor="maxDownloadsPerPurchase"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Max Downloads Per Purchase
								</label>
								<input
									type="number"
									id="maxDownloadsPerPurchase"
									name="maxDownloadsPerPurchase"
									value={settings.maxDownloadsPerPurchase}
									onChange={handleChange}
									min="1"
									max="100"
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label
									htmlFor="memberDiscountPercentage"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Member Discount (%)
								</label>
								<input
									type="number"
									id="memberDiscountPercentage"
									name="memberDiscountPercentage"
									value={settings.memberDiscountPercentage}
									onChange={handleChange}
									min="0"
									max="100"
									className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Discount percentage for logged-in WordPress users
								</p>
							</div>
						</div>
					</div>

					{/* Feature Toggles */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-4">Feature Toggles</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex items-center">
								<input
									type="checkbox"
									id="allowGuestCheckout"
									name="allowGuestCheckout"
									checked={settings.allowGuestCheckout}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="allowGuestCheckout"
									className="ml-2 block text-sm text-gray-700"
								>
									Allow Guest Checkout
								</label>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="requireEmailVerification"
									name="requireEmailVerification"
									checked={settings.requireEmailVerification}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="requireEmailVerification"
									className="ml-2 block text-sm text-gray-700"
								>
									Require Email Verification
								</label>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="enableReviews"
									name="enableReviews"
									checked={settings.enableReviews}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="enableReviews"
									className="ml-2 block text-sm text-gray-700"
								>
									Enable Product Reviews
								</label>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="enableRatings"
									name="enableRatings"
									checked={settings.enableRatings}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="enableRatings"
									className="ml-2 block text-sm text-gray-700"
								>
									Enable Product Ratings
								</label>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="enableWishlist"
									name="enableWishlist"
									checked={settings.enableWishlist}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="enableWishlist"
									className="ml-2 block text-sm text-gray-700"
								>
									Enable Wishlist Feature
								</label>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="enableNewsletter"
									name="enableNewsletter"
									checked={settings.enableNewsletter}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="enableNewsletter"
									className="ml-2 block text-sm text-gray-700"
								>
									Enable Newsletter Signup
								</label>
							</div>
						</div>
					</div>

					{/* Maintenance Mode */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold">Maintenance Mode</h2>
								<p className="text-gray-600 text-sm mt-1">
									When enabled, the site will display a maintenance message to visitors.
								</p>
							</div>
							<div className="flex items-center">
								<input
									type="checkbox"
									id="maintenanceMode"
									name="maintenanceMode"
									checked={settings.maintenanceMode}
									onChange={handleChange}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<label
									htmlFor="maintenanceMode"
									className="ml-2 block text-sm text-gray-700"
								>
									Enable Maintenance Mode
								</label>
							</div>
						</div>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
						>
							{saving ? (
								<>
									<RefreshCw className="h-5 w-5 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="h-5 w-5 mr-2" />
									Save Settings
								</>
							)}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
