"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag, ArrowRight, Loader2 } from "lucide-react";
import { useSettings } from "@/lib/useSettings";

// Define category type
interface Category {
	id: string;
	name: string;
	slug: string;
	productCount: number;
}

export default function CategoriesPage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const { settings } = useSettings();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	// Fetch categories
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch categories
				const categoriesResponse = await fetch("/api/categories");
				if (!categoriesResponse.ok) {
					throw new Error("Failed to fetch categories");
				}
				const categoriesData = await categoriesResponse.json();

				setCategories(categoriesData.categories || []);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load categories. Please try again later.");
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Handle category click
	const handleCategoryClick = (categoryId: string) => {
		router.push(`/products?categoryId=${categoryId}`);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-2">Product Categories</h1>
			<p className="text-gray-600 mb-8">{settings.siteDescription}</p>

			{/* Loading state */}
			{loading && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
					<span className="ml-2 text-gray-600">Loading categories...</span>
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
					<p>{error}</p>
				</div>
			)}

			{/* Categories grid */}
			{!loading && !error && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{categories.map((category) => (
						<div
							key={category.id}
							className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
							onClick={() => handleCategoryClick(category.id)}
						>
							<div className="p-6">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center">
										<Tag className="h-5 w-5 text-blue-600 mr-2" />
										<h2 className="text-xl font-semibold">{category.name}</h2>
									</div>
									<span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
										{category.productCount}{" "}
										{category.productCount === 1 ? "product" : "products"}
									</span>
								</div>
								<p className="text-gray-600 mb-4">
									Browse all {category.name.toLowerCase()} products in our marketplace.
								</p>
								<div className="flex justify-end">
									<Link
										href={`/products?categoryId=${category.id}`}
										className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
										onClick={(e) => e.stopPropagation()}
									>
										View Products
										<ArrowRight className="ml-1 h-4 w-4" />
									</Link>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Empty state */}
			{!loading && !error && categories.length === 0 && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<p className="text-gray-600 mb-4">No categories found.</p>
					<Link
						href="/products"
						className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Browse All Products
					</Link>
				</div>
			)}
		</div>
	);
}
