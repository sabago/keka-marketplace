"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";

// Define types
interface Product {
	id: string;
	title: string;
	description: string;
	price: number;
	thumbnail: string;
	averageRating?: number;
	reviewCount?: number;
}

interface Category {
	id: string;
	name: string;
	slug: string;
	productCount: number;
}

export default function Home() {
	const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch products and categories
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch products
				const productsResponse = await fetch("/api/products?limit=3");
				if (!productsResponse.ok) {
					throw new Error("Failed to fetch products");
				}
				const productsData = await productsResponse.json();

				// Fetch categories
				const categoriesResponse = await fetch("/api/categories");
				if (!categoriesResponse.ok) {
					throw new Error("Failed to fetch categories");
				}
				const categoriesData = await categoriesResponse.json();

				setFeaturedProducts(productsData.products || []);
				setCategories(categoriesData.categories || []);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load data");
				setLoading(false);
			}
		};

		fetchData();
	}, []);
	return (
		<div className="min-h-screen">
			{/* Hero Section */}
			<section className="bg-blue-600 text-white py-16 md:py-24">
				<div className="container mx-auto px-4">
					<div className="max-w-3xl">
						<h1 className="text-4xl md:text-5xl font-bold mb-6">
							Premium PDF Resources for Every Need
						</h1>
						<p className="text-xl mb-8">
							Browse our collection of high-quality PDF templates, guides, and
							resources to help you succeed in business, education, and more.
						</p>
						<Link
							href="/products"
							className="bg-white text-red-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors inline-flex items-center"
						>
							Browse All Products
							<ArrowRight className="ml-2 h-5 w-5" />
						</Link>
					</div>
				</div>
			</section>

			{/* Featured Products */}
			<section className="py-16">
				<div className="container mx-auto px-4">
					<div className="flex justify-between items-center mb-8">
						<h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
						<Link
							href="/products"
							className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
						>
							View All
							<ArrowRight className="ml-1 h-4 w-4" />
						</Link>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{featuredProducts.map((product) => (
							<ProductCard
								key={product.id}
								id={product.id}
								title={product.title}
								description={product.description}
								price={product.price}
								thumbnail={product.thumbnail}
								averageRating={product.averageRating}
								reviewCount={product.reviewCount}
							/>
						))}
					</div>
				</div>
			</section>

			{/* Categories */}
			<section className="py-16 bg-gray-50">
				<div className="container mx-auto px-4">
					<h2 className="text-2xl md:text-3xl font-bold mb-8">Browse by Category</h2>

					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						</div>
					) : error ? (
						<div className="text-center py-12">
							<p className="text-red-500">{error}</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
							{categories.map((category) => (
								<Link
									key={category.id}
									href={`/products?categoryId=${category.id}`}
									className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
								>
									<div className="relative h-40 w-full bg-gray-200">
										<div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
											<h3 className="text-white text-xl font-bold">{category.name}</h3>
										</div>
									</div>
									<div className="p-4 text-center">
										<p className="text-gray-600">{category.productCount} Products</p>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</section>

			{/* Call to Action */}
			<section className="py-16 bg-blue-50">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-2xl md:text-3xl font-bold mb-4">
						Ready to Get Started?
					</h2>
					<p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
						Browse our collection of premium PDF resources and find the perfect
						templates and guides for your needs.
					</p>
					<Link
						href="/products"
						className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Explore All Products
					</Link>
				</div>
			</section>
		</div>
	);
}
