"use client";
import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingCart, LogIn } from "lucide-react";
import { useCartStore } from "@/lib/useCart";
import { useSettings, formatCurrency } from "@/lib/useSettings";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";

type ProductCardProps = {
	id: string;
	title: string;
	description: string;
	price: number;
	thumbnail: string;
	averageRating?: number;
	reviewCount?: number;
};

export default function ProductCard({
	id,
	title,
	description,
	price,
	thumbnail,
	averageRating = 0,
	reviewCount = 0,
}: ProductCardProps) {
	const pathname = usePathname();
	const addItem = useCartStore((state) => state.addItem);
	const [addedToCart, setAddedToCart] = useState(false);
	const { settings } = useSettings();
	const { isLoggedIn } = useAuth();

	// Check if we're on the products page
	const isProductsPage = pathname === "/products";

	// Truncate description if it's too long
	const truncatedDescription =
		description.length > 100
			? `${description.substring(0, 100)}...`
			: description;

	// Calculate discounted price for logged-in users
	const discountPercentage = settings.memberDiscountPercentage || 0;
	const discountedPrice = isLoggedIn
		? price * (1 - discountPercentage / 100)
		: price;

	// Format prices using the helper function
	const formattedOriginalPrice = formatCurrency(price, settings.currency);
	const formattedDiscountedPrice = formatCurrency(
		discountedPrice,
		settings.currency
	);

	// Handle add to cart
	const handleAddToCart = (e: React.MouseEvent) => {
		e.preventDefault();

		// Use discounted price for logged-in users
		const finalPrice = isLoggedIn ? discountedPrice : price;

		// Log before adding to cart
		console.log("Adding to cart:", {
			id,
			title,
			price: finalPrice,
			thumbnail,
			isDiscounted: isLoggedIn && discountPercentage > 0,
		});

		addItem({
			id,
			title,
			price: finalPrice,
			thumbnail: thumbnail || "/images/dummy.jpeg",
		});

		// Log cart state after adding item
		console.log("Cart state after adding item:", useCartStore.getState().items);
		console.log("Total items:", useCartStore.getState().getTotalItems());

		setAddedToCart(true);

		// Reset the added to cart state after 2 seconds
		setTimeout(() => {
			setAddedToCart(false);
		}, 2000);
	};

	return (
		<Link
			href={`/products/${id}`}
			className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
		>
			<div className="relative h-48 w-full">
				{thumbnail ? (
					<Image
						src={thumbnail}
						alt={title}
						fill
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						className="object-cover"
						onError={(e) => {
							// Fallback for image loading errors
							const target = e.target as HTMLImageElement;
							target.onerror = null;
							target.style.display = "none";
							const parent = target.parentElement;
							if (parent) {
								parent.classList.add("bg-gray-200");
								parent.classList.add("flex");
								parent.classList.add("items-center");
								parent.classList.add("justify-center");
								const fallback = document.createElement("span");
								fallback.className = "text-gray-500";
								fallback.textContent = "No image";
								parent.appendChild(fallback);
							}
						}}
					/>
				) : (
					<div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
						<span className="text-gray-500">No image</span>
					</div>
				)}
			</div>

			<div className="p-4">
				<h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
					{title}
				</h3>

				{/* Rating */}
				<div className="flex items-center mt-1 mb-2">
					<div className="flex items-center">
						{[1, 2, 3, 4, 5].map((star) => (
							<Star
								key={star}
								size={16}
								className={`${
									star <= Math.round(averageRating)
										? "text-yellow-400 fill-yellow-400"
										: "text-gray-300"
								}`}
							/>
						))}
					</div>
					<span className="text-sm text-gray-500 ml-1">
						{reviewCount > 0 ? `(${reviewCount})` : "No reviews"}
					</span>
				</div>

				<p className="text-gray-600 text-sm mb-3">{truncatedDescription}</p>

				<div className="flex items-center justify-between mt-auto">
					<div>
						{isLoggedIn && discountPercentage > 0 ? (
							<div className="flex flex-col">
								<span className="text-sm line-through text-gray-500">
									{formattedOriginalPrice}
								</span>
								<span className="text-lg font-bold text-green-600">
									{formattedDiscountedPrice}
								</span>
								<span className="text-xs text-green-700">
									{discountPercentage}% off
								</span>
							</div>
						) : (
							<span className="text-lg font-bold text-blue-600">
								{formattedOriginalPrice}
							</span>
						)}
					</div>

					{isProductsPage ? (
						<div className="flex flex-col items-end">
							<button
								onClick={handleAddToCart}
								className={`p-2 rounded-full ${
									addedToCart
										? "bg-green-600 text-white"
										: "bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
								} transition-colors`}
								aria-label="Add to cart"
							>
								<ShoppingCart size={18} />
							</button>

							{!isLoggedIn && discountPercentage > 0 && (
								<Link
									href="/?login=true"
									onClick={(e) => e.stopPropagation()}
									className="text-xs text-blue-600 hover:underline mt-1 flex items-center"
								>
									<LogIn size={12} className="mr-1" />
									Login for {discountPercentage}% off
								</Link>
							)}
						</div>
					) : (
						<span className="text-sm text-gray-500">View details</span>
					)}
				</div>
			</div>
		</Link>
	);
}
