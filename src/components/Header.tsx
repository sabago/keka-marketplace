"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Menu, X, Search, User, LogOut } from "lucide-react";
import { useCart } from "@/lib/useCart";
import { useSettings } from "@/lib/useSettings";
import { useAuth } from "@/lib/authContext";

export default function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const pathname = usePathname();
	const { getTotalItems, isHydrated } = useCart();
	const { settings } = useSettings();
	const { isLoggedIn, user } = useAuth();

	// Get the cart item count
	const cartItemCount = isHydrated ? getTotalItems() : 0;

	// Handle logout
	const handleLogout = () => {
		// Remove token from sessionStorage
		sessionStorage.removeItem("wp_marketplace_token");
		// Reload the page to reset auth state
		window.location.reload();
	};

	// Debug cart item count
	useEffect(() => {
		if (isHydrated) {
			console.log("Cart item count:", cartItemCount);
		}
	}, [isHydrated, cartItemCount]);

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
		}
	};

	return (
		<header className="bg-white shadow-md">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					{/* Logo */}
					<Link href="/" className="text-2xl font-bold text-blue-600">
						{settings.siteName}
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center space-x-8">
						<Link
							href="/products"
							className={`hover:text-blue-600 ${
								pathname === "/products" ? "text-blue-600 font-medium" : "text-gray-600"
							}`}
						>
							All Products
						</Link>
						<Link
							href="/categories"
							className={`hover:text-blue-600 ${
								pathname === "/categories"
									? "text-blue-600 font-medium"
									: "text-gray-600"
							}`}
						>
							Categories
						</Link>
						<Link
							href="/admin"
							className={`hover:text-blue-600 ${
								pathname?.startsWith("/admin")
									? "text-blue-600 font-medium"
									: "text-gray-600"
							}`}
						>
							Admin
						</Link>
					</nav>

					{/* Search, Cart, and Auth */}
					<div className="hidden md:flex items-center space-x-4">
						<form onSubmit={handleSearch} className="relative">
							<input
								type="text"
								placeholder="Search products..."
								className="pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
						</form>

						{/* Auth Section */}
						{isLoggedIn ? (
							<div className="flex items-center">
								<div className="mr-4 flex items-center">
									<User className="h-5 w-5 text-blue-600 mr-1" />
									<span className="text-sm font-medium">
										{user?.display_name || "Member"}
									</span>
									{settings.memberDiscountPercentage > 0 && (
										<span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
											{settings.memberDiscountPercentage}% off
										</span>
									)}
								</div>
								<button
									onClick={handleLogout}
									className="flex items-center text-gray-600 hover:text-red-600"
								>
									<LogOut className="h-5 w-5" />
								</button>
							</div>
						) : (
							<a
								href="https://masteringhomecare.com/login-custom/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 hover:text-blue-800 text-sm font-medium"
							>
								Login
							</a>
						)}

						<Link href="/cart" className="relative">
							<ShoppingCart className="h-6 w-6 text-gray-600 hover:text-blue-600" />
							{cartItemCount > 0 && (
								<span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
									{cartItemCount}
								</span>
							)}
						</Link>
					</div>

					{/* Mobile Menu Button */}
					<button className="md:hidden text-gray-600" onClick={toggleMenu}>
						{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
					</button>
				</div>

				{/* Mobile Menu */}
				{isMenuOpen && (
					<div className="md:hidden mt-4 pb-4">
						<form onSubmit={handleSearch} className="relative mb-4">
							<input
								type="text"
								placeholder="Search products..."
								className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
						</form>
						<nav className="flex flex-col space-y-4">
							<Link
								href="/products"
								className={`hover:text-blue-600 ${
									pathname === "/products"
										? "text-blue-600 font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								All Products
							</Link>
							<Link
								href="/categories"
								className={`hover:text-blue-600 ${
									pathname === "/categories"
										? "text-blue-600 font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Categories
							</Link>
							<Link
								href="/admin"
								className={`hover:text-blue-600 ${
									pathname?.startsWith("/admin")
										? "text-blue-600 font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Admin
							</Link>
							{/* Auth Section for Mobile */}
							{isLoggedIn ? (
								<>
									<div className="flex items-center text-gray-600">
										<User className="h-5 w-5 text-blue-600 mr-2" />
										<span className="font-medium">{user?.display_name || "Member"}</span>
										{settings.memberDiscountPercentage > 0 && (
											<span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
												{settings.memberDiscountPercentage}% off
											</span>
										)}
									</div>
									<button
										onClick={handleLogout}
										className="flex items-center text-gray-600 hover:text-red-600"
									>
										<LogOut className="h-5 w-5 mr-2" />
										<span>Logout</span>
									</button>
								</>
							) : (
								<a
									href="https://masteringhomecare.com/login-custom/"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center text-blue-600 hover:text-blue-800"
									onClick={() => setIsMenuOpen(false)}
								>
									<User className="h-5 w-5 mr-2" />
									<span>Login</span>
								</a>
							)}

							<Link
								href="/cart"
								className="flex items-center text-gray-600 hover:text-blue-600"
								onClick={() => setIsMenuOpen(false)}
							>
								<ShoppingCart className="h-5 w-5 mr-2" />
								<span>View Cart {cartItemCount > 0 && `(${cartItemCount})`}</span>
							</Link>
						</nav>
					</div>
				)}
			</div>
		</header>
	);
}
