"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	ShieldCheck,
	MessageCircle,
	BookOpen,
	TrendingUp,
	CheckCircle,
	ArrowRight,
	MapPin,
	PlayCircle,
} from "lucide-react";

export default function HomePage() {
	const rotations = [
		"tracks every credential",
		"answers every intake question",
		"maps every referral pathway",
		"stays audit-ready",
	];
	const [idx, setIdx] = useState(0);
	const [animating, setAnimating] = useState(false);

	useEffect(() => {
		const iv = setInterval(() => {
			setAnimating(true);
			setTimeout(() => {
				setIdx((prev) => (prev + 1) % rotations.length);
				setAnimating(false);
			}, 300);
		}, 3200);
		return () => clearInterval(iv);
	}, []);

	const features = [
		{
			icon: ShieldCheck,
			title: "Credential shelf-life, tracked",
			copy:
				"Drop in a PDF of a CPR card, RN license, BCI, or HHA cert. We parse the expiry and alert the right staff at 30 and 7 days.",
			link: "/agency/compliance",
		},
		{
			icon: MessageCircle,
			title: "Answers grounded in 1,200+ MA sources",
			copy:
				"Every response cites a Pinecone-indexed source. No hallucinated phone numbers. No \u201CI don\u2019t have data after 2023.\u201D",
			link: "/knowledge-base",
		},
		{
			icon: BookOpen,
			title: "The MA referral directory",
			copy:
				"Hospitals, ASAPs, ACOs, Councils on Aging, Veteran programs, MassHealth waivers — categorized, geocoded, kept current.",
			link: "/knowledge-base",
		},
		{
			icon: TrendingUp,
			title: "Know where your patients come from",
			copy:
				"Log each inbound referral, tag the source, and see your pipeline by ZIP, by category, by month. Export to CSV anytime.",
			link: "/dashboard/referrals",
		},
	];

	const benefits = [
		"AI-parsed credential tracking for RN, HHA, CPR, BCI, and more",
		"Grounded local referral chatbot with 100+ indexed sources",
		"Automated 30-day and 7-day expiration reminders",
		"Compliance dashboard with agency-wide scores",
		"Tiered plans starting free with no credit card required",
		"HIPAA-aware by default, audit log on every action",
	];

	const stats = [
		{ value: "84%", label: "Compliance score" },
		{ value: "23", label: "Staff tracked" },
		{ value: "12", label: "Referrals this month" },
		{ value: "107", label: "MA sources indexed" },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section */}
			<section className="relative bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] text-white overflow-hidden">
				<div className="absolute inset-0 bg-black opacity-10 pointer-events-none" />

				{/* Decorative orbs */}
				<div
					className="absolute rounded-full pointer-events-none"
					style={{
						width: 520,
						height: 520,
						top: -120,
						left: -80,
						background:
							"radial-gradient(circle, rgba(124,240,224,0.45) 0%, transparent 60%)",
						filter: "blur(40px)",
					}}
					aria-hidden="true"
				/>
				<div
					className="absolute rounded-full pointer-events-none"
					style={{
						width: 420,
						height: 420,
						bottom: -160,
						right: "10%",
						background:
							"radial-gradient(circle, rgba(91,168,255,0.35) 0%, transparent 60%)",
						filter: "blur(40px)",
					}}
					aria-hidden="true"
				/>

				<div className="container mx-auto px-6 py-20 md:py-28 relative z-10 max-w-[1200px]">
					<div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
						{/* Left column */}
						<div>
							{/* Badge */}
							<span className="inline-flex items-center gap-2 bg-[#48ccbc] text-white text-sm font-semibold px-4 py-2 rounded-full mb-6">
								<MapPin className="w-3.5 h-3.5" />
								Built for ALL home-care &amp; AFC agencies
							</span>

							{/* Headline */}
							<h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.05] tracking-tight text-white mb-5">
								The platform that{" "}
								<span
									className="block text-[#c7f3ed] transition-opacity duration-300"
									style={{ opacity: animating ? 0 : 1 }}
									aria-live="polite"
								>
									{rotations[idx]}
								</span>
							</h1>

							{/* Sub-headline */}
							<p className="text-lg leading-relaxed text-white/90 mb-7 max-w-[520px]">
								Mastering HomeCare keeps your RN, HHA, CPR and BCI credentials ahead of
								their expiry dates, indexes every referral pathway in home care, and
								answers grounded questions about any source — from Local Hospitals&apos;
								Discharge Planning to your local Council on Aging.
							</p>

							{/* CTAs */}
							<div className="flex flex-wrap gap-3 mb-5">
								<Link
									href="/auth/signin"
									className="inline-flex items-center gap-2 bg-white text-[#0B4F96] font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
								>
									<ArrowRight className="w-4 h-4" />
									Get 20 free queries
								</Link>
								<Link
									href="/marketplace"
									className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/20 hover:border-white/50 transition-all"
								>
									<PlayCircle className="w-4 h-4" />
									Browse resources
								</Link>
							</div>

							<p className="text-xs text-white/70">
								No credit card. HIPAA-aware by default. Cancel anytime from Agency
								Settings.
							</p>
						</div>

						{/* Right column — stat tile */}
						<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-7">
							<div className="flex items-center gap-2.5 mb-1">
								<span className="w-2 h-2 rounded-full bg-[#7CF0E0]" />
								<span className="text-[11px] uppercase tracking-widest text-white/80">
									Sunrise Home Care · live
								</span>
							</div>
							<div className="text-[22px] font-semibold text-white mb-4">
								A quiet Tuesday morning
							</div>
							<div className="grid grid-cols-2 gap-3.5">
								{stats.map((s) => (
									<div key={s.label} className="bg-white/10 rounded-lg p-4">
										<div className="text-[28px] font-bold text-white leading-none">
											{s.value}
										</div>
										<div className="text-[12px] text-white/78 mt-1">{s.label}</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Wave */}
				<svg
					className="absolute bottom-0 left-0 w-full"
					viewBox="0 0 1440 60"
					preserveAspectRatio="none"
					xmlns="http://www.w3.org/2000/svg"
					style={{ height: 60 }}
				>
					<path
						d="M0,40 C240,60 480,0 720,20 C960,40 1200,60 1440,30 L1440,60 L0,60 Z"
						fill="#F9FAFB"
					/>
				</svg>
			</section>

			{/* Features Section */}
			<section
				className="py-18 bg-gray-50"
				style={{ paddingTop: 72, paddingBottom: 72 }}
			>
				<div className="container mx-auto px-6 max-w-[1200px]">
					<div className="text-center mb-10">
						<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
							Four tools. One clean dashboard.
						</h2>
						<p className="text-lg text-gray-600 max-w-[640px] mx-auto">
							No marketing copy pretending to be a platform. Four things we do well,
							built with operators who actually run MA home-care agencies.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
						{features.map((f) => (
							<Link
								key={f.title}
								href={f.link}
								className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-7 text-center group hover:-translate-y-1"
							>
								<div className="w-14 h-14 bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
									<f.icon className="h-6 w-6 text-white" />
								</div>
								<h3 className="text-[17px] font-semibold text-gray-900 mb-2 leading-snug">
									{f.title}
								</h3>
								<p className="text-sm text-gray-600 leading-relaxed">{f.copy}</p>
								<div className="mt-4 text-[#0B4F96] text-sm font-medium flex items-center justify-center gap-1 group-hover:gap-2 transition-all">
									Learn more <ArrowRight className="h-3.5 w-3.5" />
								</div>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-20 bg-white">
				<div className="container mx-auto px-6 max-w-[1200px]">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
						{/* Left — copy */}
						<div>
							<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">
								Why Mastering HomeCare?
							</h2>
							<p className="text-lg text-gray-600 mb-7">
								Built by home-care operators for home-care operators. Every feature
								exists because someone needed to keep their agency compliant and their
								referral funnel moving.
							</p>
							<div className="space-y-3.5">
								{benefits.map((b) => (
									<div key={b} className="flex items-start gap-3">
										<CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
										<span className="text-gray-700">{b}</span>
									</div>
								))}
							</div>
							<div className="mt-8">
								<Link
									href="/marketplace"
									className="inline-flex items-center gap-2 bg-[#0B4F96] text-white px-7 py-3.5 rounded-lg font-semibold hover:bg-[#0a4280] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
								>
									Explore Resources
									<ArrowRight className="h-4 w-4" />
								</Link>
							</div>
						</div>

						{/* Right — stat card */}
						<div className="relative">
							<div className="bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-2xl p-8 text-white shadow-2xl">
								<div className="space-y-5">
									<div className="bg-white/10 backdrop-blur rounded-lg p-5">
										<div className="flex items-center gap-4">
											<div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
												<ShieldCheck className="h-5 w-5" />
											</div>
											<div>
												<div className="font-bold text-lg">1,200+</div>
												<div className="text-sm text-white/80">MA Referral Sources</div>
											</div>
										</div>
									</div>
									<div className="bg-white/10 backdrop-blur rounded-lg p-5">
										<div className="flex items-center gap-4">
											<div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
												<TrendingUp className="h-5 w-5" />
											</div>
											<div>
												<div className="font-bold text-lg">500+</div>
												<div className="text-sm text-white/80">Agencies Using Platform</div>
											</div>
										</div>
									</div>
									<div className="bg-white/10 backdrop-blur rounded-lg p-5">
										<div className="flex items-center gap-4">
											<div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
												<CheckCircle className="h-5 w-5" />
											</div>
											<div>
												<div className="font-bold text-lg">98%</div>
												<div className="text-sm text-white/80">Satisfaction Rate</div>
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
				<div className="container mx-auto px-6 max-w-[1200px]">
					<div className="max-w-3xl mx-auto text-center">
						<h2 className="text-3xl md:text-4xl font-bold mb-5">
							Ready to get compliant and stay there?
						</h2>
						<p className="text-lg text-white/90 mb-8">
							Join home-care agencies across Massachusetts using Mastering HomeCare to
							track credentials, source referrals, and answer any intake question
							instantly.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/auth/signin"
								className="bg-white text-[#0B4F96] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
							>
								Create Free Account
							</Link>
							<Link
								href="/knowledge-base"
								className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-[#0B4F96] transition-all"
							>
								Browse the Directory
							</Link>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
