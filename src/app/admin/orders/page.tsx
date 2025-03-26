"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Download, Eye } from "lucide-react";

// Define order types
interface OrderItem {
	id: string;
	productId: string;
	price: number;
	product: {
		title: string;
	};
}

interface Download {
	id: string;
	productId: string;
	downloadToken: string;
	downloadCount: number;
	expiresAt: string;
}

interface Order {
	id: string;
	customerEmail: string;
	totalAmount: number;
	status: string;
	createdAt: string;
	stripePaymentId: string;
	orderItems: OrderItem[];
	downloads?: Download[];
}

export default function OrdersPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");

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

	// Filter orders based on search query and status
	const filteredOrders = orders.filter((order) => {
		const matchesSearch =
			order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.stripePaymentId.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || order.status === statusFilter.toUpperCase();

		return matchesSearch && matchesStatus;
	});

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Format price
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price);
	};

	// Get status badge color
	const getStatusBadgeColor = (status: string) => {
		switch (status) {
			case "PAID":
				return "bg-green-100 text-green-800";
			case "PENDING":
				return "bg-yellow-100 text-yellow-800";
			case "FAILED":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex items-center mb-8">
				<Link href="/admin" className="mr-4">
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<h1 className="text-3xl font-bold">Orders</h1>
			</div>

			{/* Search and Filter */}
			<div className="bg-white rounded-lg shadow-md p-6 mb-8">
				<div className="flex flex-col md:flex-row md:items-center gap-4">
					<div className="relative flex-grow">
						<input
							type="text"
							placeholder="Search by email, order ID, or payment ID..."
							className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
					</div>
					<div className="flex-shrink-0">
						<select
							className="w-full md:w-auto px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
						>
							<option value="all">All Statuses</option>
							<option value="paid">Paid</option>
							<option value="pending">Pending</option>
							<option value="failed">Failed</option>
						</select>
					</div>
				</div>
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
								{filteredOrders.map((order) => (
									<tr key={order.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{order.id.substring(0, 8)}...
											</div>
											<div className="text-xs text-gray-500">
												{order.stripePaymentId.substring(0, 12)}...
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">{order.customerEmail}</div>
											<div className="text-xs text-gray-500">
												{order.orderItems.length} item(s)
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{formatDate(order.createdAt)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
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
												<button
													onClick={() =>
														window.open(`/api/admin/orders/${order.id}/invoice`, "_blank")
													}
													className="text-green-600 hover:text-green-900"
													title="Download Invoice"
												>
													<Download className="h-5 w-5" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{filteredOrders.length === 0 && (
						<div className="text-center py-8 text-gray-500">
							No orders found. Try a different search term or filter.
						</div>
					)}
				</div>
			)}

			{/* Order Stats */}
			{!loading && !error && (
				<div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-lg font-semibold mb-2">Total Orders</h2>
						<p className="text-3xl font-bold text-blue-600">{orders.length}</p>
					</div>
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-lg font-semibold mb-2">Total Revenue</h2>
						<p className="text-3xl font-bold text-green-600">
							{formatPrice(
								orders.reduce(
									(sum, order) => sum + parseFloat(order.totalAmount.toString()),
									0
								)
							)}
						</p>
					</div>
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-lg font-semibold mb-2">Avg. Order Value</h2>
						<p className="text-3xl font-bold text-purple-600">
							{orders.length > 0
								? formatPrice(
										orders.reduce(
											(sum, order) => sum + parseFloat(order.totalAmount.toString()),
											0
										) / orders.length
								  )
								: formatPrice(0)}
						</p>
					</div>
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-lg font-semibold mb-2">Total Downloads</h2>
						<p className="text-3xl font-bold text-orange-600">
							{orders.reduce(
								(sum, order) =>
									sum +
									(order.downloads?.reduce(
										(dSum, download) => dSum + download.downloadCount,
										0
									) || 0),
								0
							)}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
