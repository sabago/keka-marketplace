"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSettings } from "@/lib/useSettings";
import PageLayout from "@/components/PageLayout";
import ProductCard from "@/components/ProductCard";
import { Tag, X } from "lucide-react";

// Component that uses useSearchParams
function ProductsWithParams({
	onCategoryChange,
	onSearchChange,
}: {
	onCategoryChange: (categoryId: string | null) => void;
	onSearchChange: (search: string | null) => void;
}) {
	const searchParams = useSearchParams();
	const categoryId = searchParams.get("categoryId");
	const search = searchParams.get("search");

	useEffect(() => {
		onCategoryChange(categoryId);
		onSearchChange(search);
	}, [categoryId, search, onCategoryChange, onSearchChange]);

	return null;
}

// Define types
interface Product {
	id: string;
	title: string;
	description: string;
	price: number;
	thumbnail: string;
	averageRating?: number;
	reviewCount?: number;
	sales?: number;
	createdAt?: string;
}

interface Category {
	id: string;
	name: string;
	slug: string;
	productCount: number;
}

// Updated ProductRow component instead of ProductCard
// const ProductRow = ({
// 	id,
// 	title,
// 	description,
// 	price,
// 	thumbnail,
// 	averageRating = 0,
// 	reviewCount = 0,
// }: Product) => {
// 	const router = useRouter();

// 	// Function to navigate to product details page
// 	const navigateToProduct = (e: React.MouseEvent) => {
// 		// Don't navigate if clicking on the add to cart button or review form
// 		if (
// 			(e.target as HTMLElement).closest("button") ||
// 			(e.target as HTMLElement).closest(".review-form-trigger")
// 		) {
// 			return;
// 		}
// 		router.push(`/products/${id}`);
// 	};
// 	const addItem = useCartStore((state) => state.addItem);
// 	const items = useCartStore((state) => state.items);
// 	const [addedToCart, setAddedToCart] = useState(false);
// 	const [showReviewForm, setShowReviewForm] = useState(false);
// 	const { settings } = useSettings();
// 	const { isLoggedIn } = useAuth();

// 	// Check if product is already in cart and get its quantity
// 	const cartItem = items.find((item) => item.id === id);
// 	const quantity = cartItem ? cartItem.quantity : 0;

// 	// Calculate discounted price if user is logged in
// 	const discountPercentage = isLoggedIn ? settings.memberDiscountPercentage : 0;
// 	const discountedPrice = price - (price * discountPercentage) / 100;

// 	// Handle add to cart
// 	const handleAddToCart = (e: React.MouseEvent) => {
// 		e.preventDefault();
// 		e.stopPropagation();

// 		// Use discounted price if applicable
// 		const finalPrice = isLoggedIn ? discountedPrice : price;

// 		addItem({
// 			id,
// 			title,
// 			price: finalPrice,
// 			thumbnail: thumbnail || "/images/dummy.jpeg",
// 		});

// 		setAddedToCart(true);

// 		// Reset the added to cart state after 2 seconds
// 		// setTimeout(() => {
// 		// 	setAddedToCart(false);
// 		// }, 2000);
// 	};
// 	return (
// 		<div
// 			className="flex flex-col md:flex-row bg-white rounded-lg shadow-md p-4 mb-4 cursor-pointer hover:shadow-lg transition-shadow"
// 			onClick={navigateToProduct}
// 		>
// 			<div className="md:w-1/4 mb-4 md:mb-0">
// 				<div
// 					className="bg-gray-200 rounded-md h-40 w-full flex items-center justify-center relative"
// 					style={{ position: "relative" }}
// 				>
// 					<Image
// 						src={thumbnail}
// 						alt={title}
// 						fill
// 						sizes="(max-width: 768px) 100vw, 25vw"
// 						className="rounded-md object-cover"
// 						onError={(e) => {
// 							// Fallback for image loading errors
// 							const target = e.target as HTMLImageElement;
// 							target.onerror = null;
// 							target.style.display = "none";
// 							const parent = target.parentElement;
// 							if (parent) {
// 								const fallback = document.createElement("span");
// 								fallback.className = "text-gray-500";
// 								fallback.textContent = "Product Image";
// 								parent.appendChild(fallback);
// 							}
// 						}}
// 					/>
// 				</div>
// 			</div>
// 			<div className="md:w-3/4 md:pl-6">
// 				<h3 className="text-lg font-semibold mb-2">{title}</h3>
// 				<p className="text-gray-600 mb-3">{description}</p>
// 				<div
// 					className="flex items-center mb-2 cursor-pointer hover:opacity-80 transition-opacity review-form-trigger"
// 					onClick={(e) => {
// 						e.preventDefault();
// 						e.stopPropagation();
// 						setShowReviewForm(true);
// 					}}
// 					title="Click to write a review"
// 				>
// 					<div className="flex text-yellow-400 mr-2">
// 						{[...Array(5)].map((_, i) => (
// 							<Star
// 								key={i}
// 								className="h-4 w-4"
// 								fill={i < Math.floor(averageRating) ? "currentColor" : "none"}
// 								strokeWidth={i < Math.floor(averageRating) ? 0 : 2}
// 							/>
// 						))}
// 					</div>
// 					<span className="text-sm text-gray-600">
// 						{averageRating} ({reviewCount} reviews)
// 					</span>
// 				</div>

// 				{/* Review Form Modal */}
// 				{showReviewForm && (
// 					<div
// 						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
// 						onClick={(e) => {
// 							e.preventDefault();
// 							e.stopPropagation();
// 							setShowReviewForm(false);
// 						}}
// 					>
// 						<div
// 							className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
// 							onClick={(e) => e.stopPropagation()}
// 						>
// 							<div className="flex justify-between items-center mb-4">
// 								<h2 className="text-xl font-semibold">Write a Review for {title}</h2>
// 								<button
// 									onClick={(e) => {
// 										e.preventDefault();
// 										e.stopPropagation();
// 										setShowReviewForm(false);
// 									}}
// 									className="text-gray-500 hover:text-gray-700"
// 								>
// 									✕
// 								</button>
// 							</div>
// 							<ReviewForm
// 								productId={id}
// 								onSuccess={() => setShowReviewForm(false)}
// 								onCancel={() => setShowReviewForm(false)}
// 								compact={true}
// 							/>
// 						</div>
// 					</div>
// 				)}
// 				<div className="flex items-center justify-between mt-4">
// 					<div>
// 						{isLoggedIn && discountPercentage > 0 ? (
// 							<div>
// 								<span className="text-xl font-bold text-[#48ccbc]">
// 									{formatCurrency(discountedPrice, settings.currency)}
// 								</span>
// 								<span className="text-sm text-gray-500 line-through ml-2">
// 									{formatCurrency(price, settings.currency)}
// 								</span>
// 								<span className="ml-2 bg-[#48ccbc]/20 text-[#48ccbc] text-xs px-2 py-0.5 rounded-full">
// 									{discountPercentage}% off
// 								</span>
// 							</div>
// 						) : (
// 							<span className="text-xl font-bold text-[#48ccbc]">
// 								{formatCurrency(price, settings.currency)}
// 							</span>
// 						)}
// 					</div>
// 					<button
// 						onClick={handleAddToCart}
// 						className={`px-4 py-2 rounded ${
// 							addedToCart || quantity > 0
// 								? "bg-[#48ccbc] text-white"
// 								: "hover:bg-blue-700 bg-[#0B4F96] text-white"
// 						}`}
// 					>
// 						{quantity > 0
// 							? `${quantity} in Cart`
// 							: addedToCart
// 							? "Added!"
// 							: "Add to Cart"}
// 					</button>
// 				</div>
// 			</div>
// 		</div>
// 	);
// };

export default function ProductsPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [activeCategory, setActiveCategory] = useState<Category | null>(null);
	const { settings } = useSettings();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortOption, setSortOption] = useState("featured");
	const [searchTerm, setSearchTerm] = useState("");

	const router = useRouter();
	const [categoryId, setCategoryId] = useState<string | null>(null);

	// Handle category change from the ProductsWithParams component
	const handleCategoryChange = (newCategoryId: string | null) => {
		setCategoryId(newCategoryId);
	};

	// Handle search change from the ProductsWithParams component
	const handleSearchChange = (newSearch: string | null) => {
		setSearchTerm(newSearch || "");
	};

	// Function to fetch products
	const fetchProducts = async () => {
		setLoading(true);
		try {
			// Construct the products API URL with any filters
			let productsUrl = "/api/products";
			const params = new URLSearchParams();

			if (categoryId) {
				params.append("categoryId", categoryId);
			}

			if (searchTerm) {
				params.append("search", searchTerm);
			}

			if (params.toString()) {
				productsUrl += `?${params.toString()}`;
			}

			// Fetch products
			const productsResponse = await fetch(productsUrl, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-cache",
				},
			});

			if (!productsResponse.ok) {
				throw new Error("Failed to fetch products");
			}

			const productsData = await productsResponse.json();

			setProducts(productsData.products || []);
			setLoading(false);
		} catch (err) {
			console.error("Error fetching products:", err);
			setError("Failed to load products. Please try again later.");
			setLoading(false);
		}
	};

	// Fetch categories and initial products
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch categories
				const categoriesResponse = await fetch("/api/categories");
				if (categoriesResponse.ok) {
					const categoriesData = await categoriesResponse.json();
					setCategories(categoriesData.categories || []);

					// Set active category if categoryId is provided
					if (categoryId) {
						const category = categoriesData.categories.find(
							(cat: Category) => cat.id === categoryId
						);
						if (category) {
							setActiveCategory(category);
						}
					}
				}

				// Fetch products
				fetchProducts();
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load products. Please try again later.");
				setLoading(false);
			}
		};

		fetchData();
	}, [categoryId, searchTerm]);

	// Handle sort change
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSortOption(e.target.value);
	};

	// Handle category filter
	const handleCategoryFilter = (category: Category) => {
		router.push(`/products?categoryId=${category.id}`);
	};

	// Clear category filter
	const clearCategoryFilter = () => {
		router.push("/products");
		setActiveCategory(null);
	};

	// Sort products based on selected option
	const sortedProducts = [...products].sort((a, b) => {
		switch (sortOption) {
			case "newest":
				return (
					new Date(b.createdAt || "").getTime() -
					new Date(a.createdAt || "").getTime()
				);
			case "price-low":
				return a.price - b.price;
			case "price-high":
				return b.price - a.price;
			case "rating":
				return (b.averageRating || 0) - (a.averageRating || 0);
			default:
				return 0;
		}
	});

	return (
		<PageLayout>
			<div className="container mx-auto px-4 py-8">
				{/* Use the ProductsWithParams component wrapped in Suspense */}
				<Suspense fallback={null}>
					<ProductsWithParams
						onCategoryChange={handleCategoryChange}
						onSearchChange={handleSearchChange}
					/>
				</Suspense>

				<h1 className="text-3xl font-bold mb-2">
					{activeCategory ? `${activeCategory.name} Products` : "All Products"}
				</h1>
				<p className="text-gray-600 mb-8">
					{activeCategory
						? `Browse our selection of ${activeCategory.name.toLowerCase()} products.`
						: settings.siteDescription}
				</p>

				<div className="flex flex-col lg:flex-row gap-8">
					{/* Sidebar with filters */}
					<div className="lg:w-1/4">
						<div className="bg-white rounded-lg shadow-md p-6 mb-6">
							<h2 className="text-lg font-semibold mb-4">Categories</h2>
							<div className="space-y-2">
								{categories
									.filter((category) => !category.name.startsWith("Hidden Category"))
									.map((category) => (
										<div
											key={category.id}
											onClick={() => handleCategoryFilter(category)}
											className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
												activeCategory?.id === category.id
													? "bg-blue-100 text-blue-800"
													: "hover:bg-gray-100"
											}`}
										>
											<div className="flex items-center">
												<Tag className="h-4 w-4 mr-2 text-gray-500" />
												<span>{category.name}</span>
											</div>
											<span className="text-xs text-gray-500">
												({category.productCount})
											</span>
										</div>
									))}
							</div>
						</div>
					</div>

					{/* Product list */}
					<div className="lg:w-3/4">
						{/* Active filters */}
						<div className="mb-6">
							<div className="flex flex-wrap items-center gap-2">
								{searchTerm && (
									<div className="flex items-center bg-[#0B4F96] text-blue-800 px-3 py-1 rounded-full text-sm">
										<span className="mr-1">Search: {searchTerm}</span>
										<button
											onClick={() => {
												router.push("/products");
											}}
											className="text-blue-800 hover:text-blue-600"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								)}

								{activeCategory && (
									<div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
										<span className="mr-1">Category: {activeCategory.name}</span>
										<button
											onClick={clearCategoryFilter}
											className="text-blue-800 hover:text-blue-600"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								)}
							</div>
						</div>

						{/* Sort options */}
						<div className="flex justify-between items-center mb-6">
							<p className="text-gray-600">
								Showings {products.length}{" "}
								{activeCategory ? activeCategory.name.toLowerCase() : ""} products
							</p>
							<div className="flex items-center">
								<label htmlFor="sort" className="text-sm text-gray-600 mr-2">
									Sort by:
								</label>
								<select
									id="sort"
									className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									value={sortOption}
									onChange={handleSortChange}
								>
									<option value="featured">Featured</option>
									<option value="newest">Newest</option>
									<option value="price-low">Price: Low to High</option>
									<option value="price-high">Price: High to Low</option>
									<option value="rating">Highest Rated</option>
								</select>
							</div>
						</div>

						{/* Loading state */}
						{loading && (
							<div className="bg-white rounded-lg shadow-md p-8 text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto mb-4"></div>
								<p className="text-gray-600">Loading products...</p>
							</div>
						)}

						{/* Error state */}
						{error && (
							<div className="bg-white rounded-lg shadow-md p-8 text-center">
								<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
									<p>{error}</p>
								</div>
								<button
									onClick={() => window.location.reload()}
									className="bg-[#0B4F96] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
								>
									Try Again
								</button>
							</div>
						)}

						{/* Products as rows instead of grid */}
						{!loading && !error && (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
								{sortedProducts.map((product) => (
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

								{sortedProducts.length === 0 && (
									<div className="text-center py-8 text-gray-500">
										{activeCategory
											? `No ${activeCategory.name.toLowerCase()} products found.`
											: "No products found. Try a different search term."}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</PageLayout>
	);
}
