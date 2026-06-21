"use client";

import { Star } from "lucide-react";

interface ProductCardReviewProps {
	averageRating: number;
	reviewCount: number;
}

export default function ProductCardReview({
	averageRating,
	reviewCount,
}: ProductCardReviewProps) {
	return (
		<div className="mt-1 mb-2">
			<div className="flex items-center">
				<div className="flex items-center border border-transparent p-1 rounded bg-white hover:border-blue-200 transition-colors">
					{[1, 2, 3, 4, 5].map((star) => (
						<Star
							key={star}
							size={16}
							className={`${
								star <= Math.round(averageRating)
									? "text-[#48ccbc] fill-[#48ccbc]"
									: "text-gray-300"
							}`}
						/>
					))}
				</div>
				<span className="text-sm text-gray-500 ml-1">
					{reviewCount > 0 ? `(${reviewCount})` : "No reviews"}
				</span>
			</div>
		</div>
	);
}
