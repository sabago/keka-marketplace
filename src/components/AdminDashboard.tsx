"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	DollarSign,
	ShoppingBag,
	Users,
	Download,
	Star,
	ArrowRight,
	Trash2,
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

interface Review {
	id: string;
	productId: string;
	productTitle: string;
	rating: number;
	comment: string;
	customerName: string;
	createdAt: string;
}

export default function AdminDashboard() {
	const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [timeframe, setTimeframe] = useState("30days");
	const [cleanupLoading, setCleanupLoading] = useState(false);
	const { settings } = useSettings();

	// Fetch analytics from API
	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Fetch analytics data
				const analyticsResponse = await fetch(
					`/api/admin/analytics?timeframe=${timeframe}`
				);
				if (!analyticsResponse.ok) {
					throw new Error("Failed to fetch analytics");
				}
				const analyticsData = await analyticsResponse.json();

				// Fetch recent reviews
				const reviewsResponse = await fetch("/api/admin/reviews");
				if (!reviewsResponse.ok) {
					throw new Error("Failed to fetch reviews");
				}
				const reviewsData = await reviewsResponse.json();

				setAnalytics(analyticsData);
				setReviews(reviewsData.reviews.slice(0, 5)); // Get only the 5 most recent reviews
				setLoading(false);
			} catch (err) {
				console.error("Error fetching dashboard data:", err);
				setError("Failed to load dashboard data. Please try again later.");
				setLoading(false);
			}
		};

		fetchData();
	}, [timeframe]);

	// Format price using the helper function
	const formatPrice = (price: number) => {
		return formatCurrency(price, settings.currency);
	};

	// Format percentage
	const formatPercentage = (value: number) => {
		return `${(value * 100).toFixed(2)}%`;
	};

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(date);
	};

	// Handle cleanup of test orders
	const handleCleanupTestOrders = async () => {
		if (
			!window.confirm(
				"Are you sure you want to delete ALL test orders? This action cannot be undone.\n\n" +
					"This will remove all orders with Stripe payment IDs starting with 'cs_test_'."
			)
		) {
			return;
		}

		setCleanupLoading(true);
		try {
			const response = await fetch("/api/admin/cleanup-test-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const result = await response.json();

			if (result.success) {
				alert(
					`✅ Test data cleanup completed!\n\n` +
						`• Orders deleted: ${result.data.deletedOrders}\n` +
						`• Order items deleted: ${result.data.deletedOrderItems}\n` +
						`• Downloads deleted: ${result.data.deletedDownloads}`
				);

				// Refresh the analytics data
				window.location.reload();
			} else {
				throw new Error(result.message || "Failed to cleanup test orders");
			}
		} catch (error) {
			console.error("Error cleaning up test orders:", error);
			alert(
				"❌ Failed to cleanup test orders. Please try again or check the console for details."
			);
		} finally {
			setCleanupLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="bg-white rounded-lg shadow-md p-8 text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
				<p className="text-gray-600">Loading dashboard data...</p>
			</div>
		);
	}

	if (error) {
		return (
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
		);
	}

	if (!analytics) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* Timeframe Selector */}
			<div className="bg-white rounded-lg shadow-md p-6">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">Dashboard Overview</h2>
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
						<button
							onClick={() => setTimeframe("all")}
							className={`px-4 py-2 rounded-lg text-sm font-medium ${
								timeframe === "all"
									? "bg-blue-600 text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							All
						</button>
						<button
							onClick={handleCleanupTestOrders}
							disabled={cleanupLoading}
							className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center"
						>
							{cleanupLoading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
									Cleaning...
								</>
							) : (
								<>
									<Trash2 className="h-4 w-4 mr-2" />
									Clear Test Data
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
					<p className="text-3xl font-bold text-gray-900">{analytics.totalOrders}</p>
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

			{/* Second Row - Top Products and Recent Reviews */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Top Products */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-semibold">Top Products</h2>
						<Link
							href="/admin/analytics"
							className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
						>
							View All <ArrowRight className="h-4 w-4 ml-1" />
						</Link>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th
										scope="col"
										className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Product
									</th>
									<th
										scope="col"
										className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Sales
									</th>
									<th
										scope="col"
										className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Revenue
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{analytics.topProducts.slice(0, 5).map((product) => (
									<tr key={product.id} className="hover:bg-gray-50">
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												<Link
													href={`/admin/products/edit/${product.id}`}
													className="hover:text-blue-600"
												>
													{product.title}
												</Link>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="text-sm text-gray-900">{product.sales}</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
											{formatPrice(product.revenue)}
										</td>
									</tr>
								))}
								{analytics.topProducts.length === 0 && (
									<tr>
										<td colSpan={3} className="px-4 py-3 text-center text-gray-500">
											No product data available.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Recent Reviews */}
				<div className="bg-white rounded-lg shadow-md p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-xl font-semibold">Recent Reviews</h2>
						<Link
							href="/admin/reviews"
							className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
						>
							View All <ArrowRight className="h-4 w-4 ml-1" />
						</Link>
					</div>
					<div className="space-y-4">
						{reviews.map((review) => (
							<div
								key={review.id}
								className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
							>
								<div className="flex justify-between items-start">
									<div>
										<div className="flex items-center">
											{Array.from({ length: 5 }).map((_, i) => (
												<Star
													key={i}
													className={`h-4 w-4 ${
														i < review.rating
															? "text-yellow-400 fill-yellow-400"
															: "text-gray-300"
													}`}
												/>
											))}
											<span className="ml-2 text-sm font-medium text-gray-700">
												{review.customerName}
											</span>
										</div>
										<p className="text-xs text-gray-500 mt-1">
											{formatDate(review.createdAt)}
										</p>
									</div>
									<Link
										href={`/admin/reviews/${review.id}`}
										className="text-blue-600 hover:text-blue-800 text-xs"
									>
										View
									</Link>
								</div>
								<p className="text-sm text-gray-600 mt-2 line-clamp-2">
									{review.comment}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									Product:{" "}
									<Link
										href={`/admin/products/edit/${review.productId}`}
										className="text-blue-600 hover:text-blue-800"
									>
										{review.productTitle}
									</Link>
								</p>
							</div>
						))}
						{reviews.length === 0 && (
							<div className="text-center py-4 text-gray-500">
								No reviews available.
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
