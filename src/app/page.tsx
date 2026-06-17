"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
	BookOpen,
	Users,
	ShoppingBag,
	GraduationCap,
	ArrowRight,
} from "lucide-react";
import BenefitsScroll from "@/components/BenefitsScroll";
import AnimatedSection from "@/components/AnimatedSection";

export default function HomePage() {
	const [email, setEmail] = useState("");
	const [subscribed, setSubscribed] = useState(false);
	const [wordIndex, setWordIndex] = useState(0);
	const [fading, setFading] = useState(false);
	const cyclingWords = ["Learn", "Master", "Prosper"];

	useEffect(() => {
		const interval = setInterval(() => {
			setFading(true);
			setTimeout(() => {
				setWordIndex((i) => (i + 1) % 3);
				setFading(false);
			}, 300);
		}, 2000);
		return () => clearInterval(interval);
	}, []);

	function handleSubscribe(e: React.FormEvent) {
		e.preventDefault();
		if (email.trim()) {
			setSubscribed(true);
			setEmail("");
		}
	}

	const featureCards = [
		{
			icon: BookOpen,
			title: "Learn",
			description:
				"Access our curated knowledge base of home care regulations, referral pathways, and best practices to build your agency with confidence.",
			link: "/resources",
			accent: "#0b4f96",
			iconBg: "#0b4f96",
		},
		{
			icon: Users,
			title: "Staffing",
			description:
				"Find, onboard, and manage qualified caregivers. Track credentials, certifications, and compliance documentation in one place.",
			link: "/staffing",
			accent: "#3da777",
			iconBg: "#3da777",
		},
		{
			icon: ShoppingBag,
			title: "Marketplace",
			description:
				"Browse and purchase digital resources, guides, templates, and tools designed specifically for home care agency operators.",
			link: "/marketplace",
			accent: "#e07b2a",
			iconBg: "#e07b2a",
		},
		{
			icon: GraduationCap,
			title: "Training",
			description:
				"Equip your team with the knowledge they need. Access training materials and resources to keep your staff skilled and certified.",
			link: "/resources",
			accent: "#48ccbc",
			iconBg: "#48ccbc",
		},
	];

	return (
		<div className="min-h-screen">
			{/* ── 1. Hero Section ── */}
			<section className="relative overflow-hidden min-h-[520px] flex items-center">
				{/* Background image */}
				<Image
					src="/images/mhc_hero_image.jpeg"
					alt=""
					fill
					className="object-cover object-center"
					priority
				/>
				{/* Navy overlay — mirrors credential tracker hero, unifies with illustration tones */}
				<div className="absolute inset-0 bg-[#0b4f96]/80" />

				{/* Content */}
				<div className="relative z-10 container mx-auto px-6 max-w-[1100px] py-24 md:py-32 text-center">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
						Welcome to Mastering Home Care
					</h1>
					<p className="text-2xl md:text-3xl font-bold text-white mb-10">
						Your one stop to{" "}
						<span
							className="transition-opacity duration-300"
							style={{ color: "#3da777", opacity: fading ? 0 : 1 }}
						>
							{wordIndex === 2 ? "PROSPER IN" : cyclingWords[wordIndex].toUpperCase()}
						</span>{" "}
						<span className="text-white">home care.</span>
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/memberships"
							className="inline-block px-6 py-3 rounded-full font-semibold text-white transition-opacity hover:opacity-90"
							style={{ backgroundColor: "#3da777" }}
						>
							Become a Member
						</Link>
						<Link
							href="/about"
							className="inline-block px-6 py-3 rounded-full font-semibold border-2 transition-colors hover:text-white"
							style={{
								backgroundColor: "#0b4f96",
								borderColor: "#0b4f96",
								color: "#ffffff",
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLAnchorElement).style.backgroundColor =
									"#093d75";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLAnchorElement).style.backgroundColor =
									"#0b4f96";
							}}
						>
							Learn About Us
						</Link>
					</div>
				</div>

				{/* Wave — inside hero, cuts cream shape into navy bottom */}
				<div className="absolute bottom-0 left-0 right-0 z-10">
					<svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ height: '100px' }}>
						<path d="M0 80 C360 0 1080 120 1440 40 L1440 100 L0 100 Z" fill="#fdf6e3" />
					</svg>
				</div>
			</section>

			{/* ── 2. Learn · Master · Prosper Section ── */}
			<section
				className="pb-8 md:pb-10 overflow-hidden"
				style={{ backgroundColor: '#fdf6e3' }}
			>
				<div className="container mx-auto px-6 max-w-[1100px]">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">

						{/* LEARN */}
						<div className="text-center md:text-left md:border-r md:border-gray-200 md:pr-10">
							<p className="text-5xl lg:text-6xl font-black tracking-tight mb-3 leading-none" style={{ color: '#0b4f96' }}>LEARN</p>
							<div className="w-8 h-0.5 mb-4 mx-auto md:mx-0" style={{ backgroundColor: '#48ccbc' }} />
							<p className="text-base leading-relaxed text-gray-500">
								Access our knowledge base of MA regulations, referral pathways, and agency best practices — built for operators, not lawyers.
							</p>
						</div>

						{/* MASTER */}
						<div className="text-center md:border-r md:border-gray-200 md:px-10">
							<p className="text-5xl lg:text-6xl font-black tracking-tight mb-3 leading-none" style={{ color: '#48ccbc' }}>MASTER</p>
							<div className="w-8 h-0.5 mb-4 mx-auto" style={{ backgroundColor: '#3da777' }} />
							<p className="text-base leading-relaxed text-gray-500">
								Track credentials, stay survey-ready, and run your agency operations without the spreadsheet chaos.
							</p>
						</div>

						{/* PROSPER */}
						<div className="text-center md:text-right md:pl-10">
							<p className="text-5xl lg:text-6xl font-black tracking-tight mb-3 leading-none" style={{ color: '#3da777' }}>PROSPER</p>
							<div className="w-8 h-0.5 mb-4 mx-auto md:ml-auto md:mr-0" style={{ backgroundColor: '#e07b2a' }} />
							<p className="text-base leading-relaxed text-gray-500">
								Buy policies, templates, and tools in the Marketplace. Grow your census and build an agency that lasts.
							</p>
						</div>

					</div>

					<div className="flex items-center justify-center gap-3 mt-10 pt-8 border-t border-gray-200">
						<span className="h-px w-6" style={{ backgroundColor: '#48ccbc' }} />
						<p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#48ccbc' }}>
							Built by home care experts · 10+ years of industry experience
						</p>
						<span className="h-px w-6" style={{ backgroundColor: '#48ccbc' }} />
					</div>
				</div>
			</section>

			{/* ── Benefits scroll strip ── */}
			<BenefitsScroll />

			{/* ── 3. Feature Cards Section ── */}
			<section className="pt-8 pb-8 md:pt-10 md:pb-10" style={{ backgroundColor: '#f7f5f0' }}>
				<div className="container mx-auto px-6 max-w-[1100px]">
					<p className="text-xs font-semibold uppercase tracking-widest text-center mb-3" style={{ color: '#3da777' }}>What We Offer</p>
					<h2
						className="text-3xl md:text-4xl font-bold text-center mb-2"
						style={{ color: "#0b4f96" }}
					>
						Everything You Need to Succeed
					</h2>
					<p className="text-gray-500 text-center text-base max-w-xl mx-auto mb-12">
						One platform. Every tool your home care agency needs to launch, operate, and grow.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{featureCards.map((card) => (
							<div
								key={card.title}
								className="rounded-2xl bg-white p-7 flex flex-col items-start hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
								style={{ borderTop: `4px solid ${card.accent}`, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
							>
								<div
									className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
									style={{ backgroundColor: `${card.iconBg}18` }}
								>
									<card.icon className="w-6 h-6" style={{ color: card.iconBg }} />
								</div>
								<h3 className="text-lg font-bold mb-2" style={{ color: "#0b4f96" }}>
									{card.title}
								</h3>
								<p className="text-gray-500 text-base leading-relaxed mb-5 flex-1">
									{card.description}
								</p>
								<Link
									href={card.link}
									className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
									style={{ color: card.accent }}
								>
									Explore <ArrowRight className="w-4 h-4" />
								</Link>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Credential Tracker Teaser ── */}
			<section className="py-14 md:py-16 relative overflow-hidden" style={{ backgroundColor: '#0b4f96' }}>
				{/* Subtle dot grid texture */}
				<div className="absolute inset-0 pointer-events-none" style={{
					backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
					backgroundSize: '18px 18px',
				}} />
				<div className="relative z-10 container mx-auto px-6 max-w-[1100px] flex flex-col md:flex-row items-center justify-between gap-8">
					<div className="max-w-xl">
						<div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(72,204,188,0.15)', color: '#48ccbc' }}>
							<span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#48ccbc' }} />
							Coming Soon — Early Access
						</div>
						<h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 leading-snug">
							Your staff credentials shouldn&apos;t live in a spreadsheet.
						</h2>
						<p className="text-blue-200 text-base leading-relaxed">
							Credential Tracker automatically reads CPR cards, nursing licenses, BCI checks, and more — extracting expiry dates the moment you upload. Your team gets email reminders at 30 and 7 days before anything lapses, and you get a live compliance dashboard showing exactly where your agency stands. No more chasing documents the night before a survey.
						</p>
					</div>
					<div className="flex-shrink-0">
						<Link
							href="/tools/credential-tracker"
							className="inline-flex items-center gap-2 px-7 py-4 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
							style={{ backgroundColor: '#48ccbc', color: 'white' }}
						>
							See How It Works <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</div>
			</section>

			{/* ── 4. Memberships Section ── */}
			<section className="pt-10 pb-16 md:pt-12 md:pb-24" style={{ backgroundColor: '#f4f6f8' }}>
				<div className="container mx-auto px-6 max-w-[1100px]">
					<AnimatedSection animation="fade-up" className="text-center mb-12">
						<p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#48ccbc' }}>Memberships</p>
						<h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#0b4f96' }}>
							Find the Perfect Plan for Your Agency
						</h2>
						<p className="text-gray-500 text-base max-w-xl mx-auto">
							Whether you&apos;re just starting out or scaling an established agency, we have a tier for your stage.
						</p>
					</AnimatedSection>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">

						{/* Free */}
						<AnimatedSection animation="fade-up" delay={0} className="flex">
							<div className="rounded-2xl bg-white p-7 flex flex-col w-full hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
								<div className="mb-5">
									<p className="text-base font-bold mb-1" style={{ color: '#0b4f96' }}>Free</p>
									<p className="text-gray-400 text-xs leading-snug">Start exploring at no cost</p>
								</div>
								<div className="mb-5">
									<span className="text-3xl font-black" style={{ color: '#0b4f96' }}>$0</span>
									<span className="text-gray-400 text-xs ml-1">/ month</span>
								</div>
								<Link href="/auth/signup" className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 mb-5" style={{ borderColor: '#0b4f96', color: '#0b4f96' }}>
									Sign Up →
								</Link>
								<div className="border-t border-gray-100 pt-5 flex-1">
									<ul className="space-y-2.5 text-sm text-gray-600">
										{[
											'Resource Map access',
											'Marketplace browsing',
											'Community updates',
											'Up to 3 staff members',
										].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#48ccbc20', color: '#48ccbc' }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

						{/* Silver */}
						<AnimatedSection animation="fade-up" delay={80} className="flex">
							<div className="rounded-2xl bg-white p-7 flex flex-col w-full hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
								<div className="mb-5">
									<p className="text-base font-bold mb-1" style={{ color: '#0b4f96' }}>Silver</p>
									<p className="text-gray-400 text-xs leading-snug">Essential tools for home care startups</p>
								</div>
								<div className="mb-5">
									<span className="text-3xl font-black" style={{ color: '#0b4f96' }}>$29</span>
									<span className="text-gray-400 text-xs ml-1">/ month</span>
								</div>
								<Link href="/auth/signup" className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 mb-5" style={{ borderColor: '#0b4f96', color: '#0b4f96' }}>
									Sign Up →
								</Link>
								<div className="border-t border-gray-100 pt-5 flex-1">
									<ul className="space-y-2.5 text-sm text-gray-600">
										{[
											'Everything in Free',
											'Business planning templates',
											'Licensing & registration guide',
											'Up to 10 staff members',
											'Basic credential tracking',
										].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#48ccbc20', color: '#48ccbc' }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

						{/* Gold — featured */}
						<AnimatedSection animation="fade-up" delay={160} className="flex">
							<div className="rounded-2xl p-7 flex flex-col w-full relative hover:-translate-y-1 transition-all duration-300" style={{ backgroundColor: '#e8faf7', border: '2px solid #48ccbc', boxShadow: '0 8px 40px rgba(72,204,188,0.22)' }}>
								<div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#48ccbc', color: 'white' }}>MOST POPULAR</div>
								<div className="mb-5">
									<p className="text-base font-bold mb-1" style={{ color: '#0b4f96' }}>Gold</p>
									<p className="text-gray-500 text-xs leading-snug">Comprehensive resources for growing agencies</p>
								</div>
								<div className="mb-5">
									<span className="text-3xl font-black" style={{ color: '#0b4f96' }}>$79</span>
									<span className="text-gray-500 text-xs ml-1">/ month</span>
								</div>
								<Link href="/auth/signup" className="block text-center py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 mb-5" style={{ backgroundColor: '#48ccbc', color: 'white' }}>
									Sign Up →
								</Link>
								<div className="border-t pt-5 flex-1" style={{ borderColor: '#48ccbc40' }}>
									<ul className="space-y-2.5 text-xs text-gray-700">
										{[
											'Everything in Silver',
											'Policy & procedure samples',
											'Marketing toolkit & templates',
											'Up to 30 staff members',
											'AI credential parsing & alerts',
										].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#48ccbc30', color: '#48ccbc' }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

						{/* Premium */}
						<AnimatedSection animation="fade-up" delay={240} className="flex">
							<div className="rounded-2xl bg-white p-7 flex flex-col w-full hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
								<div className="mb-5">
									<p className="text-base font-bold mb-1" style={{ color: '#0b4f96' }}>Premium</p>
									<p className="text-gray-400 text-xs leading-snug">All-in-one toolkit with expert guidance</p>
								</div>
								<div className="mb-5">
									<span className="text-3xl font-black" style={{ color: '#0b4f96' }}>$149</span>
									<span className="text-gray-400 text-xs ml-1">/ month</span>
								</div>
								<Link href="/auth/signup" className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 mb-5" style={{ borderColor: '#0b4f96', color: '#0b4f96' }}>
									Sign Up →
								</Link>
								<div className="border-t border-gray-100 pt-5 flex-1">
									<ul className="space-y-2.5 text-sm text-gray-600">
										{[
											'Everything in Gold',
											'Unlimited staff members',
											'1:1 startup consultation (30 min)',
											'Dedicated onboarding support',
											'Priority support & early access',
										].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#e07b2a18', color: '#e07b2a' }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

					</div>

					{/* Trust strip */}
					<AnimatedSection animation="fade-in" delay={400}>
						<div className="flex flex-wrap items-center justify-center gap-6 mt-10">
							{['Free plan always available', 'Cancel anytime', 'HIPAA-aware platform', '30-day money-back guarantee'].map(t => (
								<span key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
									<span className="font-bold" style={{ color: '#48ccbc' }}>✓</span> {t}
								</span>
							))}
						</div>
					</AnimatedSection>
				</div>
			</section>

			{/* ── 5. Newsletter Section ── */}
			<section className="py-16 md:py-20 relative overflow-hidden" style={{ backgroundColor: '#f7f5f0' }}>
				{/* Dot grid background */}
				<div className="absolute inset-0 pointer-events-none" style={{
					backgroundImage: 'radial-gradient(circle, #d1cfc8 1px, transparent 1px)',
					backgroundSize: '20px 20px',
					opacity: 0.5,
				}} />
				<div className="relative z-10 container mx-auto px-6 max-w-[640px] text-center">
					<p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#3da777' }}>Stay in the loop</p>
					<h2 className="text-2xl md:text-3xl font-bold mb-4 leading-snug" style={{ color: "#0b4f96" }}>
						Get the latest news in home care — straight to your inbox.
					</h2>
					<p className="text-gray-500 mb-8 leading-relaxed text-sm">
						Business insights, regulatory updates, and agency growth tips for home health, hospice, and AFC providers.
					</p>

					{subscribed ? (
						<div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-6 py-4 text-sm font-medium">
							✓ You&apos;re subscribed! Check your inbox soon.
						</div>
					) : (
						<form
							onSubmit={handleSubscribe}
							className="flex flex-col sm:flex-row gap-3 justify-center"
						>
							<input
								type="email"
								required
								placeholder="Enter your email address"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="flex-1 border border-gray-200 rounded-xl px-5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3da777]/40 focus:border-[#3da777] min-w-0 shadow-sm"
							/>
							<button
								type="submit"
								className="px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap shadow-sm"
								style={{ backgroundColor: "#3da777" }}
							>
								Subscribe Today
							</button>
						</form>
					)}
				</div>
			</section>
		</div>
	);
}
