"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	ArrowLeft,
	DollarSign,
	Download,
	ShoppingBag,
	Users,
} from "lucide-react";
import { useSettings, formatCurrency } from "@/lib/useSettings";

// Define analytics types
interface DailySales {
	date: string;
	orders: number;
	revenue: number;
}

interface TopProduct {
	id: string;
	title: string;
	sales: number;
	revenue: number;
}

interface AnalyticsData {
	totalOrders: number;
	totalRevenue: number;
	totalCustomers: number;
	totalDownloads: number;
	averageOrderValue: number;
	conversionRate: number;
	dailySales: DailySales[];
	topProducts: TopProduct[];
}

export default function AnalyticsPage() {
	const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [timeframe, setTimeframe] = useState("30days");
	const { settings } = useSettings();

	// Fetch analytics from API
	useEffect(() => {
		const fetchAnalytics = async () => {
			try {
				const response = await fetch(`/api/admin/analytics?timeframe=${timeframe}`);
				if (!response.ok) {
					throw new Error("Failed to fetch analytics");
				}
				const data = await response.json();
				setAnalytics(data);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching analytics:", err);
				setError("Failed to load analytics. Please try again later.");
				setLoading(false);
			}
		};

		fetchAnalytics();
	}, [timeframe]);

	// Format price using the helper function
	const formatPrice = (price: number) => {
		return formatCurrency(price, settings.currency);
	};

	// Format percentage
	const formatPercentage = (value: number) => {
		return `${(value * 100).toFixed(2)}%`;
	};

	// Format date function removed as it's no longer needed

	// Chart functions removed as the chart is no longer needed

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex items-center mb-8">
				<Link href="/admin" className="mr-4">
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<h1 className="text-3xl font-bold">Analytics</h1>
			</div>

			{/* Timeframe Selector */}
			<div className="bg-white rounded-lg shadow-md p-6 mb-8">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">Sales Overview</h2>
					<div className="flex space-x-2">
						<button
							onClick={() => setTimeframe("7days")}
							className={`px-4 py-2 rounded-lg text-sm font-medium ${
								timeframe === "7days"
									? "bg-blue-600 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							7 Days
						</button>
						<button
							onClick={() => setTimeframe("30days")}
							className={`px-4 py-2 rounded-lg text-sm font-medium ${
								timeframe === "30days"
									? "bg-blue-600 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							30 Days
						</button>
						<button
							onClick={() => setTimeframe("90days")}
							className={`px-4 py-2 rounded-lg text-sm font-medium ${
								timeframe === "90days"
									? "bg-blue-600 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							90 Days
						</button>
					</div>
				</div>
			</div>

			{/* Loading and Error States */}
			{loading && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading analytics...</p>
				</div>
			)}

			{error && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						<p>{error}</p>
					</div>
					<button
						onClick={() => window.location.reload()}
						className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Try Again
					</button>
				</div>
			)}

			{/* Analytics Dashboard */}
			{!loading && !error && analytics && (
				<>
					{/* Key Metrics */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div className="bg-white rounded-lg shadow-md p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-700">Total Revenue</h3>
								<DollarSign className="h-8 w-8 text-green-500" />
							</div>
							<p className="text-3xl font-bold text-gray-900">
								{formatPrice(analytics.totalRevenue)}
							</p>
							<p className="text-sm text-gray-500 mt-2">
								Avg. {formatPrice(analytics.averageOrderValue)} per order
							</p>
						</div>

						<div className="bg-white rounded-lg shadow-md p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
								<ShoppingBag className="h-8 w-8 text-blue-500" />
							</div>
							<p className="text-3xl font-bold text-gray-900">
								{analytics.totalOrders}
							</p>
							<p className="text-sm text-gray-500 mt-2">
								Conversion: {formatPercentage(analytics.conversionRate)}
							</p>
						</div>

						<div className="bg-white rounded-lg shadow-md p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-700">Customers</h3>
								<Users className="h-8 w-8 text-purple-500" />
							</div>
							<p className="text-3xl font-bold text-gray-900">
								{analytics.totalCustomers}
							</p>
							<p className="text-sm text-gray-500 mt-2">Unique email addresses</p>
						</div>

						<div className="bg-white rounded-lg shadow-md p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-700">Downloads</h3>
								<Download className="h-8 w-8 text-orange-500" />
							</div>
							<p className="text-3xl font-bold text-gray-900">
								{analytics.totalDownloads}
							</p>
							<p className="text-sm text-gray-500 mt-2">Total file downloads</p>
						</div>
					</div>

					{/* Note: Revenue chart removed as requested */}

					{/* Top Products */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-semibold mb-6">Top Products</h2>
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Product
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Sales
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Revenue
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{analytics.topProducts.map((product) => (
										<tr key={product.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm font-medium text-gray-900">
													<Link
														href={`/admin/products/edit/${product.id}`}
														className="hover:text-blue-600"
													>
														{product.title}
													</Link>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-gray-900">{product.sales} orders</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
												{formatPrice(product.revenue)}
											</td>
										</tr>
									))}
									{analytics.topProducts.length === 0 && (
										<tr>
											<td colSpan={3} className="px-6 py-4 text-center text-gray-500">
												No product data available.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
