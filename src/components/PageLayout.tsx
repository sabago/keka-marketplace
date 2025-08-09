"use client";

import { useAuth } from "@/lib/authContext";
import { useSettings } from "@/lib/useSettings";
import { LogIn } from "lucide-react";
import Header from "@/components/Header";
import { isInIframe, requestLogin } from "@/lib/iframeUtils";

export default function PageLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isLoggedIn } = useAuth();
	const { settings } = useSettings();

	// Handle login with iframe communication
	const handleLogin = () => {
		if (isInIframe()) {
			// In iframe mode, request login from parent WordPress
			requestLogin();
			window.location.href = "https://masteringhomecare.com/login-custom/";
		} else {
			// Direct access mode, redirect to WordPress login
			window.location.href = "https://masteringhomecare.com/login-custom/";
		}
	};

	return (
		<>
			{/* Login banner for non-logged in users */}
			{!isLoggedIn && settings.memberDiscountPercentage > 0 && (
				<div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-auto my-0 rounded-md shadow-sm">
					<div className="flex items-center">
						<LogIn className="h-6 w-6 text-blue-500 mr-3" />
						<div>
							<h3 className="font-medium text-blue-800 min-w-[0]">
								Member Discount Available!
							</h3>
							<p className="text-[#0B4F96]">
								Log in to receive a {settings.memberDiscountPercentage}% discount on all
								products.{" "}
								<button
									onClick={handleLogin}
									className="font-medium underline hover:text-blue-800 text-[#0B4F96]"
								>
									Login now
								</button>
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Hero Section */}
			<section style={{ backgroundColor: "#48ccbc" }} className="text-white">
				<div className="w-full">
					<img
						src="/images/marketplacehomeimage.jpg"
						alt="Healthcare professionals providing home care services"
						className="w-full h-auto object-cover rounded-lg shadow-lg"
					/>
				</div>
			</section>

			{/* Navigation Header */}
			<Header />

			{/* Page Content */}
			{children}
		</>
	);
}
