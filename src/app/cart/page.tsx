"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/useCart";
import { useSettings, formatCurrency } from "@/lib/useSettings";

export default function CartPage() {
	const { items, removeItem, getTotalPrice, isHydrated, clearCart } = useCart();
	const { settings } = useSettings();
	const [email, setEmail] = useState("");
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [checkoutError, setCheckoutError] = useState("");

	// Calculate subtotal
	const subtotal = getTotalPrice();

	// Format price using the helper function
	const formatPrice = (price: number) => {
		return formatCurrency(price, settings.currency);
	};

	// Handle item removal
	const handleRemoveItem = (id: string) => {
		removeItem(id);
	};

	// Handle checkout
	const handleCheckout = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsCheckingOut(true);
		setCheckoutError("");

		try {
			// Call your checkout API
			const response = await fetch("/api/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					items: items,
					customerEmail: email,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to create checkout session");
			}

			const { url } = await response.json();

			// First open a new tab, then redirect it to Stripe checkout
			// This is the recommended approach for handling Stripe Checkout in iframe environments
			// Open a new tab for checkout
			const newTab = window.open("about:blank", "_blank");
			if (newTab) {
				// Clear the cart in the current tab
				clearCart();

				// Redirect the new tab to Stripe checkout
				newTab.location.href = url;

				// Reset the checkout state after opening the new tab
				setIsCheckingOut(false);

				// Refresh the current page to show empty cart
				window.location.reload();
			} else {
				// Fallback if popup is blocked
				alert("Please allow popups for this website to proceed with checkout");
				setIsCheckingOut(false);
			}
		} catch (error: unknown) {
			console.error("Checkout error:", error);
			if (error instanceof Error) {
				setCheckoutError(error.message);
			} else {
				setCheckoutError("An error occurred during checkout");
			}
			setIsCheckingOut(false);
		}
	};

	// Show loading state while Zustand hydrates
	if (!isHydrated) {
		return <div className="container mx-auto px-4 py-8">Loading cart...</div>;
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<Link
					href="/products"
					className="text-blue-600 hover:text-blue-800 flex items-center"
				>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Continue Shopping
				</Link>
			</div>

			<h1 className="text-3xl font-bold mb-8">Your Cart</h1>

			{items.length > 0 ? (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Cart Items */}
					<div className="lg:col-span-2">
						<div className="bg-white rounded-lg shadow-md overflow-hidden">
							<ul className="divide-y divide-gray-200">
								{items.map((item) => (
									<li key={item.id} className="p-6 flex items-start">
										<div className="h-20 w-20 flex-shrink-0 relative rounded overflow-hidden">
											<Image
												src={item.thumbnail}
												alt={item.title}
												fill
												sizes="80px"
												className="object-cover"
											/>
										</div>
										<div className="ml-4 flex-grow">
											<h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
											<p className="text-blue-600 font-bold mt-1">
												{formatPrice(item.price)}
											</p>
										</div>
										<button
											onClick={() => handleRemoveItem(item.id)}
											className="text-gray-500 hover:text-red-600"
											aria-label="Remove item"
										>
											<Trash2 className="h-5 w-5" />
										</button>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Order Summary */}
					<div className="lg:col-span-1">
						<div className="bg-white rounded-lg shadow-md p-6">
							<h2 className="text-lg font-semibold mb-4">Order Summary</h2>

							<div className="space-y-3 mb-6">
								<div className="flex justify-between">
									<span className="text-gray-600">Subtotal</span>
									<span className="font-medium">{formatPrice(subtotal)}</span>
								</div>
								<div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
									<span>Total</span>
									<span className="text-blue-600">{formatPrice(subtotal)}</span>
								</div>
							</div>

							<form onSubmit={handleCheckout}>
								<div className="mb-4">
									<label
										htmlFor="email"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Email Address
									</label>
									<input
										type="email"
										id="email"
										required
										className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
										placeholder="your@email.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
									<p className="text-sm text-gray-500 mt-1">
										We&apos;ll send your receipt and download link to this email
									</p>
								</div>

								{checkoutError && (
									<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
										{checkoutError}
									</div>
								)}

								<button
									type="submit"
									disabled={isCheckingOut || items.length === 0}
									className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-300"
								>
									{isCheckingOut ? (
										<>
											<div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
											Processing...
										</>
									) : (
										<>
											<ShoppingBag className="h-5 w-5 mr-2" />
											Checkout
										</>
									)}
								</button>
							</form>
						</div>
					</div>
				</div>
			) : (
				<div className="text-center py-16 bg-white rounded-lg shadow-md">
					<div className="flex justify-center mb-4">
						<ShoppingBag className="h-16 w-16 text-gray-300" />
					</div>
					<h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
					<p className="text-gray-600 mb-6">
						Looks like you haven&apos;t added any products to your cart yet.
					</p>
					<Link
						href="/products"
						className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center"
					>
						Browse Products
					</Link>
				</div>
			)}
		</div>
	);
}
