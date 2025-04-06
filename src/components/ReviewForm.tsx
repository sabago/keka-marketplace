"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface ReviewFormProps {
	productId: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	compact?: boolean; // For product card view (compact) vs product detail page (full)
}

export default function ReviewForm({
	productId,
	onSuccess,
	onCancel,
	compact = false,
}: ReviewFormProps) {
	const [rating, setRating] = useState<number>(0);
	const [hoverRating, setHoverRating] = useState<number>(0);
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [comment, setComment] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation(); // Stop event from bubbling up to parent Link
		setError(null);
		setIsSubmitting(true);

		// Validate form
		if (!rating) {
			setError("Please select a rating");
			setIsSubmitting(false);
			return;
		}

		if (!customerName.trim()) {
			setError("Please enter your name");
			setIsSubmitting(false);
			return;
		}

		if (!customerEmail.trim()) {
			setError("Please enter your email");
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await fetch(`/api/products/${productId}/reviews`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					rating,
					customerName,
					customerEmail,
					comment,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to submit review");
			}

			// Reset form
			setRating(0);
			setCustomerName("");
			setCustomerEmail("");
			setComment("");
			setSuccess(true);

			// Call onSuccess callback if provided
			if (onSuccess) {
				onSuccess();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unknown error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation(); // Stop event from bubbling up to parent Link
		if (onCancel) {
			onCancel();
		}
	};

	if (success) {
		return (
			<div
				className={`bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded ${
					compact ? "text-sm" : "mb-6"
				}`}
			>
				Thank you for your review! It will be visible after approval.
			</div>
		);
	}

	return (
		<div
			className={`${
				compact ? "text-sm" : "bg-white rounded-lg shadow-md p-6 mb-8"
			}`}
		>
			<h3
				className={`${
					compact ? "text-base font-semibold mb-2" : "text-xl font-semibold mb-4"
				}`}
			>
				Write a Review
			</h3>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit}>
				{/* Rating */}
				<div className={`mb-${compact ? "2" : "4"}`}>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Rating
					</label>
					<div className="flex items-center">
						{[1, 2, 3, 4, 5].map((star) => (
							<Star
								key={star}
								size={compact ? 18 : 24}
								className={`cursor-pointer ${
									star <= (hoverRating || rating)
										? "text-yellow-400 fill-yellow-400"
										: "text-gray-300"
								}`}
								onClick={() => setRating(star)}
								onMouseEnter={() => setHoverRating(star)}
								onMouseLeave={() => setHoverRating(0)}
							/>
						))}
					</div>
				</div>

				{/* Name */}
				<div className={`mb-${compact ? "2" : "4"}`}>
					<label
						htmlFor="customerName"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Your Name
					</label>
					<input
						type="text"
						id="customerName"
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
							compact ? "text-sm" : ""
						}`}
						value={customerName}
						onChange={(e) => setCustomerName(e.target.value)}
						disabled={isSubmitting}
						required
					/>
				</div>

				{/* Email */}
				<div className={`mb-${compact ? "2" : "4"}`}>
					<label
						htmlFor="customerEmail"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Your Email
					</label>
					<input
						type="email"
						id="customerEmail"
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
							compact ? "text-sm" : ""
						}`}
						value={customerEmail}
						onChange={(e) => setCustomerEmail(e.target.value)}
						disabled={isSubmitting}
						required
					/>
				</div>

				{/* Comment */}
				<div className={`mb-${compact ? "3" : "4"}`}>
					<label
						htmlFor="comment"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Your Review
					</label>
					<textarea
						id="comment"
						rows={compact ? 2 : 4}
						className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
							compact ? "text-sm" : ""
						}`}
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>

				{/* Buttons */}
				<div className="flex justify-end space-x-2">
					{onCancel && (
						<button
							type="button"
							onClick={handleCancel}
							className={`px-${compact ? "3" : "4"} py-${
								compact ? "1" : "2"
							} border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 ${
								compact ? "text-sm" : ""
							}`}
							disabled={isSubmitting}
						>
							Cancel
						</button>
					)}
					<button
						type="submit"
						className={`bg-blue-600 text-white px-${compact ? "3" : "4"} py-${
							compact ? "1" : "2"
						} rounded-lg hover:bg-blue-700 disabled:bg-blue-300 ${
							compact ? "text-sm" : ""
						}`}
						disabled={isSubmitting}
					>
						{isSubmitting ? "Submitting..." : "Submit Review"}
					</button>
				</div>
			</form>
		</div>
	);
}
