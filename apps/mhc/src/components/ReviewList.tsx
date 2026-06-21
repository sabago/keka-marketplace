"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import ReviewForm from "./ReviewForm";

interface Review {
	id: string;
	customerName: string;
	rating: number;
	comment: string;
	createdAt: string;
}

interface ReviewListProps {
	productId: string;
}

export default function ReviewList({ productId }: ReviewListProps) {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showReviewForm, setShowReviewForm] = useState(false);

	// Function to fetch reviews
	const fetchReviews = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/products/${productId}/reviews`);

			if (!response.ok) {
				throw new Error("Failed to fetch reviews");
			}

			const data = await response.json();
			setReviews(data.reviews || []);
		} catch (err) {
			console.error("Error fetching reviews:", err);
			setError("Failed to load reviews. Please try again later.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchReviews();
	}, [productId]);

	if (loading) {
		return <div className="text-center py-4">Loading reviews...</div>;
	}

	if (error) {
		return <div className="text-red-500 py-4">{error}</div>;
	}

	const handleReviewSuccess = () => {
		// Hide the form after successful submission
		setShowReviewForm(false);
		// Refresh reviews
		fetchReviews();
	};

	if (reviews.length === 0) {
		return (
			<div>
				<div className="text-gray-500 py-4">
					No reviews yet. Be the first to review this product!
				</div>

				{/* Stars to click for review */}
				<div className="mt-4">
					<div
						className="flex items-center cursor-pointer"
						onClick={() => setShowReviewForm(!showReviewForm)}
					>
						{[1, 2, 3, 4, 5].map((star) => (
							<Star
								key={star}
								size={24}
								className="text-gray-300 hover:text-[#48ccbc]"
							/>
						))}
						<span className="ml-2 text-sm text-gray-600">Click to rate</span>
					</div>
				</div>

				{/* Review form */}
				{showReviewForm && (
					<div className="mt-4 bg-gray-50 p-4 rounded-lg">
						<ReviewForm
							productId={productId}
							onSuccess={handleReviewSuccess}
							onCancel={() => setShowReviewForm(false)}
						/>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Average rating and review form toggle */}
			<div className="flex items-center mb-6">
				<div
					className="flex items-center cursor-pointer"
					onClick={() => setShowReviewForm(!showReviewForm)}
				>
					{[1, 2, 3, 4, 5].map((star) => {
						// Calculate average rating
						const averageRating =
							reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

						return (
							<Star
								key={star}
								size={24}
								className={`${
									star <= Math.round(averageRating)
										? "text-[#48ccbc] fill-[#48ccbc]"
										: "text-gray-300"
								}`}
							/>
						);
					})}
				</div>
				<span className="ml-2 text-sm">
					{reviews.length} {reviews.length === 1 ? "review" : "reviews"}
				</span>
			</div>

			{/* Review form */}
			{showReviewForm && (
				<div className="mb-8 bg-gray-50 p-4 rounded-lg">
					<ReviewForm
						productId={productId}
						onSuccess={handleReviewSuccess}
						onCancel={() => setShowReviewForm(false)}
					/>
				</div>
			)}

			{reviews.map((review) => (
				<div
					key={review.id}
					className="border-b border-gray-200 pb-4 mb-4 last:border-0"
				>
					<div className="flex items-center mb-2">
						<div className="flex mr-2">
							{[1, 2, 3, 4, 5].map((star) => (
								<Star
									key={star}
									size={16}
									className={`${
										star <= review.rating
											? "text-[#48ccbc] fill-[#48ccbc]"
											: "text-gray-300"
									}`}
								/>
							))}
						</div>
						<span className="font-medium">{review.customerName}</span>
						<span className="text-gray-500 text-sm ml-auto">
							{new Date(review.createdAt).toLocaleDateString()}
						</span>
					</div>

					<p className="text-gray-700">{review.comment}</p>
				</div>
			))}
		</div>
	);
}
