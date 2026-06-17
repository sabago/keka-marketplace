"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut } from "lucide-react";
import { useSettings } from "@/lib/useSettings";
import { useAuth } from "@/lib/authContext";
import { useSession, signOut } from "next-auth/react";
// import { isInIframe } from "@/lib/iframeUtils";

export default function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isClient, setIsClient] = useState(false);
	const [liveAgencyStatus, setLiveAgencyStatus] = useState<string | null>(null);
	const [liveAgencyId, setLiveAgencyId] = useState<string | null | undefined>(undefined);
	const pathname = usePathname();
	const { settings } = useSettings();
	const { isLoggedIn, user } = useAuth();
	const { data: session } = useSession();

	// Track if we're on the client to avoid hydration mismatch
	useEffect(() => {
		setIsClient(true);
	}, []);

	// For platform/super admins, always fetch live agency status + agencyId so that
	// mid-session assignments/removals are reflected without JWT expiry.
	const sessionAgencyId = (session?.user as any)?.agencyId as string | null | undefined;
	const sessionRole = session?.user?.role;
	const isSuperOrPlatformAdmin = sessionRole === "PLATFORM_ADMIN" || sessionRole === "SUPERADMIN";
	useEffect(() => {
		if (!isSuperOrPlatformAdmin) return;
		fetch("/api/agency/status")
			.then((r) => r.ok ? r.json() : null)
			.then((data) => {
				setLiveAgencyId(data?.agencyId ?? null);
				if (data?.approvalStatus) setLiveAgencyStatus(data.approvalStatus);
				else setLiveAgencyStatus(null);
			})
			.catch(() => {}); // fail silently — don't break nav on network error
	}, [isSuperOrPlatformAdmin]);

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
		pathname?.startsWith("/resources/knowledge-base") ||
		pathname === "/directory" ||
		pathname?.startsWith("/directory/");

	// Check if we're on an agency-related page (show agency secondary nav)
	const isAgencyPage = pathname?.startsWith("/agency");

	const role = session?.user?.role;
	const agencyId = (session?.user as any)?.agencyId as string | null | undefined;
	// JWT-baked status (set at login, may be stale for mid-session changes)
	const jwtAgencyStatus = (session?.user as any)?.agencyApprovalStatus as string | null | undefined;

	const isPlatformOrSuperAdmin = role === "PLATFORM_ADMIN" || role === "SUPERADMIN";
	const isAgencyAdmin = role === "AGENCY_ADMIN";

	// Platform/super admins can also have a linked agency.
	// Use live-fetched agencyId (always DB-accurate) to catch mid-session assignments/removals.
	const effectiveAdminAgencyId = isPlatformOrSuperAdmin
		? (liveAgencyId !== undefined ? liveAgencyId : agencyId)
		: agencyId;
	const adminHasAgency = isPlatformOrSuperAdmin && !!effectiveAdminAgencyId;
	// For platform/super admins, use the live-fetched status; for agency admins, JWT is sufficient
	// (middleware already redirects them away from /agency/* on suspension, so JWT staleness is low-risk)
	const effectiveAgencyStatus = isPlatformOrSuperAdmin ? (liveAgencyStatus ?? jwtAgencyStatus) : jwtAgencyStatus;
	const agencyIsSuspended =
		effectiveAgencyStatus === "SUSPENDED" || effectiveAgencyStatus === "REJECTED";
	const showMyAgency = (isAgencyAdmin || adminHasAgency) && !agencyIsSuspended;

	// Check if we're on agency management pages
	const isAgencyManagementPage =
		pathname?.startsWith("/admin/agencies") ||
		pathname?.startsWith("/agency");

	return (
		<header className="bg-white shadow-md">
			{/* Top-level Navigation */}
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					{/* Logo and Primary Navigation */}
					<div className="flex items-center gap-6 min-w-0">
						<Link
							href="/"
							className="flex-shrink-0 hover:opacity-90 transition-opacity"
							aria-label="Mastering HomeCare"
						>
							<Image
								src="/images/logo-full.png"
								alt="Mastering HomeCare"
								width={220}
								height={60}
								className="h-10 w-auto object-contain"
								priority
							/>
						</Link>

						{/* Desktop Primary Navigation */}
						<nav className="hidden lg:flex items-center space-x-6 text-sm">
							{/* Public nav — always visible, matches WordPress site order */}
							<Link href="/about" className={`hover:text-[#3da777] whitespace-nowrap ${pathname === "/about" ? "text-[#3da777] font-medium" : "text-gray-600"}`}>About</Link>
							{/* Resources dropdown */}
							<div className="relative group">
								<button className={`hover:text-[#3da777] flex items-center gap-1 whitespace-nowrap ${pathname?.startsWith("/resources") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>
									Resources <span className="text-xs">▾</span>
								</button>
								<div className="absolute top-full left-0 pt-2 min-w-[260px] z-50 hidden group-hover:block">
									<div className="bg-white border border-gray-100 rounded-xl shadow-xl py-3">
										<Link
											href="/resources"
											className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
											onClick={() => setIsMenuOpen(false)}
										>
											<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(11,79,150,0.10)" }}>
												<svg className="w-4 h-4" style={{ color: "#0b4f96" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
											</div>
											<div>
												<p className="text-sm font-semibold text-gray-800">Resource Map</p>
												<p className="text-xs text-gray-500 leading-snug">Guides for starting, launching &amp; growing your agency</p>
											</div>
										</Link>
										<Link
											href="/resources/knowledge-base"
											className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
											onClick={() => setIsMenuOpen(false)}
										>
											<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(61,167,119,0.12)" }}>
												<svg className="w-4 h-4" style={{ color: "#3da777" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
											</div>
											<div>
												<p className="text-sm font-semibold text-gray-800">Referral Directory</p>
												<p className="text-xs text-gray-500 leading-snug">124+ referral sources: hospitals, ASAPs, insurers &amp; more</p>
											</div>
										</Link>
									</div>
								</div>
							</div>
							{/* Tools dropdown */}
							<div className="relative group">
								<button className={`hover:text-[#3da777] flex items-center gap-1 whitespace-nowrap ${pathname?.startsWith("/tools") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>
									Tools <span className="text-xs">▾</span>
								</button>
								{/* pt-2 extends the hover area over the gap so the dropdown doesn't close mid-travel */}
								<div className="absolute top-full left-0 pt-2 min-w-[240px] z-50 hidden group-hover:block">
									<div className="bg-white border border-gray-100 rounded-xl shadow-xl py-3">
										<Link
											href="/tools/credential-tracker"
											className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
											onClick={() => setIsMenuOpen(false)}
										>
											<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(61,167,119,0.12)" }}>
												<svg className="w-4 h-4" style={{ color: "#3da777" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
											</div>
											<div>
												<p className="text-sm font-semibold text-gray-800">Credential Tracker</p>
												<p className="text-xs text-gray-500 leading-snug">AI-parsed credentials, expiry alerts, compliance dashboard</p>
											</div>
										</Link>
									</div>
								</div>
							</div>
							<Link href="/community" className={`hover:text-[#3da777] whitespace-nowrap ${pathname?.startsWith("/community") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Community</Link>
							<Link href="/staffing" className={`hover:text-[#3da777] whitespace-nowrap ${pathname?.startsWith("/staffing") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Staffing</Link>
							<Link href="/marketplace" className={`hover:text-[#3da777] whitespace-nowrap ${isMarketplacePage ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Marketplace</Link>
							<Link href="/contact" className={`hover:text-[#3da777] whitespace-nowrap ${pathname === "/contact" ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Contact</Link>

							{/* More dropdown — Blogs, Help, Training, Employee Learning Hub */}
							<div className="relative group">
								<button className="hover:text-[#3da777] text-gray-600 flex items-center gap-1 whitespace-nowrap">
									More <span className="text-xs">▾</span>
								</button>
								<div className="absolute top-full left-0 pt-2 min-w-[200px] z-50 hidden group-hover:block"><div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1">
									<a href="https://masteringhomecare.com/blog/" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#3da777]">Blogs</a>
									<Link href="/memberships" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#3da777]">Memberships</Link>
									<Link href="/help" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#3da777]">Help</Link>
									<Link href="/training" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#3da777]">Training</Link>
									<Link href="/learning" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#3da777]">Employee Learning Hub</Link>
								</div></div>
							</div>

							{/* Auth-gated nav items */}
							{session && (
								<Link href="/dashboard" className={`hover:text-[#3da777] whitespace-nowrap ${pathname?.startsWith("/dashboard") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Dashboard</Link>
							)}
							{showMyAgency && (
								<Link href="/agency" className={`hover:text-[#3da777] whitespace-nowrap ${isAgencyPage ? "text-[#3da777] font-medium" : "text-gray-600"}`}>My Agency</Link>
							)}
							{isPlatformOrSuperAdmin && (
								<Link href="/admin/agencies" className={`hover:text-[#3da777] whitespace-nowrap ${isAgencyManagementPage && !pathname?.startsWith("/agency") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Agencies</Link>
							)}
							{role === "PLATFORM_ADMIN" && (
								<Link href="/admin/superadmins" className={`hover:text-[#3da777] whitespace-nowrap ${pathname?.startsWith("/admin/superadmins") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Superadmins</Link>
							)}
							{isPlatformOrSuperAdmin && (
								<Link href="/admin/audit-log" className={`hover:text-[#3da777] whitespace-nowrap ${pathname?.startsWith("/admin/audit-log") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Audit Log</Link>
							)}
							{isAgencyAdmin && (
								<Link href="/agency/audit-log" className={`hover:text-[#3da777] whitespace-nowrap ${pathname?.startsWith("/agency/audit-log") ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Audit Log</Link>
							)}
							{isAgencyAdmin && showMyAgency && (
								<Link href="/agency/subscription" className={`hover:text-[#3da777] whitespace-nowrap ${pathname === "/agency/subscription" ? "text-[#3da777] font-medium" : "text-gray-600"}`}>Plan &amp; Billing</Link>
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
					<button className="lg:hidden text-gray-600" onClick={toggleMenu}>
						{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
					</button>
				</div>

				{/* Mobile Menu */}
				{isMenuOpen && (
					<div className="lg:hidden mt-4 pb-4">
						<nav className="flex flex-col space-y-4">
							{/* Public nav — full WP site order */}
							<Link href="/about" className={`hover:text-[#3da777] ${pathname === "/about" ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>About</Link>
							<div>
								<p className={`font-medium mb-1 ${pathname?.startsWith("/resources") ? "text-[#3da777]" : "text-gray-600"}`}>Resources</p>
								<div className="pl-3 border-l-2 border-gray-100 flex flex-col gap-1">
									<Link href="/resources" className={`text-sm hover:text-[#3da777] ${pathname === "/resources" ? "text-[#3da777] font-medium" : "text-gray-500"}`} onClick={() => setIsMenuOpen(false)}>Resource Map</Link>
									<Link href="/resources/knowledge-base" className={`text-sm hover:text-[#3da777] ${pathname?.startsWith("/resources/knowledge-base") ? "text-[#3da777] font-medium" : "text-gray-500"}`} onClick={() => setIsMenuOpen(false)}>Referral Directory</Link>
								</div>
							</div>
							<div>
								<p className={`font-medium mb-1 ${pathname?.startsWith("/tools") ? "text-[#3da777]" : "text-gray-600"}`}>Tools</p>
								<div className="pl-3 border-l-2 border-gray-100 flex flex-col gap-1">
									<Link href="/tools/credential-tracker" className={`text-sm hover:text-[#3da777] ${pathname?.startsWith("/tools/credential-tracker") ? "text-[#3da777] font-medium" : "text-gray-500"}`} onClick={() => setIsMenuOpen(false)}>Credential Tracker</Link>
								</div>
							</div>
							<Link href="/community" className={`hover:text-[#3da777] ${pathname?.startsWith("/community") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Community</Link>
							<Link href="/staffing" className={`hover:text-[#3da777] ${pathname?.startsWith("/staffing") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Staffing</Link>
							<Link href="/marketplace" className={`hover:text-[#3da777] ${isMarketplacePage ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Marketplace</Link>
							<Link href="/contact" className={`hover:text-[#3da777] ${pathname === "/contact" ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Contact</Link>
							<a href="https://masteringhomecare.com/blog/" target="_blank" rel="noopener noreferrer" className="hover:text-[#3da777] text-gray-600" onClick={() => setIsMenuOpen(false)}>Blogs</a>
							<Link href="/memberships" className={`hover:text-[#3da777] ${pathname === "/memberships" ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Memberships</Link>
							<Link href="/help" className={`hover:text-[#3da777] ${pathname === "/help" ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Help</Link>
							<Link href="/training" className={`hover:text-[#3da777] ${pathname?.startsWith("/training") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Training</Link>
							<Link href="/learning" className={`hover:text-[#3da777] ${pathname?.startsWith("/learning") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Employee Learning Hub</Link>

							{/* Auth-gated items */}
							{session && <Link href="/dashboard" className={`hover:text-[#3da777] ${pathname?.startsWith("/dashboard") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Dashboard</Link>}
							{showMyAgency && <Link href="/agency" className={`hover:text-[#3da777] ${isAgencyPage ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>My Agency</Link>}
							{isPlatformOrSuperAdmin && <Link href="/admin/agencies" className={`hover:text-[#3da777] ${isAgencyManagementPage && !pathname?.startsWith("/agency") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Agencies</Link>}
							{role === "PLATFORM_ADMIN" && <Link href="/admin/superadmins" className={`hover:text-[#3da777] ${pathname?.startsWith("/admin/superadmins") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Superadmins</Link>}
							{isPlatformOrSuperAdmin && <Link href="/admin/audit-log" className={`hover:text-[#3da777] ${pathname?.startsWith("/admin/audit-log") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Audit Log</Link>}
							{isAgencyAdmin && <Link href="/agency/audit-log" className={`hover:text-[#3da777] ${pathname?.startsWith("/agency/audit-log") ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Audit Log</Link>}
							{isAgencyAdmin && showMyAgency && <Link href="/agency/subscription" className={`hover:text-[#3da777] ${pathname === "/agency/subscription" ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>Plan &amp; Billing</Link>}

							{/* Agency sub-nav (mobile) */}
							{showMyAgency && isAgencyPage && (
								<div className="pl-4 border-l-2 border-gray-200 mt-2">
									<div className="text-xs text-gray-500 mb-2 uppercase">Agency Menu</div>
									{[
										{ href: "/agency", label: "Overview" },
										{ href: "/agency/staff/credentials", label: "Staff Credentials" },
										{ href: "/agency/compliance", label: "Compliance" },
										{ href: "/agency/document-types", label: "Document Types" },
										{ href: "/agency/staff", label: "Staff" },
										{ href: "/agency/settings", label: "Settings" },
										{ href: "/agency/subscription", label: "Plan & Billing" },
									].map(({ href, label }) => (
										<Link key={href} href={href} className={`block hover:text-[#3da777] mb-3 ${pathname === href ? "text-[#3da777] font-medium" : "text-gray-600"}`} onClick={() => setIsMenuOpen(false)}>{label}</Link>
									))}
								</div>
							)}

							{/* Auth Section for Mobile */}
							{session ? (
								<>
									<Link href="/account" className="flex items-center text-gray-600 hover:text-[#3da777]" onClick={() => setIsMenuOpen(false)}>
										<User className="h-5 w-5 text-[#0B4F96] mr-2" />
										<span className="font-medium">{session.user?.name || session.user?.email || "Account"}</span>
									</Link>
									<button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center text-gray-600 hover:text-red-600">
										<LogOut className="h-5 w-5 mr-2" />
										<span>Logout</span>
									</button>
								</>
							) : (
								<Link href="/auth/signin" className="flex items-center text-[#0B4F96] hover:text-[#3da777]" onClick={() => setIsMenuOpen(false)}>
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
