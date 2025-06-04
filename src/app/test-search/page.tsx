"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TestSearchPage() {
	const [searchQuery, setSearchQuery] = useState("clinical");
	const router = useRouter();

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			const searchUrl = `/products?search=${encodeURIComponent(searchQuery)}`;
			router.push(searchUrl);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-4">Test Search Page</h1>
			<form onSubmit={handleSearch} className="flex items-center mb-4">
				<input
					type="text"
					placeholder="Search products..."
					className="px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				<button
					type="submit"
					className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					Search
				</button>
			</form>
			<div className="mt-4">
				<p>Current search query: {searchQuery}</p>
				<button
					onClick={() =>
						(window.location.href = `/products?search=${encodeURIComponent(
							searchQuery
						)}`)
					}
					className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
				>
					Direct Navigation
				</button>
			</div>
		</div>
	);
}
