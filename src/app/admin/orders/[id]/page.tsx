"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useSettings, formatCurrency } from "@/lib/useSettings";
import AdminPageLayout from "@/components/AdminPageLayout";

// Define order types
interface OrderItem {
	id: string;
	productId: string;
	price: number;
	product: {
		title: string;
		thumbnail?: string;
	};
}

interface Download {
	id: string;
	downloadToken: string;
	productId: string;
}

interface Order {
	id: string;
	customerEmail: string;
	totalAmount: number;
	status: string;
	createdAt: string;
	orderItems: OrderItem[];
	downloads: Download[];
}

export default function OrderDetailPage({
	params,
}: {
	params: { id: string };
}) {
	const { id } = params;
	const [order, setOrder] = useState<Order | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { settings } = useSettings();

	// Fetch order from API
	useEffect(() => {
		const fetchOrder = async () => {
			try {
				const response = await fetch(`/api/admin/orders/${id}`);
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
	}, [id]);

	// Format price using the helper function
	const formatPrice = (price: number) => {
		return formatCurrency(price, settings.currency);
	};

	// Format date
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
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
					<Link href="/admin/orders" className="mr-4">
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<h1 className="text-3xl font-bold">Order Details</h1>
				</div>

				{/* Loading and Error States */}
				{loading && (
					<div className="bg-white rounded-lg shadow-md p-8 text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto mb-4"></div>
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
							className="bg-[#0B4F96] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
						>
							Try Again
						</button>
					</div>
				)}

				{/* Order Details */}
				{!loading && !error && order && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Order Summary */}
						<div className="lg:col-span-2">
							<div className="bg-white rounded-lg shadow-md p-6 mb-8">
								<div className="flex justify-between items-start mb-6">
									<div>
										<h2 className="text-xl font-semibold mb-1">
											Order #{order.id.substring(0, 8)}...
										</h2>
										<p className="text-gray-500">{formatDate(order.createdAt)}</p>
									</div>
									<span
										className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(
											order.status
										)}`}
									>
										{order.status}
									</span>
								</div>

								<div className="border-t border-gray-200 pt-4">
									<h3 className="text-lg font-semibold mb-4">Items</h3>
									<div className="space-y-4">
										{order.orderItems.map((item) => (
											<div
												key={item.id}
												className="flex justify-between items-center border-b border-gray-100 pb-4"
											>
												<div className="flex-grow">
													<p className="font-medium">{item.product.title}</p>
													<p className="text-sm text-gray-500">
														Product ID: {item.productId}
													</p>
												</div>
												<p className="font-medium text-gray-900">
													{formatPrice(item.price)}
												</p>
											</div>
										))}
									</div>
									<div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
										<p className="font-semibold">Total</p>
										<p className="text-xl font-bold text-[#0B4F96]">
											{formatPrice(order.totalAmount)}
										</p>
									</div>
								</div>
							</div>

							{/* Downloads Section */}
							{order.downloads && order.downloads.length > 0 && (
								<div className="bg-white rounded-lg shadow-md p-6">
									<h3 className="text-lg font-semibold mb-4">Downloads</h3>
									<div className="space-y-3">
										{order.downloads.map((download) => {
											// Find the corresponding order item to get the product title
											const orderItem = order.orderItems.find(
												(item) => item.productId === download.productId
											);
											return (
												<div
													key={download.id}
													className="flex justify-between items-center border-b border-gray-100 pb-3"
												>
													<span className="font-medium">
														{orderItem?.product.title || "Digital Product"}
													</span>
													<a
														href={`/api/download/${download.downloadToken}`}
														className="inline-flex items-center px-3 py-1 bg-[#0B4F96] text-white text-sm font-medium rounded hover:bg-blue-700"
														target="_blank"
														rel="noopener noreferrer"
													>
														<Download className="h-4 w-4 mr-1" />
														Download
													</a>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>

						{/* Customer Information */}
						<div className="lg:col-span-1">
							<div className="bg-white rounded-lg shadow-md p-6 mb-8">
								<h3 className="text-lg font-semibold mb-4">Customer</h3>
								<div className="space-y-3">
									<div>
										<p className="text-sm text-gray-500">Email</p>
										<p className="font-medium">{order.customerEmail}</p>
									</div>
								</div>
							</div>

							{/* Actions */}
							<div className="bg-white rounded-lg shadow-md p-6">
								<h3 className="text-lg font-semibold mb-4">Actions</h3>
								<div className="space-y-3">
									<a
										href={`/api/admin/orders/${order.id}/invoice`}
										className="w-full inline-flex justify-center items-center px-4 py-2 bg-[#0B4F96] text-white text-sm font-medium rounded hover:bg-blue-700"
										target="_blank"
										rel="noopener noreferrer"
									>
										<Download className="h-4 w-4 mr-2" />
										Download Invoice
									</a>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</AdminPageLayout>
	);
}
