"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/useSettings";
import {
	BookOpen,
	Users,
	ShoppingCart,
	TrendingUp,
	CheckCircle,
	ArrowRight
} from "lucide-react";

export default function HomePage() {
	const { settings } = useSettings();
	const [currentSlide, setCurrentSlide] = useState(0);

	const heroSlides = [
		{
			title: "Your One-Stop Platform",
			subtitle: "For launching and managing a thriving marketplace",
			highlight: "Minimal upfront investment"
		},
		{
			title: "Digital Resources",
			subtitle: "Access high-quality content and tools",
			highlight: "Built for success"
		},
		{
			title: "Community Driven",
			subtitle: "Connect with professionals and grow together",
			highlight: "Join today"
		}
	];

	// Auto-rotate hero slides
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
		}, 5000);
		return () => clearInterval(timer);
	}, []);

	const features = [
		{
			icon: BookOpen,
			title: "Resource Library",
			description: "Access comprehensive guides, templates, and educational materials to help you succeed.",
			link: "/marketplace"
		},
		{
			icon: Users,
			title: "Community & Networking",
			description: "Connect with like-minded professionals and share knowledge through our directory.",
			link: "/knowledge-base"
		},
		{
			icon: ShoppingCart,
			title: "Marketplace",
			description: "Browse and purchase high-quality digital products tailored to your needs.",
			link: "/marketplace"
		},
		{
			icon: TrendingUp,
			title: "Dashboard & Analytics",
			description: "Track your progress and manage your resources from a single dashboard.",
			link: "/dashboard"
		}
	];

	const benefits = [
		"Comprehensive resource library",
		"Expert-curated content",
		"Community support",
		"Regular updates and new content",
		"Affordable pricing",
		"Easy-to-use platform"
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section with Slider */}
			<section className="relative bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] text-white overflow-hidden">
				<div className="absolute inset-0 bg-black opacity-10"></div>
				<div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
					<div className="max-w-4xl mx-auto text-center">
						{/* Animated Hero Content */}
						<div className="transition-opacity duration-500">
							<h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
								{heroSlides[currentSlide].title}
							</h1>
							<p className="text-xl md:text-2xl mb-4 text-gray-100">
								{heroSlides[currentSlide].subtitle}
							</p>
							<p className="text-lg md:text-xl mb-8 text-[#48ccbc] font-semibold">
								{heroSlides[currentSlide].highlight}
							</p>
						</div>

						{/* CTA Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
							<Link
								href="/marketplace"
								className="bg-white text-[#0B4F96] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
							>
								Browse Marketplace
								<ArrowRight className="h-5 w-5" />
							</Link>
							<Link
								href="/auth/signin"
								className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#0B4F96] transition-all"
							>
								Get Started
							</Link>
						</div>

						{/* Slide Indicators */}
						<div className="flex justify-center gap-2 mt-8">
							{heroSlides.map((_, index) => (
								<button
									key={index}
									onClick={() => setCurrentSlide(index)}
									className={`w-3 h-3 rounded-full transition-all ${
										index === currentSlide
											? "bg-white w-8"
											: "bg-white/50 hover:bg-white/75"
									}`}
									aria-label={`Go to slide ${index + 1}`}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Decorative Wave */}
				<div className="absolute bottom-0 left-0 right-0">
					<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
							fill="#F9FAFB"
						/>
					</svg>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 bg-gray-50">
				<div className="container mx-auto px-4">
					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							Everything You Need to Succeed
						</h2>
						<p className="text-xl text-gray-600 max-w-2xl mx-auto">
							{settings.siteDescription}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
						{features.map((feature, index) => (
							<Link
								key={index}
								href={feature.link}
								className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-8 text-center group hover:-translate-y-1"
							>
								<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-full mb-6 group-hover:scale-110 transition-transform">
									<feature.icon className="h-8 w-8 text-white" />
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-3">
									{feature.title}
								</h3>
								<p className="text-gray-600 leading-relaxed">
									{feature.description}
								</p>
								<div className="mt-4 text-[#0B4F96] font-medium flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
									Learn More <ArrowRight className="h-4 w-4" />
								</div>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-20 bg-white">
				<div className="container mx-auto px-4">
					<div className="max-w-6xl mx-auto">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
							{/* Left Column - Content */}
							<div>
								<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
									Why Choose {settings.siteName}?
								</h2>
								<p className="text-lg text-gray-600 mb-8">
									We provide everything you need to launch, grow, and manage your digital journey with confidence and ease.
								</p>
								<div className="space-y-4">
									{benefits.map((benefit, index) => (
										<div key={index} className="flex items-start gap-3">
											<CheckCircle className="h-6 w-6 text-[#48ccbc] flex-shrink-0 mt-0.5" />
											<span className="text-gray-700 text-lg">{benefit}</span>
										</div>
									))}
								</div>
								<div className="mt-8">
									<Link
										href="/marketplace"
										className="inline-flex items-center gap-2 bg-[#0B4F96] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#48ccbc] transition-all shadow-lg hover:shadow-xl"
									>
										Explore Resources
										<ArrowRight className="h-5 w-5" />
									</Link>
								</div>
							</div>

							{/* Right Column - Visual */}
							<div className="relative">
								<div className="bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-2xl p-8 text-white shadow-2xl">
									<div className="space-y-6">
										<div className="bg-white/10 backdrop-blur rounded-lg p-6">
											<div className="flex items-center gap-4 mb-3">
												<div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
													<BookOpen className="h-6 w-6" />
												</div>
												<div>
													<div className="font-semibold text-lg">1000+</div>
													<div className="text-sm text-gray-200">Resources</div>
												</div>
											</div>
										</div>
										<div className="bg-white/10 backdrop-blur rounded-lg p-6">
											<div className="flex items-center gap-4 mb-3">
												<div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
													<Users className="h-6 w-6" />
												</div>
												<div>
													<div className="font-semibold text-lg">5000+</div>
													<div className="text-sm text-gray-200">Community Members</div>
												</div>
											</div>
										</div>
										<div className="bg-white/10 backdrop-blur rounded-lg p-6">
											<div className="flex items-center gap-4 mb-3">
												<div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
													<TrendingUp className="h-6 w-6" />
												</div>
												<div>
													<div className="font-semibold text-lg">98%</div>
													<div className="text-sm text-gray-200">Satisfaction Rate</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-r from-[#0B4F96] to-[#48ccbc] text-white">
				<div className="container mx-auto px-4">
					<div className="max-w-4xl mx-auto text-center">
						<h2 className="text-3xl md:text-4xl font-bold mb-6">
							Ready to Get Started?
						</h2>
						<p className="text-xl mb-8 text-gray-100">
							Join thousands of professionals who are already using {settings.siteName} to achieve their goals.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/auth/signin"
								className="bg-white text-[#0B4F96] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
							>
								Create Account
							</Link>
							<Link
								href="/knowledge-base"
								className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#0B4F96] transition-all"
							>
								Learn More
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer Info Section */}
			<section className="py-12 bg-gray-900 text-gray-300">
				<div className="container mx-auto px-4">
					<div className="max-w-6xl mx-auto text-center">
						<p className="text-lg mb-4">
							Have questions? Contact us at{" "}
							<a
								href={`mailto:${settings.contactEmail}`}
								className="text-[#48ccbc] hover:underline"
							>
								{settings.contactEmail}
							</a>
						</p>
						<p className="text-sm text-gray-400">
							© {new Date().getFullYear()} {settings.siteName}. All rights reserved.
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
