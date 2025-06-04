"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { useSettings, formatCurrency } from "@/lib/useSettings";
import AdminPageLayout from "@/components/AdminPageLayout";

// Define order types
interface OrderItem {
	id: string;
	productId: string;
	price: number;
	product: {
		title: string;
	};
}

interface Order {
	id: string;
	customerEmail: string;
	totalAmount: number;
	status: string;
	createdAt: string;
	orderItems: OrderItem[];
}

export default function OrdersPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { settings } = useSettings();

	// Fetch orders from API
	useEffect(() => {
		const fetchOrders = async () => {
			try {
				const response = await fetch("/api/admin/orders");
				if (!response.ok) {
					throw new Error("Failed to fetch orders");
				}
				const data = await response.json();
				setOrders(data.orders || []);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching orders:", err);
				setError("Failed to load orders. Please try again later.");
				setLoading(false);
			}
		};

		fetchOrders();
	}, []);

	// Format price using the helper function
	const formatPrice = (price: number) => {
		return formatCurrency(price, settings.currency);
	};

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	// Get status badge color
	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "completed":
				return "bg-green-100 text-green-800";
			case "processing":
				return "bg-blue-100 text-blue-800";
			case "failed":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<AdminPageLayout>
			<div className="container mx-auto px-4 py-8">
				<div className="flex items-center mb-8">
					<Link href="/admin" className="mr-4">
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<h1 className="text-3xl font-bold">Orders</h1>
				</div>

				{/* Loading and Error States */}
				{loading && (
					<div className="bg-white rounded-lg shadow-md p-8 text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
						<p className="text-gray-600">Loading orders...</p>
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

				{/* Orders Table */}
				{!loading && !error && (
					<div className="bg-white rounded-lg shadow-md overflow-hidden">
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Order ID
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Customer
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Date
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Status
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Total
										</th>
										<th
											scope="col"
											className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{orders.map((order) => (
										<tr key={order.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm font-medium text-gray-900">
													{order.id.substring(0, 8)}...
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-gray-900">{order.customerEmail}</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-gray-500">
													{formatDate(order.createdAt)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span
													className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
														order.status
													)}`}
												>
													{order.status}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm font-medium text-gray-900">
													{formatPrice(order.totalAmount)}
												</div>
												<div className="text-xs text-gray-500">
													{order.orderItems.length} item
													{order.orderItems.length !== 1 ? "s" : ""}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
												<div className="flex justify-end space-x-2">
													<Link
														href={`/admin/orders/${order.id}`}
														className="text-blue-600 hover:text-blue-900"
														title="View Order Details"
													>
														<Eye className="h-5 w-5" />
													</Link>
													<Link
														href={`/api/admin/orders/${order.id}/invoice`}
														className="text-green-600 hover:text-green-900"
														title="Download Invoice"
														target="_blank"
													>
														<Download className="h-5 w-5" />
													</Link>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{orders.length === 0 && (
							<div className="text-center py-8 text-gray-500">No orders found.</div>
						)}
					</div>
				)}
			</div>
		</AdminPageLayout>
	);
}
