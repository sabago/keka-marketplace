"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, Star } from "lucide-react";

interface Review {
	id: string;
	productId: string;
	productTitle?: string;
	customerName: string;
	customerEmail: string;
	rating: number;
	comment: string;
	approved: boolean;
	createdAt: string;
}

export default function AdminReviewsPage() {
	const [reviews, setReviews] = useState<Review[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | "pending" | "approved">(
		"pending"
	);

	useEffect(() => {
		const fetchReviews = async () => {
			try {
				setLoading(true);
				const response = await fetch("/api/admin/reviews");

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

		fetchReviews();
	}, []);

	const handleApprove = async (reviewId: string) => {
		try {
			const response = await fetch(`/api/admin/reviews/${reviewId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ approved: true }),
			});

			if (!response.ok) {
				throw new Error("Failed to approve review");
			}

			// Update the local state
			setReviews(
				reviews.map((review) =>
					review.id === reviewId ? { ...review, approved: true } : review
				)
			);
		} catch (err) {
			console.error("Error approving review:", err);
			setError("Failed to approve review. Please try again.");
		}
	};

	const handleReject = async (reviewId: string) => {
		try {
			const response = await fetch(`/api/admin/reviews/${reviewId}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to delete review");
			}

			// Update the local state
			setReviews(reviews.filter((review) => review.id !== reviewId));
		} catch (err) {
			console.error("Error deleting review:", err);
			setError("Failed to delete review. Please try again.");
		}
	};

	const filteredReviews = reviews.filter((review) => {
		if (filter === "all") return true;
		if (filter === "pending") return !review.approved;
		if (filter === "approved") return review.approved;
		return true;
	});

	if (loading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Back button */}
			<div className="mb-6">
				<Link
					href="/admin"
					className="text-blue-600 hover:text-blue-800 flex items-center"
				>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back to Dashboard
				</Link>
			</div>

			<h1 className="text-3xl font-bold mb-8">Manage Reviews</h1>

			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
					{error}
				</div>
			)}

			{/* Filter tabs */}
			<div className="flex border-b border-gray-200 mb-6">
				<button
					className={`py-2 px-4 font-medium ${
						filter === "pending"
							? "text-blue-600 border-b-2 border-blue-600"
							: "text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setFilter("pending")}
				>
					Pending
				</button>
				<button
					className={`py-2 px-4 font-medium ${
						filter === "approved"
							? "text-blue-600 border-b-2 border-blue-600"
							: "text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setFilter("approved")}
				>
					Approved
				</button>
				<button
					className={`py-2 px-4 font-medium ${
						filter === "all"
							? "text-blue-600 border-b-2 border-blue-600"
							: "text-gray-500 hover:text-gray-700"
					}`}
					onClick={() => setFilter("all")}
				>
					All Reviews
				</button>
			</div>

			{filteredReviews.length === 0 ? (
				<div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
					No {filter === "all" ? "" : filter} reviews found.
				</div>
			) : (
				<div className="bg-white rounded-lg shadow-md overflow-hidden">
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
										Customer
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Rating
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Comment
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Date
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Status
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
								{filteredReviews.map((review) => (
									<tr key={review.id}>
										<td className="px-6 py-4 whitespace-nowrap">
											<Link
												href={`/products/${review.productId}`}
												className="text-blue-600 hover:text-blue-800"
											>
												{review.productTitle || review.productId}
											</Link>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{review.customerName}
											</div>
											<div className="text-sm text-gray-500">{review.customerEmail}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												{[1, 2, 3, 4, 5].map((star) => (
													<Star
														key={star}
														size={16}
														className={`${
															star <= review.rating
																? "text-yellow-400 fill-yellow-400"
																: "text-gray-300"
														}`}
													/>
												))}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900 max-w-xs truncate">
												{review.comment}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(review.createdAt).toLocaleDateString()}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
													review.approved
														? "bg-green-100 text-green-800"
														: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{review.approved ? "Approved" : "Pending"}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											{!review.approved && (
												<>
													<button
														onClick={() => handleApprove(review.id)}
														className="text-green-600 hover:text-green-900 mr-3"
													>
														<Check size={18} />
													</button>
													<button
														onClick={() => handleReject(review.id)}
														className="text-red-600 hover:text-red-900"
													>
														<X size={18} />
													</button>
												</>
											)}
											{review.approved && (
												<button
													onClick={() => handleReject(review.id)}
													className="text-red-600 hover:text-red-900"
												>
													<X size={18} />
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
