"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Menu, X, Search, User } from "lucide-react";
import { useCart } from "@/lib/useCart";
import { useSettings } from "@/lib/useSettings";
import { useAuth } from "@/lib/authContext";
// import { isInIframe } from "@/lib/iframeUtils";

export default function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const pathname = usePathname();
	const router = useRouter();
	const { getTotalItems, isHydrated } = useCart();
	const { settings } = useSettings();
	const { isLoggedIn, user } = useAuth();

	// Get the cart item count
	const cartItemCount = isHydrated ? getTotalItems() : 0;

	// Handle logout
	// const handleLogout = () => {
	// 	if (isInIframe()) {
	// 		// In iframe mode, request logout from parent WordPress
	// 		requestLogout();
	// 	} else {
	// 		// Direct access mode, handle logout locally
	// 		sessionStorage.removeItem("wp_marketplace_token");
	// 		window.location.reload();
	// 	}
	// };

	// 	const loginUrl =
	// 	"https://masteringhomecare.com/login/?redirect_to=/marketplace/";
	// const logoutUrl =
	// 	"https://masteringhomecare.com/logout/?redirect_to=/marketplace/";
	// const logoutUrl =
	// 	"https://masteringhomecare.com/wp-login.php?action=logout&redirect_to=https://masteringhomecare.com";
	// const handleLogout = () => {
	// 	if (isInIframe()) {
	// 		// Ask parent WP site to log out via postMessage
	// 		requestLogout();
	// 		window.location.href = logoutUrl;
	// 	} else {
	// 		// For direct access, redirect to MemberPress/WordPress logout

	// 		window.location.href = logoutUrl;
	// 	}
	// };

	// // Handle login
	// const loginUrl = "https://masteringhomecare.com/login-custom/";
	// const handleLogin = () => {
	// 	if (isInIframe()) {
	// 		// In iframe mode, request login from parent WordPress
	// 		requestLogin();
	// 		window.location.href = loginUrl;
	// 	} else {
	// 		// Direct access mode, redirect to WordPress login
	// 		window.location.href = loginUrl;
	// 	}
	// };

	// const loginUrl = "https://masteringhomecare.com/login-custom/";
	// const logoutUrl = "https://masteringhomecare.com/logout/"; // Confirm this exists

	// const handleLogin = () => {
	// 	if (isInIframe()) {
	// 		parent.postMessage({ type: "LOGIN_REQUEST" }, "*");
	// 		window.location.href = loginUrl;
	// 	} else {
	// 		window.location.href = loginUrl;
	// 	}
	// };

	// const handleLogout = () => {
	// 	if (isInIframe()) {
	// 		parent.postMessage({ type: "LOGOUT_REQUEST" }, "*");
	// 	} else {
	// 		window.location.href = logoutUrl;
	// 	}
	// };

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (!event.data || typeof event.data !== "object") return;

			const { action } = event.data;

			// Handle logout from WordPress parent
			if (action === "userLoggedOut") {
				console.log("[iframe] Received logout from parent");
				sessionStorage.removeItem("wp_marketplace_token");
				// window.location.href = "/logged-out"; // Or trigger a logout route or state
			}

			// Optional: handle login sync
			if (action === "userLoggedIn") {
				console.log("[iframe] Received login from parent");
				window.location.reload(); // Or refresh user state
			}
		};

		window.addEventListener("message", handleMessage);

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	// Effect to track cart hydration
	useEffect(() => {
		// Cart is now hydrated and ready
	}, [isHydrated, cartItemCount]);

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			const searchUrl = `/?search=${encodeURIComponent(searchQuery)}`;
			router.push(searchUrl);

			// Force a hard navigation as a fallback
			if (typeof window !== "undefined") {
				window.location.href = searchUrl;
			}
		}
	};

	return (
		<header className="bg-white shadow-md">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					{/* Logo and Navigation */}
					<div className="flex items-center space-x-8">
						<Link
							href="/"
							className={`text-lg ${
								pathname === "/" ? "text-[#48ccbc] font-medium" : "text-gray-600"
							}`}
						>
							{settings.siteName}
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center space-x-8">
							<Link
								href="/categories"
								className={`hover:text-[#48ccbc] ${
									pathname === "/categories"
										? "text-[#48ccbc] font-medium"
										: "text-gray-600"
								}`}
							>
								Categories
							</Link>
							{/* Show Admin link for users with Administrator role or when on localhost */}
							{(isLoggedIn && user?.roles && user.roles.includes("administrator")) ||
							(typeof window !== "undefined" &&
								window.location.hostname === "localhost") ? (
								<Link
									href="/admin"
									className={`hover:text-[#48ccbc] ${
										pathname?.startsWith("/admin")
											? "text-[#48ccbc] font-medium"
											: "text-gray-600"
									}`}
								>
									Admin{" "}
									{typeof window !== "undefined" &&
										window.location.hostname === "localhost" &&
										(!isLoggedIn || !user?.roles?.includes("administrator")) &&
										"(Dev Mode)"}
								</Link>
							) : null}
						</nav>
					</div>

					{/* Search, Cart, and Auth */}
					<div className="hidden md:flex items-center space-x-4">
						<form onSubmit={handleSearch} className="relative flex items-center">
							<input
								type="text"
								placeholder="Search products..."
								className="pl-10 pr-4 py-2 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
							<button
								type="submit"
								className="bg-[#0B4F96] text-white px-4 py-2 rounded-r-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								Search
							</button>
						</form>

						{/* Auth Section */}
						{
							isLoggedIn ? (
								<div className="flex items-center">
									<div className="mr-4 flex items-center">
										<User className="h-5 w-5 text-[#0B4F96] mr-1" />
										<span className="text-sm font-medium">
											{user?.display_name || "Member"}
										</span>
										{settings.memberDiscountPercentage > 0 && (
											<span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
												{settings.memberDiscountPercentage}% off
											</span>
										)}
									</div>
									{/* <button
										onClick={handleLogout}
										className="flex items-center text-gray-600 hover:text-red-600"
									>
										<LogOut className="h-5 w-5" />
									</button> */}
								</div>
							) : null
							// (
							// 	<button
							// 		onClick={handleLogin}
							// 		className="text-blue-600 hover:text-blue-800 text-sm font-medium"
							// 	>
							// 		Login
							// 	</button>
							// )
						}

						<Link href="/cart" className="relative">
							<ShoppingCart className="h-6 w-6 text-gray-600 hover:text-blue-600" />
							{cartItemCount > 0 && (
								<span className="absolute -top-2 -right-2 bg-[#48ccbc] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
						<form
							onSubmit={(e) => {
								handleSearch(e);
								setIsMenuOpen(false); // Close menu after search
							}}
							className="relative mb-4 flex items-center"
						>
							<input
								type="text"
								placeholder="Search products..."
								className="w-full pl-10 pr-4 py-2 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
							<button
								type="submit"
								className="bg-[#0B4F96] text-white px-4 py-2 rounded-r-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								Search
							</button>
						</form>
						<nav className="flex flex-col space-y-4">
							<Link
								href="/categories"
								className={`hover:text-blue-600 ${
									pathname === "/categories"
										? "text-[#0B4F96] font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Categories
							</Link>
							{/* Show Admin link for users with Administrator role or when on localhost */}
							{(isLoggedIn && user?.roles && user.roles.includes("administrator")) ||
							(typeof window !== "undefined" &&
								window.location.hostname === "localhost") ? (
								<Link
									href="/admin"
									className={`hover:text-blue-600 ${
										pathname?.startsWith("/admin")
											? "text-[#0B4F96] font-medium"
											: "text-gray-600"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Admin{" "}
									{typeof window !== "undefined" &&
										window.location.hostname === "localhost" &&
										(!isLoggedIn || !user?.roles?.includes("administrator")) &&
										"(Dev Mode)"}
								</Link>
							) : null}
							{/* Auth Section for Mobile */}
							{
								isLoggedIn ? (
									<>
										<div className="flex items-center text-gray-600">
											<User className="h-5 w-5 text-[#0B4F96] mr-2" />
											<span className="font-medium">{user?.display_name || "Member"}</span>
											{settings.memberDiscountPercentage > 0 && (
												<span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
													{settings.memberDiscountPercentage}% off
												</span>
											)}
										</div>
										{/* <button
											onClick={handleLogout}
											className="flex items-center text-gray-600 hover:text-red-600"
										>
											<LogOut className="h-5 w-5 mr-2" />
											<span>Logout</span>
										</button> */}
									</>
								) : null
								// (
								// 	<button
								// 		onClick={() => {
								// 			handleLogin();
								// 			setIsMenuOpen(false);
								// 		}}
								// 		className="flex items-center text-blue-600 hover:text-blue-800"
								// 	>
								// 		<User className="h-5 w-5 mr-2" />
								// 		<span>Login</span>
								// 	</button>
								// )
							}

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
