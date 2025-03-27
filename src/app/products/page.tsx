"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { Star, Tag, X, LogIn } from "lucide-react";
import { useCartStore } from "@/lib/useCart";
import { useSearchParams, useRouter } from "next/navigation";
import { useSettings, formatCurrency } from "@/lib/useSettings";
import { useAuth } from "@/lib/authContext";

// Component that uses useSearchParams
function ProductsWithParams({
	onCategoryChange,
}: {
	onCategoryChange: (categoryId: string | null) => void;
}) {
	const searchParams = useSearchParams();
	const categoryId = searchParams.get("categoryId");

	useEffect(() => {
		onCategoryChange(categoryId);
	}, [categoryId, onCategoryChange]);

	return null;
}

// Define types
interface Product {
	id: string;
	title: string;
	description?: string;
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
const ProductRow = ({
	id,
	title,
	description,
	price,
	thumbnail,
	averageRating = 0,
	reviewCount = 0,
}: Product) => {
	const addItem = useCartStore((state) => state.addItem);
	const [addedToCart, setAddedToCart] = useState(false);
	const { settings } = useSettings();
	const { isLoggedIn } = useAuth();

	// Calculate discounted price if user is logged in
	const discountPercentage = isLoggedIn ? settings.memberDiscountPercentage : 0;
	const discountedPrice = price - (price * discountPercentage) / 100;

	// Handle add to cart
	const handleAddToCart = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Use discounted price if applicable
		const finalPrice = isLoggedIn ? discountedPrice : price;

		// Log before adding to cart
		console.log("Adding to cart:", { id, title, price: finalPrice, thumbnail });

		addItem({
			id,
			title,
			price: finalPrice,
			thumbnail: thumbnail || "/images/dummy.jpeg",
		});

		// Log cart state after adding item
		console.log("Cart state after adding item:", useCartStore.getState().items);
		console.log("Total items:", useCartStore.getState().getTotalItems());

		setAddedToCart(true);

		// Reset the added to cart state after 2 seconds
		// setTimeout(() => {
		// 	setAddedToCart(false);
		// }, 2000);
	};
	return (
		<div className="flex flex-col md:flex-row bg-white rounded-lg shadow-md p-4 mb-4">
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
				<div className="flex items-center mb-2">
					<div className="flex text-yellow-400 mr-2">
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
				<div className="flex items-center justify-between mt-4">
					<div>
						{isLoggedIn && discountPercentage > 0 ? (
							<div>
								<span className="text-xl font-bold text-green-600">
									{formatCurrency(discountedPrice, settings.currency)}
								</span>
								<span className="text-sm text-gray-500 line-through ml-2">
									{formatCurrency(price, settings.currency)}
								</span>
								<span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
									{discountPercentage}% off
								</span>
							</div>
						) : (
							<span className="text-xl font-bold">
								{formatCurrency(price, settings.currency)}
							</span>
						)}
					</div>
					<button
						onClick={handleAddToCart}
						className={`px-4 py-2 rounded ${
							addedToCart
								? "bg-green-600 text-white"
								: "bg-blue-600 hover:bg-blue-700 text-white"
						}`}
					>
						{addedToCart ? "Added!" : "Add to Cart"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default function ProductsPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [activeCategory, setActiveCategory] = useState<Category | null>(null);
	const { settings } = useSettings();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sortOption, setSortOption] = useState("featured");

	const router = useRouter();
	const [categoryId, setCategoryId] = useState<string | null>(null);

	// Handle category change from the ProductsWithParams component
	const handleCategoryChange = (newCategoryId: string | null) => {
		setCategoryId(newCategoryId);
	};

	// Fetch products, categories, and settings
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Construct the products API URL with any filters
				let productsUrl = "/api/products";
				const params = new URLSearchParams();

				if (categoryId) {
					params.append("categoryId", categoryId);
				}

				if (params.toString()) {
					productsUrl += `?${params.toString()}`;
				}

				// Fetch products
				const productsResponse = await fetch(productsUrl);
				if (!productsResponse.ok) {
					throw new Error("Failed to fetch products");
				}
				const productsData = await productsResponse.json();

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

				// Settings are now handled by the useSettings hook

				setProducts(productsData.products || []);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Failed to load products. Please try again later.");
				setLoading(false);
			}
		};

		fetchData();
	}, [categoryId]);

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

	// Get auth state
	const { isLoggedIn } = useAuth();

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Use the ProductsWithParams component wrapped in Suspense */}
			<Suspense fallback={null}>
				<ProductsWithParams onCategoryChange={handleCategoryChange} />
			</Suspense>

			{/* Login banner for non-logged in users */}
			{!isLoggedIn && settings.memberDiscountPercentage > 0 && (
				<div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md shadow-sm">
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
							{categories.map((category) => (
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
					{activeCategory && (
						<div className="mb-6">
							<div className="flex items-center">
								<span className="text-sm text-gray-600 mr-2">Filters:</span>
								<div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
									<span className="mr-1">Category: {activeCategory.name}</span>
									<button
										onClick={clearCategoryFilter}
										className="text-blue-800 hover:text-blue-600"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							</div>
						</div>
					)}
					{/* Sort options */}
					<div className="flex justify-between items-center mb-6">
						<p className="text-gray-600">
							Showing {products.length}{" "}
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
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
								className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
							>
								Try Again
							</button>
						</div>
					)}

					{/* Products as rows instead of grid */}
					{!loading && !error && (
						<div className="space-y-4">
							{sortedProducts.map((product) => (
								<ProductRow
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

					{/* Pagination */}
					{/* <div className="mt-12 flex justify-center">
						<nav className="flex items-center space-x-2">
							<button className="px-3 py-1 rounded-md border text-gray-500 hover:bg-gray-50">
								Previous
							</button>
							<button className="px-3 py-1 rounded-md bg-blue-600 text-white">
								1
							</button>
							<button className="px-3 py-1 rounded-md border text-gray-700 hover:bg-gray-50">
								2
							</button>
							<button className="px-3 py-1 rounded-md border text-gray-700 hover:bg-gray-50">
								3
							</button>
							<span className="px-2 text-gray-500">...</span>
							<button className="px-3 py-1 rounded-md border text-gray-700 hover:bg-gray-50">
								8
							</button>
							<button className="px-3 py-1 rounded-md border text-gray-700 hover:bg-gray-50">
								Next
							</button>
						</nav>
					</div> */}
				</div>
			</div>
		</div>
	);
}
