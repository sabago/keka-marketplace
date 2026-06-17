import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import {
	Heart,
	Users,
	Shield,
	Star,
	ArrowRight,
	ExternalLink,
} from "lucide-react";

const stats = [
	{ value: "50+", label: "Agencies helped" },
	{ value: "10+", label: "Years of experience" },
	{ value: "1", label: "Platform for everything" },
];

const values = [
	{
		icon: Heart,
		name: "Compassion",
		desc:
			"We center every decision around the people being cared for — clients, caregivers, and the operators who support them.",
		accent: "#3da777",
	},
	{
		icon: Star,
		name: "Expertise",
		desc:
			"Over a decade of real-world home care experience informs every tool, resource, and recommendation we offer.",
		accent: "#48ccbc",
	},
	{
		icon: Users,
		name: "Community",
		desc:
			"We believe in collective growth — agencies succeed faster when they learn from and support one another.",
		accent: "#3da777",
	},
	{
		icon: Shield,
		name: "Integrity",
		desc:
			"Transparent, HIPAA-aware, and honest in everything we build — we hold ourselves to the same standards we help agencies meet.",
		accent: "#48ccbc",
	},
];

const offerings = [
	{
		title: "Educational Resources",
		desc:
			"Courses, webinars, and guides to help you navigate compliance, licensing, business strategy, and patient care.",
		accent: "#48ccbc",
	},
	{
		title: "Networking Opportunities",
		desc:
			"Connect with industry leaders and peers to share best practices and build meaningful partnerships.",
		accent: "#3da777",
	},
	{
		title: "Business Support",
		desc:
			"Actionable strategies for launching or scaling your agency — growth, operational efficiency, and financial success.",
		accent: "#48ccbc",
	},
	{
		title: "Employee Development",
		desc:
			"Resources for staff training, certification, and professional growth to deliver exceptional care.",
		accent: "#3da777",
	},
	{
		title: "Student Engagement",
		desc:
			"Mentorship, career guidance, and learning materials for students exploring a career in home care.",
		accent: "#48ccbc",
	},
];

export default function AboutPage() {
	return (
		<div className="min-h-screen bg-white">
			{/* ── 1. Hero — cream ── */}
			<section
				className="pt-20 pb-8 md:pt-28 md:pb-10"
				style={{ backgroundColor: "#fdf6e3" }}
			>
				<div className="max-w-3xl mx-auto px-6 text-center">
					<AnimatedSection animation="fade-up" delay={0}>
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4"
							style={{ color: "#3da777" }}
						>
							About Us
						</p>
					</AnimatedSection>
					<AnimatedSection animation="fade-up" delay={100}>
						<h1
							className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 leading-tight"
							style={{ color: "#0b4f96" }}
						>
							About Mastering Home Care
						</h1>
					</AnimatedSection>
					<AnimatedSection animation="fade-up" delay={200}>
						<p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
							A platform proudly created by Keka Rehab Services to empower the home
							care industry through collaboration, networking, and access to invaluable
							resources. Whether you are an aspiring entrepreneur, an agency owner, an
							employee, or a student — Mastering Home Care is your one-stop resource
							for learning, growing, and succeeding in home care.
						</p>
					</AnimatedSection>
				</div>
			</section>

			{/* ── 2. Stat Strip — cream → wave → navy ── */}
			<section style={{ backgroundColor: "#fdf6e3" }} className="pb-0">
				<div className="max-w-5xl mx-auto px-6 pb-10">
					{/* Decorative divider */}
					<div className="flex items-center gap-4 mb-8">
						<div
							className="flex-1 h-px"
							style={{ background: "linear-gradient(to right, transparent, #0b4f96)" }}
						/>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: "#48ccbc" }}
						/>
						<div
							className="w-1.5 h-1.5 rounded-full"
							style={{ backgroundColor: "#3da777" }}
						/>
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: "#48ccbc" }}
						/>
						<div
							className="flex-1 h-px"
							style={{ background: "linear-gradient(to left, transparent, #0b4f96)" }}
						/>
					</div>
					<AnimatedSection animation="fade-up">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-gray-200">
							{stats.map((s) => (
								<div key={s.value} className="text-center py-6 px-4">
									<p
										className="text-4xl md:text-5xl font-black mb-1"
										style={{ color: "#0b4f96" }}
									>
										{s.value}
									</p>
									<p className="text-sm text-gray-500 leading-snug">{s.label}</p>
								</div>
							))}
						</div>
					</AnimatedSection>
				</div>
				<svg
					viewBox="0 0 1440 80"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className="w-full block"
					preserveAspectRatio="none"
					style={{ height: "80px" }}
				>
					<path d="M0 60 C360 0 1080 90 1440 30 L1440 80 L0 80 Z" fill="#0b4f96" />
				</svg>
			</section>

			{/* ── 3. Origin Story — navy ── */}
			<section
				className="py-14 md:py-20 relative overflow-hidden"
				style={{ backgroundColor: "#0b4f96" }}
			>
				{/* Dot grid texture */}
				<div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
				<div className="relative z-10 max-w-5xl mx-auto px-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
						{/* Image */}
						<AnimatedSection animation="slide-left">
							<div className="relative rounded-2xl overflow-hidden aspect-[4/3]" style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }}>
								<Image src="/images/mhc-origin-story.png" alt="Keka Rehab Services therapist working with patient" fill className="object-cover object-center" />
								{/* Teal border accent */}
								<div className="absolute inset-0 rounded-2xl" style={{ border: "2px solid rgba(72,204,188,0.4)" }} />
							</div>
						</AnimatedSection>
						{/* Text */}
						<AnimatedSection animation="slide-right" delay={100}>
							<p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#3da777" }}>Our Origin Story</p>
							<h2 className="text-2xl sm:text-3xl font-bold mb-5 text-white leading-snug">
								From a village healer in Uganda to 50+ agencies in Massachusetts.
							</h2>
							<p className="text-blue-200 text-base leading-relaxed">
								Mastering Home Care grew out of over a decade of hands-on work in the Massachusetts home care industry — helping agencies launch, stay compliant, and grow, entirely through trust and referrals. It was built to scale that guidance so every operator has access to the tools and knowledge that used to take years to find.
							</p>
						</AnimatedSection>
					</div>
				</div>
			</section>

			{/* ── 4. Mission — warm off-white ── */}
			<section
				className="py-14 md:py-20 relative overflow-hidden"
				style={{ backgroundColor: "#f7f5f0" }}
			>
				{/* Giant decorative quote mark */}
				<div
					className="absolute -top-6 left-1/2 -translate-x-1/2 text-[180px] font-black leading-none pointer-events-none select-none"
					style={{ color: "rgba(11,79,150,0.05)" }}
				>
					&ldquo;
				</div>
				<div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
					<AnimatedSection animation="fade-up">
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4"
							style={{ color: "#48ccbc" }}
						>
							Our Mission
						</p>
						<h2
							className="text-2xl sm:text-3xl font-bold mb-5 leading-snug"
							style={{ color: "#0b4f96" }}
						>
							Educate, connect, and inspire the home care community.
						</h2>
						<p className="text-gray-500 text-base leading-relaxed">
							At Mastering Home Care, our mission is to educate, connect, and inspire
							individuals and organizations to build a stronger, more efficient, and
							compassionate home care industry. We aim to provide the tools and
							insights necessary to help you start, grow, and scale your home care
							ambitions while maintaining the highest standards of care.
						</p>
					</AnimatedSection>
				</div>
			</section>

			{/* ── 5. Core Values — navy ── */}
			<section
				className="py-16 md:py-20 relative overflow-hidden"
				style={{ backgroundColor: "#0b4f96" }}
			>
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						backgroundImage:
							"radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
						backgroundSize: "18px 18px",
					}}
				/>
				<div className="relative z-10 max-w-5xl mx-auto px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-12">
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4"
							style={{ color: "#3da777" }}
						>
							Our Core Values
						</p>
						<h2 className="text-2xl sm:text-3xl font-bold text-white">
							What we stand for
						</h2>
					</AnimatedSection>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
						{values.map((v, i) => (
							<AnimatedSection key={v.name} animation="fade-up" delay={i * 80}>
								<div
									className="rounded-2xl p-6 h-full hover:-translate-y-1 transition-all duration-300"
									style={{
										backgroundColor: "rgba(255,255,255,0.07)",
										border: "1px solid rgba(255,255,255,0.1)",
									}}
								>
									<div
										className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
										style={{ backgroundColor: `${v.accent}25` }}
									>
										<v.icon className="w-5 h-5" style={{ color: v.accent }} />
									</div>
									<h3 className="font-bold text-base mb-2 text-white">{v.name}</h3>
									<p className="text-base text-blue-200 leading-relaxed">{v.desc}</p>
								</div>
							</AnimatedSection>
						))}
					</div>
				</div>
			</section>

			{/* ── 6. What We Offer — white ── */}
			<section className="bg-white py-16 md:py-20">
				<div className="max-w-5xl mx-auto px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-12">
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4"
							style={{ color: "#48ccbc" }}
						>
							What We Offer
						</p>
						<h2
							className="text-2xl sm:text-3xl font-bold mb-3"
							style={{ color: "#0b4f96" }}
						>
							A comprehensive platform for the home care community
						</h2>
					</AnimatedSection>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
						<AnimatedSection animation="slide-left" delay={80}>
							<div className="flex flex-col gap-3">
								{offerings.map((item) => (
									<div
										key={item.title}
										className="flex items-start gap-4 p-4 rounded-xl hover:shadow-md transition-all duration-300"
										style={{ backgroundColor: "#f7f5f0" }}
									>
										<div
											className="w-1 self-stretch rounded-full flex-shrink-0"
											style={{ backgroundColor: item.accent }}
										/>
										<div>
											<h3 className="font-bold text-base mb-1" style={{ color: "#0b4f96" }}>
												{item.title}
											</h3>
											<p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
										</div>
									</div>
								))}
							</div>
						</AnimatedSection>

						<AnimatedSection animation="slide-right">
							<div
								className="relative rounded-2xl overflow-hidden w-full aspect-[4/3]"
								style={{ boxShadow: "0 16px 48px rgba(11,79,150,0.12)" }}
							>
								<Image
									src="/images/home-care-home-health.webp"
									alt="Home care nurse reviewing documents with patient"
									fill
									className="object-cover object-center"
								/>
							</div>
						</AnimatedSection>
					</div>
				</div>
			</section>

			{/* ── 7. Why Choose Us — light gray ── */}
			<section className="py-16 md:py-20" style={{ backgroundColor: "#f4f6f8" }}>
				<div className="max-w-5xl mx-auto px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-12">
						<p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#48ccbc" }}>
							Why Choose Us
						</p>
						<h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "#0b4f96" }}>
							Why Mastering Home Care?
						</h2>
					</AnimatedSection>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						{[
							{
								title: "Expert-Driven Content",
								desc: "With Keka Rehab Services' deep expertise in the home care industry, our platform is built on real-world experience and proven strategies.",
								accent: "#0b4f96",
							},
							{
								title: "Community Focus",
								desc: "We believe in the power of collaboration and are committed to fostering a supportive and inclusive environment for all members.",
								accent: "#48ccbc",
							},
							{
								title: "Passion for Quality Care",
								desc: "We share your commitment to providing compassionate, high-quality care to those who need it most.",
								accent: "#3da777",
							},
							{
								title: "Scalable Solutions",
								desc: "Whether you're just starting or looking to expand, our tools and resources are tailored to meet you where you are and help you achieve your goals.",
								accent: "#e07b2a",
							},
						].map((item, i) => (
							<AnimatedSection key={item.title} animation="fade-up" delay={i * 80}>
								<div
									className="bg-white rounded-2xl p-7 h-full hover:-translate-y-1 transition-all duration-300"
									style={{
										boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
										borderTop: `4px solid ${item.accent}`,
									}}
								>
									<h3 className="font-bold text-base mb-2" style={{ color: "#0b4f96" }}>
										{item.title}
									</h3>
									<p className="text-base text-gray-500 leading-relaxed">{item.desc}</p>
								</div>
							</AnimatedSection>
						))}
					</div>
				</div>
			</section>

			{/* ── 8. Meet the Founder — white ── */}
			<section className="py-16 md:py-20 bg-white">
				<div className="max-w-5xl mx-auto px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-12">
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4"
							style={{ color: "#48ccbc" }}
						>
							Meet the Founder
						</p>
						{/* <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "#0b4f96" }}>Dr. Kennedy Ndamba</h2> */}
					</AnimatedSection>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
						<AnimatedSection animation="slide-left">
							<div className="relative">
								<div
									className="rounded-2xl overflow-hidden aspect-[4/5] w-full max-w-sm mx-auto md:mx-0"
									style={{ boxShadow: "0 16px 48px rgba(11,79,150,0.15)" }}
								>
									<Image
										src="/images/dr-kennedy.jpg"
										alt="Dr. Kennedy Ndamba — Founder of Mastering Home Care"
										fill
										className="object-cover object-top"
									/>
								</div>
								<div
									className="absolute -bottom-4 left-1/2 md:left-8 -translate-x-1/2 md:translate-x-0 px-4 py-2 rounded-full text-xs font-bold text-white whitespace-nowrap"
									style={{
										backgroundColor: "#48ccbc",
										boxShadow: "0 4px 16px rgba(72,204,188,0.4)",
									}}
								>
									Founder &amp; CEO
								</div>
							</div>
						</AnimatedSection>

						<AnimatedSection animation="slide-right" delay={100}>
							<div className="pt-8 md:pt-0">
								<h3 className="text-xl font-bold mb-1" style={{ color: "#0b4f96" }}>
									Dr. Kennedy Ndamba
								</h3>
								<p className="text-base mb-5" style={{ color: "#48ccbc" }}>
									Founder, Mastering Home Care · CEO, Keka Rehab Services
								</p>
								<p className="text-gray-500 text-base leading-relaxed mb-4">
									Raised in rural Uganda by his great-grandmother Jajja Meeme — a village
									healer who lived past 100 — Dr. Kennedy built Keka Rehab Services into a
									Massachusetts home care staffing and consulting firm spanning physical
									therapy, mobile therapy, non-medical transportation, and agency consultation.
								</p>
								<p className="text-gray-500 text-base leading-relaxed mb-6">
									More than 50 agencies have gotten their start through Dr. Kennedy's
									guidance — entirely through referrals, never paid marketing. Mastering
									Home Care was built to scale that trust so every operator can access it.
								</p>
								<a
									href="https://kekarehabservices.com/about-us/"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
									style={{ color: "#0b4f96" }}
								>
									Learn more about Keka Rehab Services{" "}
									<ExternalLink className="w-4 h-4" />
								</a>
							</div>
						</AnimatedSection>
					</div>
				</div>
			</section>

			{/* ── 8. Who We Serve — navy ── */}
			<section
				className="py-16 md:py-20 relative overflow-hidden"
				style={{ backgroundColor: "#0b4f96" }}
			>
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						backgroundImage:
							"radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
						backgroundSize: "18px 18px",
					}}
				/>
				<div className="relative z-10 max-w-5xl mx-auto px-6">
					<AnimatedSection animation="fade-up" className="text-center mb-12">
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4"
							style={{ color: "#48ccbc" }}
						>
							Who We Serve
						</p>
						<h2 className="text-2xl sm:text-3xl font-bold text-white">
							Built for every stage of your agency&apos;s journey
						</h2>
					</AnimatedSection>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[
							{
								label: "New operators",
								desc:
									"Navigating licensing, referral networks, and first hires — we help you get off the ground with confidence.",
							},
							{
								label: "Growing agencies",
								desc:
									"Scaling staff, managing credentials, and tracking compliance — without the spreadsheet chaos.",
							},
							{
								label: "Established providers",
								desc:
									"Optimizing workflows, staying ahead of audits, and building the infrastructure for long-term growth.",
							},
						].map((item, i) => (
							<AnimatedSection key={item.label} animation="fade-up" delay={i * 100}>
								<div
									className="bg-white rounded-2xl p-7 h-full hover:-translate-y-1 transition-all duration-300"
									style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.1)" }}
								>
									<p className="font-bold text-base mb-2" style={{ color: "#0b4f96" }}>
										{item.label}
									</p>
									<p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
								</div>
							</AnimatedSection>
						))}
					</div>
				</div>
			</section>

			{/* ── 9. Bottom CTA — green ── */}
			<section style={{ backgroundColor: "#3da777" }}>
				<AnimatedSection animation="fade-in">
					<div className="max-w-4xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
						<div>
							<p className="text-white font-bold text-lg mb-1">
								Ready to build your home care agency?
							</p>
							<p className="text-green-100 text-sm">
								Join over 50 agencies that have grown with Mastering Home Care.
							</p>
						</div>
						<Link
							href="/memberships"
							className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl font-bold text-sm hover:bg-green-50 transition-colors shadow-sm flex-shrink-0"
							style={{ color: "#3da777" }}
						>
							Become a Member <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</AnimatedSection>
			</section>
		</div>
	);
}
