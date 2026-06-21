"use client";

import { useState } from "react";
import { ShoppingCart, LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { useSettings, formatCurrency } from "@/lib/useSettings";
import { useCartStore } from "@/lib/useCart";

type Product = {
	id: string;
	title: string;
	price: unknown;
	thumbnail?: string | null;
};

export default function AddToCartButton({ product }: { product: Product }) {
	const [addedToCart, setAddedToCart] = useState(false);
	const { isLoggedIn } = useAuth();
	const { settings } = useSettings();
	const addItem = useCartStore((state) => state.addItem);
	const items = useCartStore((state) => state.items);

	// Check if product is already in cart and get its quantity
	const cartItem = items.find((item) => item.id === product.id);
	const quantity = cartItem ? cartItem.quantity : 0;

	// Convert price to number
	const priceAsNumber = Number(product.price);

	// Calculate discounted price for logged-in users
	const discountPercentage = settings.memberDiscountPercentage || 0;
	const calculatedDiscountedPrice =
		priceAsNumber * (1 - discountPercentage / 100);

	// Ensure discounted price meets Stripe's minimum of $0.50
	const STRIPE_MINIMUM = 0.5;
	const discountedPrice = isLoggedIn
		? Math.max(calculatedDiscountedPrice, STRIPE_MINIMUM)
		: priceAsNumber;

	// Format prices using the helper function
	const formattedOriginalPrice = formatCurrency(
		priceAsNumber,
		settings.currency
	);
	const formattedDiscountedPrice = formatCurrency(
		discountedPrice,
		settings.currency
	);

	// Handle add to cart
	const handleAddToCart = () => {
		// Use discounted price for logged-in users
		const finalPrice = isLoggedIn ? discountedPrice : priceAsNumber;

		addItem({
			id: product.id,
			title: product.title,
			price: finalPrice,
			thumbnail: product.thumbnail || "/images/dummy.jpeg",
		});

		setAddedToCart(true);

		// Reset the added to cart state after 2 seconds
		setTimeout(() => {
			setAddedToCart(false);
		}, 2000);
	};

	return (
		<div className="mt-4">
			{/* Show discount information */}
			{isLoggedIn && discountPercentage > 0 ? (
				<div className="flex flex-col mb-4">
					<span className="text-sm line-through text-gray-500">
						{formattedOriginalPrice}
					</span>
					<span className="text-lg font-bold text-green-600">
						{formattedDiscountedPrice}
					</span>
					<span className="text-sm text-green-700">
						{discountPercentage}% member discount
					</span>
				</div>
			) : discountPercentage > 0 ? (
				<div className="mb-4">
					<Link
						href="/?login=true"
						className="text-sm text-[#0B4F96] hover:underline flex items-center"
					>
						<LogIn size={14} className="mr-1" />
						Login for {discountPercentage}% off
					</Link>
				</div>
			) : null}

			{/* Add to Cart Button */}
			{quantity > 0 ? (
				<div className="flex flex-col w-full">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium">In Cart: {quantity}</span>
					</div>
					<button
						onClick={handleAddToCart}
						className="bg-[#0B4F96] hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center w-full"
					>
						<Plus className="h-5 w-5 mr-2" />
						Add Another
					</button>
				</div>
			) : (
				<button
					onClick={handleAddToCart}
					className={`${
						addedToCart
							? "hover:bg-green-700 bg-green-600"
							: "hover:bg-blue-700 bg-[#0B4F96]"
					} text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center w-full`}
				>
					<ShoppingCart className="h-5 w-5 mr-2" />
					{addedToCart ? "Added to Cart!" : "Add to Cart"}
				</button>
			)}
		</div>
	);
}
