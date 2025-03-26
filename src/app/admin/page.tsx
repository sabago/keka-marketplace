"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";

// Define product type
interface Product {
	id: string;
	title: string;
	description?: string;
	price: number;
	thumbnail: string;
	sales?: number;
	createdAt?: string;
	averageRating?: number;
	reviewCount?: number;
}

export default function AdminPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Fetch products from API
	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const response = await fetch("/api/products");
				if (!response.ok) {
					throw new Error("Failed to fetch products");
				}
				const data = await response.json();
				setProducts(data.products || []);
				setLoading(false);
			} catch (err) {
				console.error("Error fetching products:", err);
				setError("Failed to load products. Please try again later.");
				setLoading(false);
			}
		};

		fetchProducts();
	}, []);

	// Filter products based on search query
	const filteredProducts = products.filter((product) =>
		product.title.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Handle product deletion
	const handleDeleteProduct = async (id: string) => {
		if (window.confirm("Are you sure you want to delete this product?")) {
			try {
				const response = await fetch(`/api/products/${id}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					throw new Error("Failed to delete product");
				}

				// Remove product from state
				setProducts(products.filter((product) => product.id !== id));
			} catch (err) {
				console.error("Error deleting product:", err);
				alert("Failed to delete product. Please try again.");
			}
		}
	};

	// Format price
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold">Admin Dashboard</h1>
				<Link
					href="/admin/products/new"
					className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
				>
					<PlusCircle className="h-5 w-5 mr-2" />
					Add New Product
				</Link>
			</div>

			{/* Search and Filter */}
			<div className="bg-white rounded-lg shadow-md p-6 mb-8">
				<div className="flex items-center">
					<div className="relative flex-grow">
						<input
							type="text"
							placeholder="Search products..."
							className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
					</div>
				</div>
			</div>

			{/* Loading and Error States */}
			{loading && (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading products...</p>
				</div>
			)}

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

			{/* Products Table */}
			{!loading && !error && (
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
										Price
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Sales
									</th>
									<th
										scope="col"
										className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
									>
										Created
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
								{filteredProducts.map((product) => (
									<tr key={product.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												<div className="h-10 w-10 flex-shrink-0 relative">
													<Image
														src={product.thumbnail}
														alt={product.title}
														fill
														sizes="40px"
														className="rounded object-cover"
													/>
												</div>
												<div className="ml-4">
													<div className="text-sm font-medium text-gray-900">
														{product.title}
													</div>
													<div className="text-sm text-gray-500">ID: {product.id}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{formatPrice(product.price)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">{product.sales}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-500">{product.createdAt}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<div className="flex justify-end space-x-2">
												<Link
													href={`/admin/products/edit/${product.id}`}
													className="text-blue-600 hover:text-blue-900"
												>
													<Edit className="h-5 w-5" />
												</Link>
												<button
													onClick={() => handleDeleteProduct(product.id)}
													className="text-red-600 hover:text-red-900"
												>
													<Trash2 className="h-5 w-5" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{filteredProducts.length === 0 && (
						<div className="text-center py-8 text-gray-500">
							No products found. Try a different search term or add a new product.
						</div>
					)}
				</div>
			)}

			{/* Admin Navigation */}
			<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
				<Link
					href="/admin/orders"
					className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
				>
					<h2 className="text-xl font-semibold mb-2">Orders</h2>
					<p className="text-gray-600">View and manage customer orders</p>
				</Link>
				<Link
					href="/admin/analytics"
					className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
				>
					<h2 className="text-xl font-semibold mb-2">Analytics</h2>
					<p className="text-gray-600">View sales and performance metrics</p>
				</Link>
				<Link
					href="/admin/settings"
					className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
				>
					<h2 className="text-xl font-semibold mb-2">Settings</h2>
					<p className="text-gray-600">Configure marketplace settings</p>
				</Link>
			</div>
		</div>
	);
}
