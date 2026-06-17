import Link from "next/link";
import WaitlistForm from "./WaitlistForm";
import AnimatedSection from "./AnimatedSection";
import CredentialMockup from "./CredentialMockup";
import FeatureTabs from "./FeatureTabs";
import {
	Clock,
	FileCheck,
	Users,
	CheckCircle2,
	ArrowRight,
} from "lucide-react";

const credentialTypes = [
	"CPR Certification",
	"RN / LPN License",
	"HHA Certificate",
	"BCI / Background Check",
	"TB Test",
	"Physical Exam",
	"Professional Liability Insurance",
	"Custom Types",
];

const stats = [
	{ value: "50+", label: "Agencies helped" },
	{ value: "AI-parsed", label: "in seconds" },
	{ value: "90/30/14/7", label: "day alerts" },
];

const painPoints = [
	{
		icon: Clock,
		title: "Credentials expire without warning",
		desc: "You find out a staff member's CPR card lapsed when a surveyor asks — not before.",
	},
	{
		icon: FileCheck,
		title: "Spreadsheets don't scale",
		desc: "Tracking 20+ staff × 6+ credential types in Excel is a full-time job nobody signed up for.",
	},
	{
		icon: Users,
		title: "Staff lose track of their own docs",
		desc: "You spend hours chasing documents that should already be on file.",
	},
];

const steps = [
	{
		step: "01",
		title: "Upload any document",
		desc: "PDF, photo, or scan. Any credential type, any format — CPR cards, nursing licenses, BCI checks.",
		color: "#3da777",
	},
	{
		step: "02",
		title: "AI extracts & verifies",
		desc: "Reads issuer, license number, and expiry date automatically. Flags missing info, duplicates, and concerns.",
		color: "#0b4f96",
	},
	{
		step: "03",
		title: "Stay ahead of every deadline",
		desc: "Your team gets alerts at 90, 30, 14, and 7 days. The compliance dashboard shows your agency's full status at a glance.",
		color: "#3da777",
	},
];


export default function CredentialTrackerPage() {
	return (
		<div className="min-h-screen bg-white">

			{/* ── HERO — split layout ── */}
			<section className="relative overflow-hidden" style={{ backgroundColor: "#f8f9fb" }}>
				{/* Subtle dot grid */}
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						backgroundImage: "radial-gradient(circle, rgba(11,79,150,0.05) 1px, transparent 1px)",
						backgroundSize: "24px 24px",
					}}
				/>
				<div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

						{/* Left — text */}
						<div>
							<AnimatedSection animation="fade-up" delay={0}>
								<div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border" style={{ backgroundColor: "rgba(72,204,188,0.1)", borderColor: "rgba(72,204,188,0.3)", color: "#48ccbc" }}>
									<span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#48ccbc" }} />
									Credential Tracker · Early Access
								</div>
							</AnimatedSection>

							<AnimatedSection animation="fade-up" delay={80}>
								<h1 className="font-extrabold leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.8rem, 5vw, 4.5rem)" }}>
									<span className="block" style={{ color: "#0b4f96" }}>UPLOAD.</span>
									<span className="block italic" style={{ color: "#48ccbc" }}>AI READS.</span>
									<span className="block" style={{ color: "#0b4f96" }}>STAY COMPLIANT.</span>
								</h1>
							</AnimatedSection>

							<AnimatedSection animation="fade-up" delay={160}>
								<p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
									Drop in any credential document. Our AI extracts the expiry date, license number, and issuer — then alerts your team at 90, 30, 14, and 7 days before anything lapses.
								</p>
							</AnimatedSection>

							<AnimatedSection animation="fade-up" delay={240}>
								<WaitlistForm variant="hero" darkBg={false} />
								<p className="mt-3 text-xs text-gray-400">
									No credit card · HIPAA-aware · Built for MA home care
								</p>
							</AnimatedSection>

							<AnimatedSection animation="fade-up" delay={320}>
								<div className="flex flex-wrap gap-4 mt-8">
									{stats.map((s) => (
										<div key={s.label} className="flex flex-col">
											<span className="text-xl font-black" style={{ color: "#0b4f96" }}>{s.value}</span>
											<span className="text-xs text-gray-400 leading-tight">{s.label}</span>
										</div>
									))}
								</div>
							</AnimatedSection>
						</div>

						{/* Right — animated mockup */}
						<AnimatedSection animation="slide-right" delay={100} className="flex justify-center lg:justify-end">
							<CredentialMockup />
						</AnimatedSection>
					</div>
				</div>
			</section>

			{/* ── CREDENTIAL TYPES + PAIN POINTS — navy continuation from hero ── */}
			<div className="relative overflow-hidden" style={{ backgroundColor: "#0b4f96" }}>
				<div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
				<div className="relative z-10">
					{/* Credential types strip */}
					<AnimatedSection animation="fade-in">
						<div className="border-b py-5" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
							<div className="max-w-5xl mx-auto px-4 sm:px-6">
								<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
									<span className="text-xs font-semibold uppercase tracking-wider mr-2" style={{ color: "rgba(255,255,255,0.4)" }}>
										Tracks
									</span>
									{credentialTypes.map((type) => (
										<span key={type} className="flex items-center gap-1.5 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
											<CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#3da777" }} />
											{type}
										</span>
									))}
								</div>
							</div>
						</div>
					</AnimatedSection>

					{/* Pain points */}
					<div className="py-16 md:py-20">
						<div className="max-w-5xl mx-auto px-4 sm:px-6">
							<AnimatedSection animation="fade-up" className="text-center mb-12">
								<p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#48ccbc" }}>
									The Problem
								</p>
								<h2 className="text-2xl sm:text-3xl font-bold text-white">
									Credential chaos is costing you time — and putting you at risk.
								</h2>
							</AnimatedSection>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{painPoints.map((point, i) => (
									<AnimatedSection key={i} animation="fade-up" delay={i * 100}>
										<div className="rounded-2xl p-7 h-full hover:-translate-y-1 transition-all duration-300" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
											<div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(239,68,68,0.15)" }}>
												<point.icon className="w-5 h-5" style={{ color: "#fca5a5" }} />
											</div>
											<h3 className="font-bold text-white mb-2 text-base">{point.title}</h3>
											<p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{point.desc}</p>
										</div>
									</AnimatedSection>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ── HOW IT WORKS — white ── */}
			<div className="bg-white py-20">
				<div className="max-w-5xl mx-auto px-4 sm:px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-14">
						<p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#0b4f96" }}>
							How It Works
						</p>
						<h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
							From upload to compliance in three steps.
						</h2>
					</AnimatedSection>
					<div className="relative">
						{/* Connecting line */}
						<div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-[#3da777]/20 via-[#3da777]/50 to-[#3da777]/20" />
						<div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
							{steps.map((s, i) => (
								<AnimatedSection key={i} animation="fade-up" delay={i * 120}>
									<div className="flex flex-col items-center text-center">
										<div
											className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 text-3xl font-black shadow-sm"
											style={{ backgroundColor: `${s.color}18`, color: s.color }}
										>
											{s.step}
										</div>
										<h3 className="font-bold text-gray-900 mb-2 text-lg">{s.title}</h3>
										<p className="text-base text-gray-500 leading-relaxed max-w-xs">{s.desc}</p>
									</div>
								</AnimatedSection>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* ── OUTCOME + FEATURE TABS ── */}
			<div className="py-20" style={{ backgroundColor: "#0b4f96" }}>
				{/* Dot grid */}
				<div className="relative overflow-hidden">
					<div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
					<div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">

						{/* Outcome headline */}
						<AnimatedSection animation="fade-up" className="mb-14">
							<p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#48ccbc" }}>
								— The Headline Outcome
							</p>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
								<div>
									<h2 className="font-extrabold leading-tight text-white mb-6" style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)" }}>
										What if credential chaos{" "}
										<span className="italic" style={{ color: "#48ccbc" }}>stopped costing you hours</span>{" "}
										every single week?
									</h2>
									{/* Big stat */}
									<div className="flex items-end gap-4 mb-6">
										<div>
											<p className="font-black leading-none" style={{ fontSize: "clamp(5rem, 12vw, 8rem)", color: "rgba(72,204,188,0.25)", lineHeight: 1 }}>6+</p>
										</div>
										<div className="pb-3" style={{ borderLeft: "3px solid rgba(72,204,188,0.5)", paddingLeft: "1.25rem" }}>
											<p className="text-white font-bold text-lg leading-snug">hours returned to every<br />agency admin, every month</p>
										</div>
									</div>
									<p className="text-blue-200 text-base leading-relaxed">
										Agencies tracking 20+ staff across 6+ credential types spend 15–30 min per person per month on manual follow-up. Credential Tracker automates all of it.
									</p>
								</div>
								{/* Trust card */}
								<div className="lg:flex lg:justify-end">
									<div className="rounded-2xl p-6 max-w-sm w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
										<div className="flex items-center justify-between mb-4">
											<p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#48ccbc" }}>What agencies say</p>
											<div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: "rgba(61,167,119,0.2)", color: "#3da777" }}>
												✓ Verified
											</div>
										</div>
										<p className="text-white text-sm leading-relaxed mb-4 italic">
											&ldquo;I used to spend Friday afternoons chasing CPR cards. Now I get an email when something is about to expire — before it becomes my problem.&rdquo;
										</p>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#0b4f96", border: "2px solid rgba(72,204,188,0.4)" }}>KN</div>
											<div>
												<p className="text-white text-xs font-semibold">Agency Admin</p>
												<p className="text-blue-300 text-xs">Massachusetts Home Care Agency</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</AnimatedSection>

						{/* Feature tabs */}
						<AnimatedSection animation="fade-up" delay={100}>
							<p className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#3da777" }}>
								Everything included
							</p>
							<FeatureTabs />
						</AnimatedSection>
					</div>
				</div>
			</div>

			{/* ── PRICING ── */}
			<div className="bg-white py-20">
				<div className="max-w-5xl mx-auto px-4 sm:px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-14">
						<p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#48ccbc" }}>Pricing</p>
						<h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "#0b4f96" }}>
							Simple pricing. No surprises.
						</h2>
						<p className="text-gray-500 text-base max-w-xl mx-auto">
							Priced by staff size — pay only for what your agency needs.
						</p>
					</AnimatedSection>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">

						{/* Starter */}
						<AnimatedSection animation="fade-up" delay={0} className="flex">
							<div className="flex flex-col w-full rounded-2xl border border-gray-200 bg-white p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
								<div className="mb-4">
									<p className="font-bold text-gray-900 text-base mb-0.5">Starter</p>
									<p className="text-xs text-gray-400">Up to 10 staff members</p>
								</div>
								<div className="mb-5">
									<span className="text-4xl font-black" style={{ color: "#0b4f96" }}>$49</span>
									<span className="text-gray-400 text-sm ml-1">/ month</span>
								</div>
								<a href="#waitlist" className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 mb-5" style={{ borderColor: "#0b4f96", color: "#0b4f96" }}>
									Join Waitlist →
								</a>
								<div className="border-t border-gray-100 pt-5 flex-1">
									<ul className="space-y-2.5 text-sm text-gray-600">
										{["AI document parsing", "Expiry alerts (30 & 7 days)", "Compliance dashboard", "8+ credential types", "Email support"].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(72,204,188,0.15)", color: "#48ccbc" }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

						{/* Growth — featured */}
						<AnimatedSection animation="fade-up" delay={80} className="flex">
							<div className="flex flex-col w-full rounded-2xl p-6 relative" style={{ backgroundColor: "#0b4f96", boxShadow: "0 8px 32px rgba(11,79,150,0.3)" }}>
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-widest" style={{ backgroundColor: "#48ccbc" }}>
									Most Popular
								</div>
								<div className="mb-4">
									<p className="font-bold text-white text-base mb-0.5">Growth</p>
									<p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Up to 30 staff members</p>
								</div>
								<div className="mb-5">
									<span className="text-4xl font-black text-white">$99</span>
									<span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.6)" }}>/ month</span>
								</div>
								<a href="#waitlist" className="block text-center py-2.5 rounded-xl font-bold text-sm transition-all mb-5 text-white" style={{ backgroundColor: "#3da777" }}>
									Join Waitlist →
								</a>
								<div className="border-t pt-5 flex-1" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
									<ul className="space-y-2.5 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
										{["Everything in Starter", "Multi-tier alerts (90/30/14/7 days)", "License verification engine", "Onboarding checklists by role", "Priority email support"].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(61,167,119,0.25)", color: "#3da777" }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

						{/* Agency */}
						<AnimatedSection animation="fade-up" delay={160} className="flex">
							<div className="flex flex-col w-full rounded-2xl border border-gray-200 bg-white p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
								<div className="mb-4">
									<p className="font-bold text-gray-900 text-base mb-0.5">Agency</p>
									<p className="text-xs text-gray-400">Up to 75 staff members</p>
								</div>
								<div className="mb-5">
									<span className="text-4xl font-black" style={{ color: "#0b4f96" }}>$179</span>
									<span className="text-gray-400 text-sm ml-1">/ month</span>
								</div>
								<a href="#waitlist" className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 mb-5" style={{ borderColor: "#0b4f96", color: "#0b4f96" }}>
									Join Waitlist →
								</a>
								<div className="border-t border-gray-100 pt-5 flex-1">
									<ul className="space-y-2.5 text-sm text-gray-600">
										{["Everything in Growth", "Continuous credential monitoring", "Audit-ready report exports", "Dedicated onboarding call", "Role-based admin permissions"].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(72,204,188,0.15)", color: "#48ccbc" }}>
													<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
												</span>
												{f}
											</li>
										))}
									</ul>
								</div>
							</div>
						</AnimatedSection>

						{/* Enterprise */}
						<AnimatedSection animation="fade-up" delay={240} className="flex">
							<div className="flex flex-col w-full rounded-2xl border border-gray-200 bg-white p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
								<div className="mb-4">
									<p className="font-bold text-gray-900 text-base mb-0.5">Enterprise</p>
									<p className="text-xs text-gray-400">75+ staff members</p>
								</div>
								<div className="mb-5">
									<span className="text-4xl font-black" style={{ color: "#0b4f96" }}>Custom</span>
								</div>
								<a href="mailto:hello@masteringhomecare.com" className="block text-center py-2.5 rounded-xl font-semibold text-sm border-2 transition-all hover:bg-gray-50 mb-5" style={{ borderColor: "#0b4f96", color: "#0b4f96" }}>
									Contact us →
								</a>
								<div className="border-t border-gray-100 pt-5 flex-1">
									<ul className="space-y-2.5 text-sm text-gray-600">
										{["Everything in Agency", "Custom staff limits", "HR/payroll integrations", "White-glove migration", "Dedicated account manager"].map(f => (
											<li key={f} className="flex items-start gap-2">
												<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(72,204,188,0.15)", color: "#48ccbc" }}>
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
					<AnimatedSection animation="fade-up" delay={100}>
						<div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-10">
							{["Join waitlist · no credit card", "HIPAA-aware", "Cancel anytime", "Built for MA home care"].map(t => (
								<span key={t} className="flex items-center gap-1.5 text-sm text-gray-400">
									<span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(72,204,188,0.15)", color: "#48ccbc" }}>
										<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
									</span>
									{t}
								</span>
							))}
						</div>
					</AnimatedSection>
				</div>
			</div>

			{/* ── WAITLIST ── */}
			<div id="waitlist" className="py-20" style={{ backgroundColor: "#f8f9fb" }}>
				<div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
					<AnimatedSection animation="fade-up">
						<p className="text-xs font-semibold text-[#0b4f96] uppercase tracking-wider mb-3">
							Early Access
						</p>
						<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
							Be one of first in the door.
						</h2>
						<p className="text-gray-500 text-base mb-10">
							We&apos;re onboarding a small group of Massachusetts home care agencies.
							Join the waitlist and we&apos;ll keep you posted.
						</p>
					</AnimatedSection>
					<AnimatedSection animation="fade-up" delay={150}>
						<WaitlistForm variant="inline" />
					</AnimatedSection>
				</div>
			</div>

			{/* ── BOTTOM CTA ── */}
			<div className="bg-[#3da777]">
				<AnimatedSection animation="fade-in">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
						<div>
							<p className="text-white font-bold text-lg mb-1">
								Already have an account?
							</p>
							<p className="text-green-100 text-base">
								Sign in to access the full Credential Tracker dashboard.
							</p>
						</div>
						<Link
							href="/auth/signin?callbackUrl=/agency/compliance"
							className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#3da777] rounded-xl font-bold text-sm hover:bg-green-50 transition-colors shadow-sm flex-shrink-0"
						>
							Sign In <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</AnimatedSection>
			</div>
		</div>
	);
}
