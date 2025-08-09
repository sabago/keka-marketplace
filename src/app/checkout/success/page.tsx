"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/lib/useCart";
import PageLayout from "@/components/PageLayout";

// Component that uses useSearchParams
function CheckoutSuccessWithParams({
	onSessionIdChange,
}: {
	onSessionIdChange: (sessionId: string | null) => void;
}) {
	const searchParams = useSearchParams();
	const sessionId = searchParams.get("session_id");

	useEffect(() => {
		onSessionIdChange(sessionId);
	}, [sessionId, onSessionIdChange]);

	return null;
}

interface OrderDetails {
	id: string;
	customerEmail: string;
	totalAmount: number;
	status: string;
	createdAt: string;
	orderItems: {
		id: string;
		productId: string;
		price: number;
		product: {
			title: string;
		};
	}[];
	downloads: {
		downloadToken: string;
		productId: string;
	}[];
}

export default function CheckoutSuccessPage() {
	const clearCart = useCartStore((state) => state.clearCart);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Handle session ID change from the CheckoutSuccessWithParams component
	const handleSessionIdChange = (newSessionId: string | null) => {
		setSessionId(newSessionId);
	};

	useEffect(() => {
		// Clear the cart on successful checkout
		clearCart();

		// Get session ID from URL directly as a fallback
		const urlParams = new URLSearchParams(window.location.search);
		const urlSessionId = urlParams.get("session_id");

		// Use the session ID from the URL if the one from state is not available
		const effectiveSessionId = sessionId || urlSessionId;

		// Validate session ID format (basic check for cs_live or cs_test prefix)
		if (!effectiveSessionId) {
			setLoading(false);
			setError("Missing checkout session ID");
			return;
		}

		// Remove curly braces if present (Stripe sometimes includes them in the redirect URL)
		let cleanSessionId = effectiveSessionId;
		if (cleanSessionId.startsWith("{") && cleanSessionId.endsWith("}")) {
			cleanSessionId = cleanSessionId.substring(1, cleanSessionId.length - 1);
		}

		if (!cleanSessionId.startsWith("cs_")) {
			setLoading(false);
			setError("Invalid checkout session ID format");
			return;
		}

		// Function to fetch order details with retry logic
		const fetchOrderDetails = async (retryCount = 0, maxRetries = 5) => {
			try {
				// First try to get the order normally
				const response = await fetch(
					`/api/orders/by-session?session_id=${cleanSessionId}`
				);

				if (!response.ok) {
					throw new Error("Failed to load order details");
				}

				const data = await response.json();
				setOrderDetails(data);
				setLoading(false);
			} catch {
				// If we're in development mode and this is the last retry, try to create a test order
				if (
					retryCount >= maxRetries - 1 &&
					process.env.NODE_ENV === "development"
				) {
					try {
						// Retry with a flag to force create a test order
						const retryResponse = await fetch(
							`/api/orders/by-session?session_id=${cleanSessionId}&force_create=true`
						);

						if (!retryResponse.ok) {
							throw new Error("Failed to create test order");
						}

						const data = await retryResponse.json();
						setOrderDetails(data);
						setLoading(false);
					} catch {
						setError(
							"Failed to load or create order details. The webhook may not have processed the payment yet."
						);
						setLoading(false);
					}
				}
				// If we haven't reached max retries, try again after a delay
				else if (retryCount < maxRetries) {
					setTimeout(() => {
						fetchOrderDetails(retryCount + 1, maxRetries);
					}, (retryCount + 1) * 2000); // Increasing delay with each retry
				}
				// If we've exhausted all retries, show an error
				else {
					setError(
						"Failed to load order details. The webhook may not have processed the payment yet. Please check your email for order confirmation."
					);
					setLoading(false);
				}
			}
		};

		// Start the fetch process with a small initial delay
		const timer = setTimeout(() => {
			fetchOrderDetails();
		}, 2000); // Initial 2 second delay

		return () => clearTimeout(timer);
	}, [sessionId, clearCart]);

	// Format price
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price);
	};

	if (loading) {
		return (
			<PageLayout>
				<div className="container mx-auto px-4 py-16 text-center">
					<div className="animate-spin h-12 w-12 border-b-2 border-[#0B4F96] rounded-full mx-auto mb-4"></div>
					<p className="text-gray-600">Loading order details...</p>
				</div>
			</PageLayout>
		);
	}

	if (error) {
		return (
			<PageLayout>
				<div className="container mx-auto px-4 py-16">
					<div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
						<div className="text-center mb-8">
							<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
								<p>{error}</p>
							</div>
							<Link href="/products" className="text-[#0B4F96] hover:text-blue-800">
								Return to Products
							</Link>
						</div>
					</div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout>
			<div className="container mx-auto px-4 py-16">
				{/* Use the CheckoutSuccessWithParams component wrapped in Suspense */}
				<Suspense fallback={null}>
					<CheckoutSuccessWithParams onSessionIdChange={handleSessionIdChange} />
				</Suspense>
				<div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
					<div className="text-center mb-8">
						<CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
						<h1 className="text-3xl font-bold mb-2">Thank You for Your Purchase!</h1>
						<p className="text-gray-600">
							Your order has been successfully processed.
							{process.env.NODE_ENV === "development" ? (
								<span className="block mt-2 text-amber-600 text-sm">
									<strong>Note:</strong> In development mode, emails are not sent.
									Download links are available below.
								</span>
							) : (
								<span> A receipt and download links have been sent to your email.</span>
							)}
						</p>
					</div>

					{orderDetails && (
						<>
							<div className="mb-8">
								<h2 className="text-xl font-semibold mb-4">Order Summary</h2>
								<div className="border rounded-lg overflow-hidden">
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
											{orderDetails.orderItems.map((item) => (
												<tr key={item.id}>
													<td className="px-6 py-4 whitespace-nowrap">
														<div className="flex items-center">
															<div className="ml-4">
																<div className="text-sm font-medium text-gray-900">
																	{item.product.title}
																</div>
															</div>
														</div>
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
														{formatPrice(item.price)}
													</td>
												</tr>
											))}
											<tr className="bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													Total
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#0B4F96]">
													{formatPrice(orderDetails.totalAmount)}
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>

							{orderDetails.downloads && orderDetails.downloads.length > 0 && (
								<div className="mb-8">
									<h2 className="text-xl font-semibold mb-4">Your Downloads</h2>
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<p className="text-sm text-blue-800 mb-4">
											Your purchases are ready to download. You can also access these
											downloads from the email sent to {orderDetails.customerEmail}.
										</p>
										<div className="space-y-3">
											{orderDetails.downloads.map((download) => {
												// Find the corresponding order item to get the product title
												const orderItem = orderDetails.orderItems.find(
													(item) => item.productId === download.productId
												);
												return (
													<div
														key={download.downloadToken}
														className="flex justify-between items-center border-b border-blue-200 pb-2"
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
															Download
														</a>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							)}
						</>
					)}

					<div className="text-center">
						<Link href="/products" className="text-[#0B4F96] hover:text-blue-800">
							Continue Shopping
						</Link>
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
