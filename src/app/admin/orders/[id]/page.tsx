"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Mail, ExternalLink } from "lucide-react";

// Define order types
interface OrderItem {
	id: string;
	productId: string;
	price: number;
	product: {
		id: string;
		title: string;
		thumbnail: string;
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
	downloads: Download[];
}

export default function OrderDetailPage({
	params,
}: {
	params: { id: string };
}) {
	const [order, setOrder] = useState<Order | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch order from API
	useEffect(() => {
		const fetchOrder = async () => {
			try {
				const response = await fetch(`/api/admin/orders/${params.id}`);
				if (!response.ok) {
					throw new Error("Failed to fetch order");
				}
				const data = await response.json();
				setOrder(data);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching order:", err);
				setError("Failed to load order. Please try again later.");
				setLoading(false);
			}
		};

		fetchOrder();
	}, [params.id]);

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

	// Format expiration date
	const formatExpirationDate = (dateString: string) => {
		const expirationDate = new Date(dateString);
		const now = new Date();
		const isExpired = expirationDate < now;

		return {
			date: expirationDate.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			}),
			isExpired,
		};
	};

	// Send email with download links
	const sendDownloadEmail = async () => {
		if (!order) return;

		try {
			const response = await fetch(`/api/admin/orders/${order.id}/send-email`, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to send email");
			}

			alert("Download links email sent successfully!");
		} catch (err) {
			console.error("Error sending email:", err);
			alert("Failed to send email. Please try again.");
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex items-center mb-8">
				<Link href="/admin/orders" className="mr-4">
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<h1 className="text-3xl font-bold">Order Details</h1>
			</div>

			{/* Loading and Error States */}
			{loading && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading order details...</p>
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

			{/* Order Details */}
			{!loading && !error && order && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Order Summary */}
					<div className="md:col-span-2">
						<div className="bg-white rounded-lg shadow-md p-6 mb-6">
							<div className="flex justify-between items-start mb-6">
								<div>
									<h2 className="text-xl font-semibold mb-2">Order Summary</h2>
									<p className="text-gray-600">
										Order ID: <span className="font-medium">{order.id}</span>
									</p>
									<p className="text-gray-600">
										Date:{" "}
										<span className="font-medium">{formatDate(order.createdAt)}</span>
									</p>
								</div>
								<span
									className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusBadgeColor(
										order.status
									)}`}
								>
									{order.status}
								</span>
							</div>

							<div className="border-t border-gray-200 pt-4">
								<h3 className="text-lg font-semibold mb-2">Payment Information</h3>
								<p className="text-gray-600">
									Payment ID:{" "}
									<a
										href={`https://dashboard.stripe.com/payments/${order.stripePaymentId}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:underline inline-flex items-center"
									>
										{order.stripePaymentId}
										<ExternalLink className="h-4 w-4 ml-1" />
									</a>
								</p>
								<p className="text-gray-600">
									Total:{" "}
									<span className="font-medium">{formatPrice(order.totalAmount)}</span>
								</p>
							</div>
						</div>

						{/* Order Items */}
						<div className="bg-white rounded-lg shadow-md p-6 mb-6">
							<h2 className="text-xl font-semibold mb-4">Order Items</h2>
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
												className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
											>
												Price
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{order.orderItems.map((item) => (
											<tr key={item.id}>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center">
														<div className="text-sm font-medium text-gray-900">
															<Link
																href={`/admin/products/edit/${item.product.id}`}
																className="hover:text-blue-600"
															>
																{item.product.title}
															</Link>
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
													{formatPrice(item.price)}
												</td>
											</tr>
										))}
										<tr className="bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												Total
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">
												{formatPrice(order.totalAmount)}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						{/* Downloads */}
						<div className="bg-white rounded-lg shadow-md p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold">Downloads</h2>
								<button
									onClick={sendDownloadEmail}
									className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
								>
									<Mail className="h-4 w-4 mr-2" />
									Resend Email
								</button>
							</div>
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
												Download Count
											</th>
											<th
												scope="col"
												className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
											>
												Expires
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
										{order.downloads.map((download) => {
											const { date, isExpired } = formatExpirationDate(download.expiresAt);
											const product = order.orderItems.find(
												(item) => item.productId === download.productId
											)?.product;

											return (
												<tr key={download.id}>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm font-medium text-gray-900">
															{product?.title || "Unknown Product"}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="text-sm text-gray-900">
															{download.downloadCount} times
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap">
														<div
															className={`text-sm ${
																isExpired ? "text-red-600" : "text-gray-900"
															}`}
														>
															{date}
															{isExpired && " (Expired)"}
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
														<a
															href={`/api/download/${download.downloadToken}`}
															target="_blank"
															rel="noopener noreferrer"
															className="text-blue-600 hover:text-blue-900 inline-flex items-center"
														>
															<Download className="h-4 w-4 mr-1" />
															Download
														</a>
													</td>
												</tr>
											);
										})}
										{order.downloads.length === 0 && (
											<tr>
												<td colSpan={4} className="px-6 py-4 text-center text-gray-500">
													No downloads available for this order.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Customer Information */}
					<div className="md:col-span-1">
						<div className="bg-white rounded-lg shadow-md p-6 mb-6">
							<h2 className="text-xl font-semibold mb-4">Customer</h2>
							<p className="text-gray-600 mb-2">
								<span className="font-medium">Email:</span>
							</p>
							<p className="mb-4">{order.customerEmail}</p>
							<button
								onClick={() => (window.location.href = `mailto:${order.customerEmail}`)}
								className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
							>
								<Mail className="h-4 w-4 mr-2" />
								Contact Customer
							</button>
						</div>

						<div className="bg-white rounded-lg shadow-md p-6">
							<h2 className="text-xl font-semibold mb-4">Actions</h2>
							<div className="space-y-3">
								<button
									onClick={() =>
										window.open(`/api/admin/orders/${order.id}/invoice`, "_blank")
									}
									className="w-full inline-flex justify-center items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
								>
									<Download className="h-4 w-4 mr-2" />
									Download Invoice
								</button>
								<button
									onClick={sendDownloadEmail}
									className="w-full inline-flex justify-center items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
								>
									<Mail className="h-4 w-4 mr-2" />
									Resend Download Links
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
