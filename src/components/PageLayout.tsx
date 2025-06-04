"use client";

import { useAuth } from "@/lib/authContext";
import { useSettings } from "@/lib/useSettings";
import { LogIn } from "lucide-react";
import Header from "@/components/Header";

export default function PageLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isLoggedIn } = useAuth();
	const { settings } = useSettings();

	return (
		<>
			{/* Login banner for non-logged in users */}
			{!isLoggedIn && settings.memberDiscountPercentage > 0 && (
				<div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-0 container mx-auto mt-4 rounded-md shadow-sm">
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
