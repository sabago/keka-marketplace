"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useAuth } from "@/lib/authContext";
import { useSettings } from "@/lib/useSettings";

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
	const { isLoggedIn } = useAuth();
	const { settings } = useSettings();

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
			{/* Login banner for non-logged in users */}
			{!isLoggedIn && settings.memberDiscountPercentage > 0 && (
				<div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 container mx-auto mt-4 rounded-md shadow-sm">
					<div className="flex items-center">
						<LogIn className="h-6 w-6 text-blue-500 mr-3" />
						<div>
							<h3 className="font-medium text-blue-800">Member Discount Available!</h3>
							<p className="text-blue-600">
								Log in to receive a {settings.memberDiscountPercentage}% discount on all
								products.{" "}
								<a
									href="https://masteringhomecare.com/login-custom/"
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium underline hover:text-blue-800"
								>
									Login now
								</a>
							</p>
						</div>
					</div>
				</div>
			)}
			{/* Hero Section */}
			<section
				style={{ backgroundColor: "#48ccbc" }}
				className="text-white py-16 md:py-24"
			>
				<div className="container mx-auto px-4">
					<div className="flex flex-col md:flex-row items-center">
						<div className="md:w-1/2 md:pr-8">
							<h1 className="text-4xl md:text-5xl font-bold mb-6">
								Home Healthcare Resources & Tools
							</h1>
							<p className="text-xl mb-8">
								Access our comprehensive collection of clinical forms, training
								materials, compliance tools, and resources designed specifically for
								home healthcare agencies and professionals.
							</p>
							<Link
								href="/products"
								className="bg-white text-teal-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-flex items-center"
							>
								Browse All Products
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</div>
						<div className="md:w-1/2 mt-8 md:mt-0 flex justify-center">
							{/* Placeholder for healthcare image */}
							<div className="relative w-full max-w-md h-80 bg-white rounded-lg shadow-lg overflow-hidden">
								<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
									<div className="text-center p-6">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-16 w-16 mx-auto text-teal-500 mb-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
											/>
										</svg>
										<p className="text-gray-600">
											Healthcare professionals providing home care services
										</p>
										<p className="text-xs text-gray-500 mt-2">
											Replace with actual healthcare image
										</p>
									</div>
								</div>
							</div>
						</div>
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
							{categories
								.filter((category) => !category.name.startsWith("Hidden Category"))
								.map((category) => (
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
			{/* <section className="py-16 bg-blue-50">
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
			</section> */}
		</div>
	);
}
