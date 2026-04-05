"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { useSettings } from "@/lib/useSettings";
import { useAuth } from "@/lib/authContext";
import { useSession, signOut } from "next-auth/react";
// import { isInIframe } from "@/lib/iframeUtils";

export default function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isClient, setIsClient] = useState(false);
	const pathname = usePathname();
	const { settings } = useSettings();
	const { isLoggedIn, user } = useAuth();
	const { data: session } = useSession();

	// Track if we're on the client to avoid hydration mismatch
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Handle logout
	const handleLogout = async () => {
		await signOut({ callbackUrl: "/" });
	};

	// Check if we're on localhost (only on client)
	const isLocalhost = isClient && window.location.hostname === "localhost";

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

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	// Check if we're on a marketplace-related page (show secondary nav)
	const isMarketplacePage =
		pathname === "/marketplace" ||
		pathname === "/categories" ||
		(pathname?.startsWith("/admin") && !pathname?.startsWith("/admin/agencies"));

	// Check if we're on a directory-related page (show directory secondary nav)
	const isDirectoryPage =
		pathname?.startsWith("/knowledge-base") ||
		pathname === "/directory" ||
		pathname?.startsWith("/directory/");

	// Check if we're on an agency-related page (show agency secondary nav)
	const isAgencyPage = pathname?.startsWith("/agency");

	// Check if user has agency access
	const hasAgencyAccess =
		session?.user?.role === "AGENCY_ADMIN" ||
		session?.user?.role === "AGENCY_USER";

	// Check if user is platform admin or agency admin
	const isAdmin =
		session?.user?.role === "PLATFORM_ADMIN" ||
		session?.user?.role === "AGENCY_ADMIN";

	// Determine agency management URL based on role
	const agencyManagementUrl =
		session?.user?.role === "PLATFORM_ADMIN"
			? "/admin/agencies"
			: "/agency/settings";

	// Check if we're on agency management pages
	const isAgencyManagementPage =
		pathname?.startsWith("/admin/agencies") ||
		(pathname?.startsWith("/agency") && session?.user?.role === "AGENCY_ADMIN");

	return (
		<header className="bg-white shadow-md">
			{/* Top-level Navigation */}
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					{/* Logo and Primary Navigation */}
					<div className="flex items-center space-x-8">
						<Link
							href="/"
							className="text-xl font-bold text-[#0B4F96] hover:text-[#48ccbc]"
						>
							{settings.siteName}
						</Link>

						{/* Desktop Primary Navigation */}
						<nav className="hidden md:flex items-center space-x-8">
							{/* <Link
								href="/"
								className={`hover:text-[#48ccbc] ${
									pathname === "/" && !isDirectoryPage && !isMarketplacePage
										? "text-[#48ccbc] font-medium"
										: "text-gray-600"
								}`}
							>
								Home
							</Link> */}
							<Link
								href="/marketplace"
								className={`hover:text-[#48ccbc] ${
									isMarketplacePage ? "text-[#48ccbc] font-medium" : "text-gray-600"
								}`}
							>
								Marketplace
							</Link>
							<Link
								href="/knowledge-base"
								className={`hover:text-[#48ccbc] ${
									isDirectoryPage ? "text-[#48ccbc] font-medium" : "text-gray-600"
								}`}
							>
								Directory
							</Link>
							<Link
								href="/pricing"
								className={`hover:text-[#48ccbc] ${
									pathname === "/pricing"
										? "text-[#48ccbc] font-medium"
										: "text-gray-600"
								}`}
							>
								Pricing
							</Link>
							<Link
								href="/dashboard"
								className={`hover:text-[#48ccbc] ${
									pathname?.startsWith("/dashboard")
										? "text-[#48ccbc] font-medium"
										: "text-gray-600"
								}`}
							>
								Dashboard
							</Link>
							{isAdmin && (
								<Link
									href={agencyManagementUrl}
									className={`hover:text-[#48ccbc] ${
										isAgencyManagementPage
											? "text-[#48ccbc] font-medium"
											: "text-gray-600"
									}`}
								>
									{session?.user?.role === "PLATFORM_ADMIN"
										? "Agencies"
										: "My Agency"}
								</Link>
							)}
							{hasAgencyAccess && session?.user?.role !== "AGENCY_ADMIN" && (
								<Link
									href="/agency"
									className={`hover:text-[#48ccbc] ${
										isAgencyPage ? "text-[#48ccbc] font-medium" : "text-gray-600"
									}`}
								>
									Agency
								</Link>
							)}
							{session?.user?.role === "PLATFORM_ADMIN" && (
								<Link
									href="/admin/superadmins"
									className={`hover:text-[#48ccbc] ${
										pathname?.startsWith("/admin/superadmins")
											? "text-[#48ccbc] font-medium"
											: "text-gray-600"
									}`}
								>
									Superadmins
								</Link>
							)}
						</nav>
					</div>

					{/* Auth Section */}
					<div className="hidden md:flex items-center space-x-4">
						{session ? (
							<div className="flex items-center gap-3">
								{/* Profile Icon */}
								<Link
									href="/account"
									className="flex items-center gap-2 hover:opacity-80 transition-opacity"
								>
									<div className="w-8 h-8 bg-[#0B4F96] rounded-full flex items-center justify-center">
										<User className="h-5 w-5 text-white" />
									</div>
									<span className="text-sm font-medium text-gray-700">
										{session.user?.name || session.user?.email || "Account"}
									</span>
								</Link>
								{/* Logout Button */}
								<button
									onClick={handleLogout}
									className="flex items-center gap-1 text-gray-600 hover:text-red-600 transition-colors"
									title="Logout"
								>
									<LogOut className="h-5 w-5" />
								</button>
							</div>
						) : (
							<Link
								href="/auth/signin"
								className="text-[#0B4F96] hover:text-[#48ccbc] text-sm font-medium"
							>
								Sign In
							</Link>
						)}
					</div>

					{/* Mobile Menu Button */}
					<button className="md:hidden text-gray-600" onClick={toggleMenu}>
						{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
					</button>
				</div>

				{/* Mobile Menu */}
				{isMenuOpen && (
					<div className="md:hidden mt-4 pb-4">
						<nav className="flex flex-col space-y-4">
							<Link
								href="/"
								className={`hover:text-blue-600 ${
									pathname === "/" && !isDirectoryPage && !isMarketplacePage
										? "text-[#0B4F96] font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Home
							</Link>
							<Link
								href="/marketplace"
								className={`hover:text-blue-600 ${
									isMarketplacePage ? "text-[#0B4F96] font-medium" : "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Marketplace
							</Link>
							<Link
								href="/knowledge-base"
								className={`hover:text-blue-600 ${
									isDirectoryPage ? "text-[#0B4F96] font-medium" : "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Directory
							</Link>
							<Link
								href="/pricing"
								className={`hover:text-blue-600 ${
									pathname === "/pricing"
										? "text-[#0B4F96] font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Pricing
							</Link>
							<Link
								href="/dashboard"
								className={`hover:text-blue-600 ${
									pathname?.startsWith("/dashboard")
										? "text-[#0B4F96] font-medium"
										: "text-gray-600"
								}`}
								onClick={() => setIsMenuOpen(false)}
							>
								Dashboard
							</Link>
							{isAdmin && (
								<Link
									href={agencyManagementUrl}
									className={`hover:text-blue-600 ${
										isAgencyManagementPage
											? "text-[#0B4F96] font-medium"
											: "text-gray-600"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									{session?.user?.role === "PLATFORM_ADMIN"
										? "Agencies"
										: "My Agency"}
								</Link>
							)}
							{hasAgencyAccess && session?.user?.role !== "AGENCY_ADMIN" && (
								<Link
									href="/agency"
									className={`hover:text-blue-600 ${
										isAgencyPage ? "text-[#0B4F96] font-medium" : "text-gray-600"
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Agency
								</Link>
							)}

							{/* Agency Sub-Navigation Items (mobile) */}
							{hasAgencyAccess && isAgencyPage && (
								<>
									<div className="pl-4 border-l-2 border-gray-200 mt-2">
										<div className="text-xs text-gray-500 mb-2 uppercase">
											Agency Menu
										</div>
										<Link
											href="/agency"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/agency"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Overview
										</Link>
										<Link
											href="/agency/employees"
											className={`block hover:text-blue-600 mb-3 ${
												pathname?.startsWith("/agency/employees")
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Employees
										</Link>
										<Link
											href="/agency/compliance"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/agency/compliance"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Compliance
										</Link>
										<Link
											href="/agency/document-types"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/agency/document-types"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Document Types
										</Link>
										<Link
											href="/agency/staff"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/agency/staff"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Staff
										</Link>
										<Link
											href="/agency/settings"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/agency/settings"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Settings
										</Link>
										<Link
											href="/agency/subscription"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/agency/subscription"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Subscription
										</Link>
									</div>
								</>
							)}

							{/* Marketplace Sub-Navigation Items (mobile) */}
							{isMarketplacePage && (
								<>
									<div className="pl-4 border-l-2 border-gray-200 mt-2">
										<div className="text-xs text-gray-500 mb-2 uppercase">
											Marketplace Menu
										</div>
										<Link
											href="/marketplace"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/marketplace"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Marketplace
										</Link>
										<Link
											href="/categories"
											className={`block hover:text-blue-600 mb-3 ${
												pathname === "/categories"
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Categories
										</Link>
										{/* Show Admin link for users with Administrator role or when on localhost */}
										{(isLoggedIn &&
											user?.roles &&
											user.roles.includes("administrator")) ||
										isLocalhost ? (
											<Link
												href="/admin"
												className={`block hover:text-blue-600 ${
													pathname?.startsWith("/admin")
														? "text-[#0B4F96] font-medium"
														: "text-gray-600"
												}`}
												onClick={() => setIsMenuOpen(false)}
											>
												Admin
											</Link>
										) : null}
									</div>
								</>
							)}

							{/* Directory Sub-Navigation Items (mobile) */}
							{isDirectoryPage && (
								<>
									<div className="pl-4 border-l-2 border-gray-200 mt-2">
										<div className="text-xs text-gray-500 mb-2 uppercase">
											Directory Menu
										</div>
										<Link
											href="/knowledge-base"
											className={`block hover:text-blue-600 mb-3 ${
												pathname?.startsWith("/knowledge-base")
													? "text-[#0B4F96] font-medium"
													: "text-gray-600"
											}`}
											onClick={() => setIsMenuOpen(false)}
										>
											Directory
										</Link>
										{/* Show Directory Admin link for users with Administrator role or when on localhost */}
										{(isLoggedIn &&
											user?.roles &&
											user.roles.includes("administrator")) ||
										isLocalhost ? (
											<Link
												href="/directory/admin"
												className={`block hover:text-blue-600 ${
													pathname?.startsWith("/directory/admin")
														? "text-[#0B4F96] font-medium"
														: "text-gray-600"
												}`}
												onClick={() => setIsMenuOpen(false)}
											>
												Directory Admin
											</Link>
										) : null}
									</div>
								</>
							)}

							{/* Auth Section for Mobile */}
							{session ? (
								<>
									<Link
										href="/account"
										className="flex items-center text-gray-600 hover:text-[#0B4F96]"
										onClick={() => setIsMenuOpen(false)}
									>
										<User className="h-5 w-5 text-[#0B4F96] mr-2" />
										<span className="font-medium">
											{session.user?.name || session.user?.email || "Account"}
										</span>
									</Link>
									<button
										onClick={() => {
											handleLogout();
											setIsMenuOpen(false);
										}}
										className="flex items-center text-gray-600 hover:text-red-600"
									>
										<LogOut className="h-5 w-5 mr-2" />
										<span>Logout</span>
									</button>
								</>
							) : (
								<Link
									href="/auth/signin"
									className="flex items-center text-[#0B4F96] hover:text-[#48ccbc]"
									onClick={() => setIsMenuOpen(false)}
								>
									<User className="h-5 w-5 mr-2" />
									<span>Sign In</span>
								</Link>
							)}
						</nav>
					</div>
				)}
			</div>
		</header>
	);
}
