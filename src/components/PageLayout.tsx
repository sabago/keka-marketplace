"use client";

import { useSession } from "next-auth/react";
import { useSettings } from "@/lib/useSettings";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import SecondaryNav from "@/components/SecondaryNav";

export default function PageLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, status } = useSession();
	const { settings, loading: settingsLoading } = useSettings();
	const router = useRouter();

	const isLoggedIn = status === "authenticated" && !!session?.user;

	// Show loading state while session is loading
	if (status === "loading" || settingsLoading) {
		return (
			<>
				{/* Hero Section - Always show */}
				<section style={{ backgroundColor: "#48ccbc" }} className="text-white">
					<div className="w-full">
						<img
							src="/images/marketplacehomeimage.jpg"
							alt="Healthcare professionals providing home care services"
							className="w-full h-auto object-cover rounded-lg shadow-lg"
						/>
					</div>
				</section>
				<SecondaryNav />
				{children}
			</>
		);
	}

	// Handle login - redirect to NextAuth sign-in
	const handleLogin = () => {
		router.push("/auth/signin");
	};

	return (
		<>
			{/* Login banner for non-logged in users */}
			{!isLoggedIn && settings?.memberDiscountPercentage && settings.memberDiscountPercentage > 0 && (
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

			{/* Hero Section - Always render */}
			<section style={{ backgroundColor: "#48ccbc" }} className="text-white">
				<div className="w-full">
					<img
						src="/images/marketplacehomeimage.jpg"
						alt="Healthcare professionals providing home care services"
						className="w-full h-auto object-cover rounded-lg shadow-lg"
						onError={(e) => {
							console.error('Hero image failed to load');
							e.currentTarget.style.display = 'none';
						}}
					/>
				</div>
			</section>

			{/* Secondary Navigation */}
			<SecondaryNav />

			{/* Page Content */}
			{children}
		</>
	);
}
