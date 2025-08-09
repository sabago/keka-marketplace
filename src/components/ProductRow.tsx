import { useAuth } from "@/lib/authContext";
import { useCartStore } from "@/lib/useCart";
import { useSettings, formatCurrency } from "@/lib/useSettings";
// import { Product } from "@prisma/client";
import { Star } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import ReviewForm from "./ReviewForm";
import { Product } from "@/app/page";
import Image from "next/image";

// ProductRow component for the product listing
export const ProductRow = ({
	id,
	title,
	description,
	price,
	thumbnail,
	averageRating = 0,
	reviewCount = 0,
}: Product) => {
	const router = useRouter();

	// Function to navigate to product details page
	const navigateToProduct = (e: React.MouseEvent) => {
		// Don't navigate if clicking on the add to cart button or review form
		if (
			(e.target as HTMLElement).closest("button") ||
			(e.target as HTMLElement).closest(".review-form-trigger")
		) {
			return;
		}
		router.push(`/products/${id}`);
	};
	const addItem = useCartStore((state) => state.addItem);
	const items = useCartStore((state) => state.items);
	const [addedToCart, setAddedToCart] = useState(false);
	const [showReviewForm, setShowReviewForm] = useState(false);
	const { settings } = useSettings();
	const { isLoggedIn } = useAuth();

	// Check if product is already in cart and get its quantity
	const cartItem = items.find((item) => item.id === id);
	const quantity = cartItem ? cartItem.quantity : 0;

	// Calculate discounted price if user is logged in
	const discountPercentage = isLoggedIn ? settings.memberDiscountPercentage : 0;
	const discountedPrice = price - (price * discountPercentage) / 100;

	// Handle add to cart
	const handleAddToCart = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Use discounted price if applicable
		const finalPrice = isLoggedIn ? discountedPrice : price;

		addItem({
			id,
			title,
			price: finalPrice,
			thumbnail: thumbnail || "/images/dummy.jpeg",
		});

		setAddedToCart(true);
	};

	return (
		<div
			className="flex flex-col md:flex-row bg-white rounded-lg shadow-md p-4 mb-4 cursor-pointer hover:shadow-lg transition-shadow"
			onClick={navigateToProduct}
		>
			<div className="md:w-1/4 mb-4 md:mb-0">
				<div
					className="bg-gray-200 rounded-md h-40 w-full flex items-center justify-center relative"
					style={{ position: "relative" }}
				>
					<Image
						src={thumbnail}
						alt={title}
						fill
						sizes="(max-width: 768px) 100vw, 25vw"
						className="rounded-md object-cover"
						onError={(e) => {
							// Fallback for image loading errors
							const target = e.target as HTMLImageElement;
							target.onerror = null;
							target.style.display = "none";
							const parent = target.parentElement;
							if (parent) {
								const fallback = document.createElement("span");
								fallback.className = "text-gray-500";
								fallback.textContent = "Product Image";
								parent.appendChild(fallback);
							}
						}}
					/>
				</div>
			</div>
			<div className="md:w-3/4 md:pl-6">
				<h3 className="text-lg font-semibold mb-2">{title}</h3>
				<p className="text-gray-600 mb-3">{description}</p>
				<div
					className="flex items-center mb-2 cursor-pointer hover:opacity-80 transition-opacity review-form-trigger"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setShowReviewForm(true);
					}}
					title="Click to write a review"
				>
					<div className="flex text-[#48ccbc] mr-2">
						{[...Array(5)].map((_, i) => (
							<Star
								key={i}
								className="h-4 w-4"
								fill={i < Math.floor(averageRating) ? "currentColor" : "none"}
								strokeWidth={i < Math.floor(averageRating) ? 0 : 2}
							/>
						))}
					</div>
					<span className="text-sm text-gray-600">
						{averageRating} ({reviewCount} reviews)
					</span>
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
				<div className="flex items-center justify-between mt-4">
					<div>
						{isLoggedIn && discountPercentage > 0 ? (
							<div>
								<span className="text-xl font-bold text-[#48ccbc]">
									{formatCurrency(discountedPrice, settings.currency)}
								</span>
								<span className="text-sm text-gray-500 line-through ml-2">
									{formatCurrency(price, settings.currency)}
								</span>
								<span className="ml-2 bg-[#48ccbc]/20 text-[#48ccbc] text-xs px-2 py-0.5 rounded-full">
									{discountPercentage}% off
								</span>
							</div>
						) : (
							<span className="text-xl font-bold text-[#48ccbc]">
								{formatCurrency(price, settings.currency)}
							</span>
						)}
					</div>
					<button
						onClick={handleAddToCart}
						className={`px-4 py-2 rounded ${
							addedToCart || quantity > 0
								? "bg-[#48ccbc] text-white"
								: "hover:bg-blue-700 bg-[#0B4F96] text-white"
						}`}
					>
						{quantity > 0
							? `${quantity} in Cart`
							: addedToCart
							? "Added!"
							: "Add to Cart"}
					</button>
				</div>
			</div>
		</div>
	);
};
