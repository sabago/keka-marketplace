import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import SignInForm from "@/components/SignInForm";

export default function SignInPage() {
	return (
		<div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center px-4 py-12">
			<div className="w-full max-w-md">
				{/* Sign In Card */}
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
					{/* Logo + Heading */}
					<div className="text-center mb-8">
						<div className="flex justify-center mb-5">
							<Image
								src="/images/logo-full.png"
								alt="Mastering HomeCare"
								height={48}
								width={200}
								className="h-12 w-auto"
								priority
							/>
						</div>
						<h1 className="text-2xl font-bold text-[#0b4f96] mb-2">
							Welcome to Mastering Home Care
						</h1>
						<p className="text-gray-500 text-sm">
							Please enter your email and password to sign in
						</p>
					</div>

					<Suspense
						fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-lg" />}
					>
						<SignInForm />
					</Suspense>
				</div>

				{/* Join Community Link */}
				<div className="text-center mb-6">
					<p className="text-gray-600 text-sm">
						New to Mastering HomeCare?{" "}
						<Link
							href="/community"
							className="text-[#0b4f96] hover:text-[#48ccbc] font-semibold"
						>
							Join our community
						</Link>
					</p>
				</div>

				{/* Additional Links */}
				<div className="pt-6 border-t border-gray-200 text-center space-y-2">
					<p className="text-sm text-gray-600">
						<Link
							href="/pricing"
							className="text-[#0b4f96] hover:text-[#48ccbc] font-semibold"
						>
							View Pricing
						</Link>
						{" • "}
						<Link
							href="/resources/knowledge-base"
							className="text-[#0b4f96] hover:text-[#48ccbc] font-semibold"
						>
							Browse Directory
						</Link>
					</p>
					<p className="text-xs text-gray-500">
						By signing in, you agree to our{" "}
						<Link href="/terms" className="underline hover:text-[#0b4f96]">
							Terms of Service
						</Link>{" "}
						and{" "}
						<Link href="/privacy" className="underline hover:text-[#0b4f96]">
							Privacy Policy
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
