"use client";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, LogIn } from "lucide-react";
import ProductCardReview from "./ProductCardReview";
import { useCartStore, useCart } from "@/lib/useCart";
import { useSettings, formatCurrency } from "@/lib/useSettings";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import ReviewForm from "./ReviewForm";

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
	const items = useCartStore((state) => state.items);
	const { isHydrated } = useCart();
	const [addedToCart, setAddedToCart] = useState(false);

	// Check if product is already in cart and get its quantity
	const cartItem = isHydrated ? items.find((item) => item.id === id) : null;
	const quantity = cartItem ? cartItem.quantity : 0;

	// Cart state tracking
	const [showReviewForm, setShowReviewForm] = useState(false);
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

		addItem({
			id,
			title,
			price: finalPrice,
			thumbnail: thumbnail || "/images/dummy.jpeg",
		});

		// Add item to cart

		setAddedToCart(true);

		// Reset the added to cart state after 2 seconds
		setTimeout(() => {
			setAddedToCart(false);
		}, 2000);
	};

	return (
		<div className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
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

			<Link href={`/products/${id}`} className="block">
				<div className="p-4">
					<h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
						{title}
					</h3>
				</div>
			</Link>

			{/* Rating and Review - Outside the Link */}
			<div
				className="px-4 py-2 bg-gray-50 relative cursor-pointer hover:bg-gray-100 transition-colors"
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setShowReviewForm(true);
				}}
				title="Click to write a review"
			>
				<ProductCardReview
					averageRating={averageRating}
					reviewCount={reviewCount}
				/>
			</div>

			{/* Review Form Modal */}
			{showReviewForm && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setShowReviewForm(false);
					}}
				>
					<div
						className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold">Write a Review for {title}</h2>
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowReviewForm(false);
								}}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>
						<ReviewForm
							productId={id}
							onSuccess={() => setShowReviewForm(false)}
							onCancel={() => setShowReviewForm(false)}
							compact={true}
						/>
					</div>
				</div>
			)}

			<Link href={`/products/${id}`} className="block">
				<div className="px-4">
					<p className="text-gray-600 text-sm mb-3">{truncatedDescription}</p>
				</div>

				<div className="flex items-center justify-between mt-auto m-4">
					<div>
						{isLoggedIn && discountPercentage > 0 ? (
							<div className="flex flex-col">
								<span className="text-sm line-through text-gray-500">
									{formattedOriginalPrice}
								</span>
								<span className="text-lg font-bold text-[#48ccbc]">
									{formattedDiscountedPrice}
								</span>
								<span className="text-xs text-[#48ccbc]">
									{discountPercentage}% off
								</span>
							</div>
						) : (
							<span className="text-lg font-bold text-[#48ccbc]">
								{formattedOriginalPrice}
							</span>
						)}
					</div>

					{isProductsPage ? (
						<div className="flex flex-col items-end">
							<div className="flex items-center">
								{quantity > 0 ? (
									<>
										<span className="text-sm font-medium bg-[#48ccbc]/20 text-[#48ccbc] px-2 py-1 rounded-l-md">
											{quantity}
										</span>
										<button
											onClick={handleAddToCart}
											className={`p-2 rounded-r-md ${
												addedToCart
													? "bg-[#48ccbc] text-white"
													: "bg-[#48ccbc]/20 text-[#48ccbc] hover:bg-[#48ccbc] hover:text-white"
											} transition-colors`}
											aria-label="Add to cart"
										>
											<ShoppingCart size={18} />
										</button>
									</>
								) : (
									<button
										onClick={handleAddToCart}
										className={`p-2 rounded-full ${
											addedToCart
												? "bg-[#48ccbc] text-white"
												: "bg-[#48ccbc]/20 text-[#48ccbc] hover:bg-[#48ccbc] hover:text-white"
										} transition-colors`}
										aria-label="Add to cart"
									>
										<ShoppingCart size={18} />
									</button>
								)}
							</div>

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
			</Link>
		</div>
	);
}
