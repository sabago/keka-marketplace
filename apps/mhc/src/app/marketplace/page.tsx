"use client";
import { useState, useEffect, Suspense } from "react";
import { Tag, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSettings } from "@/lib/useSettings";
import ProductCard from "@/components/ProductCard";
import PageLayout from "@/components/PageLayout";
// import { useAdminAccess } from "@/lib/adminUtils";

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
export interface Product {
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

export default function Home() {
	const [allProducts, setAllProducts] = useState<Product[]>([]);
	// const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
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
			setAllProducts(productsData.products || []);

			// Set featured products to the top 3 products by sales or rating
			// const topProducts = [...(productsData.products || [])]
			// 	.sort((a, b) => {
			// 		// Sort by sales first, then by rating if sales are equal
			// 		if (b.sales !== a.sales) {
			// 			return (b.sales || 0) - (a.sales || 0);
			// 		}
			// 		return (b.averageRating || 0) - (a.averageRating || 0);
			// 	})
			// 	.slice(0, 3);

			// setFeaturedProducts(topProducts);
			setLoading(false);
		} catch (err) {
			console.error("Error fetching products:", err);
			setError("Failed to load products. Please try again later.");
			setLoading(false);
		}
	};

	// const { isLocalhost } = useAdminAccess();
	// useEffect(() => {
	// 	if (isLocalhost) return;
	// 	const checkAuthToken = () => {
	// 		// Replace this with your actual JWT or session check logic
	// 		const token = localStorage.getItem("authToken");
	// 		return !!token;
	// 	};

	// 	const isLoggedIn = checkAuthToken();

	// 	if (!isLoggedIn && !isLocalhost) {
	// 		window.location.href = "https://masteringhomecare.com/login-custom/";
	// 	}
	// }, []);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === "AUTH_STATUS") {
				// const isLoggedIn = event.data?.isLoggedIn;
				// if (!isLoggedIn) {
				// 	window.location.href = "https://masteringhomecare.com/login-custom/";
				// }
			}
		};

		window.addEventListener("message", handleMessage);

		// Ask parent for status
		if (window.parent !== window) {
			window.parent.postMessage({ type: "REQUEST_AUTH_STATUS" }, "*");
		}

		return () => window.removeEventListener("message", handleMessage);
	}, []);

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
		router.push(`/?categoryId=${category.id}`);
	};

	// Clear category filter
	const clearCategoryFilter = () => {
		router.push("/");
		setActiveCategory(null);
	};

	// Sort products based on selected option
	const sortedProducts = [...allProducts].sort((a, b) => {
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
			{/* Use the ProductsWithParams component wrapped in Suspense */}
			<Suspense fallback={null}>
				<ProductsWithParams
					onCategoryChange={handleCategoryChange}
					onSearchChange={handleSearchChange}
				/>
			</Suspense>

			{/* Featured Products with Sidebar */}
			<section className="py-16">
				<div className="container mx-auto px-4">
					<div className="flex flex-col lg:flex-row gap-8">
						{/* Categories Sidebar */}
						<div className="lg:w-1/4">
							<h2 className="text-xl font-semibold mb-4">Categories</h2>
							<div className="bg-white rounded-lg shadow-md p-6 mb-6">
								<div className="space-y-2">
									{loading ? (
										<div className="flex items-center justify-center py-4">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B4F96]"></div>
										</div>
									) : error ? (
										<div className="text-center py-4">
											<p className="text-red-500">{error}</p>
										</div>
									) : (
										categories
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
											))
									)}
								</div>
							</div>
						</div>

						{/* Main Content Area */}
						<div className="lg:w-3/4">
							{/* Featured Products Section */}
							{/* {!categoryId && !searchTerm && (
								<div className="mb-12">
									<div className="flex justify-between items-center mb-6">
										<h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
										{featuredProducts.map((product) => (
											<ProductCard
												key={product.id}
												id={product.id}
												title={product.title}
												description={product.description || ""}
												price={product.price}
												thumbnail={product.thumbnail}
												averageRating={product.averageRating}
												reviewCount={product.reviewCount}
											/>
										))}
									</div>
								</div>
							)} */}

							{/* All Products Section */}
							<div>
								<h2 className="text-2xl md:text-3xl font-bold mb-2">
									{activeCategory ? `${activeCategory.name} Products` : "All Products"}
								</h2>
								<p className="text-gray-600 mb-8">
									{activeCategory
										? `Browse our selection of ${activeCategory.name.toLowerCase()} products.`
										: settings.siteDescription}
								</p>

								{/* Active filters */}
								<div className="mb-6">
									<div className="flex flex-wrap items-center gap-2">
										{searchTerm && (
											<div className="flex items-center bg-[#0B4F96] text-blue-800 px-3 py-1 rounded-full text-sm">
												<span className="mr-1">Search: {searchTerm}</span>
												<button
													onClick={() => {
														router.push("/");
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
										Showing {allProducts.length}{" "}
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

								{/* Products as rows */}
								{!loading && !error && (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
										{sortedProducts.map((product) => (
											<ProductCard
												key={product.id}
												id={product.id}
												title={product.title}
												description={product.description || ""}
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
				</div>
			</section>
		</PageLayout>
	);
}
