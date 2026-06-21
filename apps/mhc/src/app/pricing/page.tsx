"use client";

import { useState } from "react";
import { PLAN_PRICING, STAFF_LIMITS } from "@/lib/subscriptionHelpers";
import { PlanType, AgencySize } from "@prisma/client";
import {
	Check,
	X,
	DollarSign,
	HelpCircle,
	// MessageCircle,
	// Award,
	Users,
	Building2,
	Sparkles,
	Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Annual prices = 10× monthly (2 months free, ~17% discount)
const ANNUAL_PRICING: Record<PlanType, Record<AgencySize, number>> = {
	FREE: { SMALL: 0, MEDIUM: 0, LARGE: 0 },
	PRO: { SMALL: 490, MEDIUM: 990, LARGE: 1490 },
	BUSINESS: { SMALL: 1990, MEDIUM: 2990, LARGE: 4490 },
	ENTERPRISE: { SMALL: 4990, MEDIUM: 7990, LARGE: 11990 },
};

export default function PricingPage() {
	const router = useRouter();
	const [selectedSize, setSelectedSize] = useState<AgencySize>(
		AgencySize.MEDIUM,
	);
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
		"monthly",
	);
	const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
	const [enterpriseForm, setEnterpriseForm] = useState({
		name: "",
		email: "",
		agencyName: "",
		phone: "",
		message: "",
	});
	const [enterpriseLoading, setEnterpriseLoading] = useState(false);
	const [enterpriseError, setEnterpriseError] = useState<string | null>(null);
	const [enterpriseSuccess, setEnterpriseSuccess] = useState(false);

	const agencySizes = [
		{
			size: AgencySize.SMALL,
			label: "Small Agency",
			icon: Users,
			description: "1-10 employees",
			staffLimit: STAFF_LIMITS.SMALL,
		},
		{
			size: AgencySize.MEDIUM,
			label: "Medium Agency",
			icon: Building2,
			description: "11-50 employees",
			staffLimit: STAFF_LIMITS.MEDIUM,
		},
		{
			size: AgencySize.LARGE,
			label: "Large Agency",
			icon: Sparkles,
			description: "50+ employees",
			staffLimit: "Unlimited",
		},
	];

	const plans = [
		{
			type: PlanType.FREE,
			name: "Free Trial",
			description: "Try the platform — no credit card required",
			features: [
				"20 AI queries (lifetime trial)",
				"10 credential document uploads (lifetime)",
				"Up to 10 staff seats",
				"Basic referral directory access",
				"State-specific guides",
				"Email support",
			],
			limitations: [
				"Lifetime query and document limits — not monthly",
				"No advanced analytics",
			],
			cta: "Request Access",
		},
		{
			type: PlanType.PRO,
			name: "Pro",
			description: "For growing agencies",
			features: [
				"200 AI queries/month",
				"Unlimited credential document uploads",
				"Up to 10 staff seats (Small) / 50 (Medium) / Unlimited (Large)",
				"Advanced analytics dashboard",
				"Referral tracking",
				"Priority email support",
				"Export reports (CSV, PDF)",
				"Saved searches and alerts",
			],
			popular: true,
			cta: "Get Started",
		},
		{
			type: PlanType.BUSINESS,
			name: "Business",
			description: "For established agencies",
			features: [
				"Unlimited AI queries",
				"Unlimited credential document uploads",
				"Up to 10 staff seats (Small) / 50 (Medium) / Unlimited (Large)",
				"Advanced analytics & forecasting",
				"Priority phone & email support",
				"White-label reports",
				"Multi-location management",
				"Full API access",
				"Custom integrations",
			],
			cta: "Get Started",
		},
		{
			type: PlanType.ENTERPRISE,
			name: "Enterprise",
			description: "For large organizations",
			features: [
				"Everything in Business, plus:",
				"Dedicated account manager",
				"Custom SLA",
				"Advanced security features",
				"Custom training sessions",
				"24/7 priority support",
				"Custom integrations & workflows",
				"Volume discounts available",
			],
			cta: "Contact Sales",
		},
	];

	const handleSelectPlan = (planType: PlanType) => {
		if (planType === PlanType.FREE) {
			router.push("/request-access");
		} else if (planType === PlanType.ENTERPRISE) {
			setEnterpriseSuccess(false);
			setEnterpriseError(null);
			setEnterpriseForm({
				name: "",
				email: "",
				agencyName: "",
				phone: "",
				message: "",
			});
			setShowEnterpriseModal(true);
		} else {
			router.push(
				`/request-access?plan=${planType.toLowerCase()}&size=${selectedSize.toLowerCase()}&billing=${billingCycle}`,
			);
		}
	};

	const handleEnterpriseSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setEnterpriseLoading(true);
		setEnterpriseError(null);
		try {
			const res = await fetch("/api/contact/enterprise", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(enterpriseForm),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to send");
			setEnterpriseSuccess(true);
		} catch (err: any) {
			setEnterpriseError(err.message);
		} finally {
			setEnterpriseLoading(false);
		}
	};

	const getMonthlyPrice = (planType: PlanType) =>
		PLAN_PRICING[planType][selectedSize];
	const getAnnualPrice = (planType: PlanType) =>
		ANNUAL_PRICING[planType][selectedSize];

	const faqs = [
		{
			question: "How does agency size affect pricing?",
			answer:
				"Pricing is based on your agency size to ensure you only pay for what you need. Larger agencies get more staff seats. You can upgrade your size tier as your agency grows.",
		},
		{
			question: "What is the difference between the free trial and a paid plan?",
			answer:
				"The free trial gives you 20 AI queries and 10 credential document uploads — these are lifetime limits, not monthly. Once you use them, you'll need to upgrade to continue using AI-powered features. Paid plans give you monthly query resets and unlimited credential uploads.",
		},
		{
			question: "What are staff seats?",
			answer:
				"Staff seats allow you to invite team members to your agency account. Small agencies get up to 10 seats, Medium get up to 50 seats, and Large agencies get unlimited seats.",
		},
		{
			question:
				"What happens when I exceed my monthly query limit on a paid plan?",
			answer:
				"On Pro plans, AI queries are paused until your next billing date. Business and Enterprise plans have unlimited queries. You'll receive notifications before hitting your limit.",
		},
		{
			question: "How does annual billing work?",
			answer:
				"Annual billing is billed once per year at 10× the monthly price — equivalent to 12 months for the price of 10 (2 months free, ~17% savings). You can cancel before renewal for a prorated refund.",
		},
		{
			question: "Can I switch between plans?",
			answer:
				"Yes. Upgrades take effect immediately — if you hit your query limit mid-month and upgrade, your count resets right away. Downgrades take effect at the next billing date.",
		},
	];

	// const testimonials = [
	// 	{
	// 		name: "Sarah Johnson",
	// 		role: "Owner, CareConnect Home Health",
	// 		location: "Boston, MA",
	// 		agencySize: "Small",
	// 		quote:
	// 			"The Pro plan is perfect for our small agency. We've increased our referral conversions by 40% since switching.",
	// 	},
	// 	{
	// 		name: "Michael Chen",
	// 		role: "Director of Operations",
	// 		location: "San Francisco, CA",
	// 		agencySize: "Large",
	// 		quote:
	// 			"As a large agency, the unlimited staff seats and queries are essential. The platform pays for itself.",
	// 	},
	// 	{
	// 		name: "Emily Rodriguez",
	// 		role: "Marketing Manager",
	// 		location: "Miami, FL",
	// 		agencySize: "Medium",
	// 		quote:
	// 			"Started with the free trial, upgraded to Pro within a month. The ROI is undeniable for our medium-sized agency.",
	// 	},
	// ];

	return (
		<>
			<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
				{/* Hero Section */}
				<div className="max-w-7xl mx-auto px-4 py-16 text-center">
					<DollarSign className="w-16 h-16 text-[#0B4F96] mx-auto mb-6" />
					<h1 className="text-5xl font-bold text-gray-900 mb-4">
						Pricing That Grows With You
					</h1>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
						Choose the plan that fits your agency size. All plans include our core
						features with flexible pricing based on your team size.
					</p>

					{/* Billing Toggle */}
					<div className="flex items-center justify-center gap-4 mb-12">
						<span
							className={`text-sm font-medium ${
								billingCycle === "monthly" ? "text-gray-900" : "text-gray-500"
							}`}
						>
							Monthly
						</span>
						<button
							onClick={() =>
								setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")
							}
							className={`relative w-14 h-7 rounded-full transition-colors ${
								billingCycle === "annual" ? "bg-[#0B4F96]" : "bg-gray-300"
							}`}
						>
							<span
								className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
									billingCycle === "annual" ? "translate-x-7" : "translate-x-0"
								}`}
							/>
						</button>
						<span
							className={`text-sm font-medium ${
								billingCycle === "annual" ? "text-gray-900" : "text-gray-500"
							}`}
						>
							Annual
							<span className="ml-2 inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
								2 months free
							</span>
						</span>
					</div>

					{/* Agency Size Selector */}
					<div className="mb-12">
						<h2 className="text-2xl font-semibold text-gray-900 mb-6">
							Select Your Agency Size
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
							{agencySizes.map((agencySize) => {
								const Icon = agencySize.icon;
								const isSelected = selectedSize === agencySize.size;
								return (
									<button
										key={agencySize.size}
										onClick={() => setSelectedSize(agencySize.size)}
										className={`p-6 rounded-lg border-2 transition-all text-left ${
											isSelected
												? "border-[#48ccbc] bg-blue-50 shadow-lg"
												: "border-gray-200 hover:border-[#0B4F96] hover:shadow-md"
										}`}
									>
										<div className="flex items-start gap-3 mb-3">
											<Icon
												className={`w-8 h-8 ${
													isSelected ? "text-[#48ccbc]" : "text-gray-400"
												}`}
											/>
											<div className="flex-1">
												<h3
													className={`font-bold text-lg ${
														isSelected ? "text-[#0B4F96]" : "text-gray-900"
													}`}
												>
													{agencySize.label}
												</h3>
												<p className="text-sm text-gray-600">{agencySize.description}</p>
											</div>
										</div>
										<div className="mt-3 pt-3 border-t border-gray-200">
											<p className="text-sm font-medium text-gray-700">
												Staff Seats:{" "}
												<span className="text-[#0B4F96] font-bold">
													{agencySize.staffLimit}
												</span>
											</p>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Pricing Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
						{plans.map((plan) => {
							const monthlyPrice = getMonthlyPrice(plan.type);
							const annualPrice = getAnnualPrice(plan.type);
							const isFree = monthlyPrice === 0;
							return (
								<div
									key={plan.type}
									className={`relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 flex flex-col ${
										plan.popular
											? "border-4 border-[#48ccbc] scale-105"
											: "border border-gray-200"
									}`}
								>
									{plan.popular && (
										<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
											<div className="bg-[#48ccbc] text-white px-4 py-1 rounded-full text-sm font-bold">
												Most Popular
											</div>
										</div>
									)}

									{/* Plan Header */}
									<div className="text-center mb-4">
										<h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
										<p className="text-gray-600 text-sm">{plan.description}</p>
									</div>

									{/* Price */}
									<div className="text-center mb-6">
										{plan.type === PlanType.ENTERPRISE ? (
											<div>
												<div className="text-4xl font-bold text-[#0B4F96]">Custom</div>
												<div className="text-sm text-gray-500 mt-1">
													Pricing tailored to your needs
												</div>
											</div>
										) : isFree ? (
											<div className="text-4xl font-bold text-[#0B4F96]">Free</div>
										) : billingCycle === "monthly" ? (
											<>
												<div className="flex items-baseline justify-center gap-1">
													<span className="text-4xl font-bold text-[#0B4F96]">
														${monthlyPrice}
													</span>
													<span className="text-gray-600">/mo</span>
												</div>
											</>
										) : (
											<>
												<div className="flex items-baseline justify-center gap-1">
													<span className="text-4xl font-bold text-[#0B4F96]">
														${annualPrice}
													</span>
													<span className="text-gray-600">/yr</span>
												</div>
												<div className="text-sm text-gray-500 mt-1">
													${Math.round(annualPrice / 12)}/mo
												</div>
												<div className="text-xs text-green-600 font-medium mt-0.5">
													Save ${monthlyPrice * 2} — 2 months free
												</div>
											</>
										)}
									</div>

									{/* Features */}
									<div className="flex-1 mb-6">
										<ul className="space-y-3">
											{plan.features.map((feature, index) => (
												<li key={index} className="flex items-start gap-2 text-sm">
													<Check className="w-4 h-4 text-[#48ccbc] flex-shrink-0 mt-0.5" />
													<span className="text-gray-700">{feature}</span>
												</li>
											))}
										</ul>
										{plan.limitations && (
											<div className="mt-4 pt-4 border-t border-gray-200">
												{plan.limitations.map((limitation, index) => (
													<div
														key={index}
														className="flex items-start gap-2 text-sm text-gray-500"
													>
														<X className="w-4 h-4 flex-shrink-0 mt-0.5" />
														<span>{limitation}</span>
													</div>
												))}
											</div>
										)}
									</div>

									{/* CTA Button */}
									<button
										onClick={() => handleSelectPlan(plan.type)}
										className={`w-full py-3 px-4 rounded-lg font-bold transition-all ${
											plan.popular
												? "bg-[#48ccbc] hover:bg-[#3ab8a8] text-white shadow-lg"
												: "bg-[#0B4F96] hover:bg-[#0a4280] text-white"
										}`}
									>
										{plan.cta}
									</button>
								</div>
							);
						})}
					</div>
				</div>

				{/* Feature Highlights */}
				<div className="bg-white py-16">
					<div className="max-w-7xl mx-auto px-4">
						<h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
							All Plans Include
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							<div className="text-center">
								<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<Users className="w-8 h-8 text-[#0B4F96]" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-2">
									Team Collaboration
								</h3>
								<p className="text-gray-600">
									Invite your team members and work together seamlessly
								</p>
							</div>
							<div className="text-center">
								<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<Building2 className="w-8 h-8 text-[#0B4F96]" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-2">
									Agency Dashboard
								</h3>
								<p className="text-gray-600">
									Manage your agency profile, staff, and subscriptions
								</p>
							</div>
							<div className="text-center">
								<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<Sparkles className="w-8 h-8 text-[#0B4F96]" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-2">
									AI-Powered Tools
								</h3>
								<p className="text-gray-600">
									Get intelligent recommendations and insights for your agency
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Testimonials */}
				{/* <div className="bg-gradient-to-b from-white to-gray-50 py-16">
				<div className="max-w-7xl mx-auto px-4">
					<div className="text-center mb-12">
						<Award className="w-12 h-12 text-[#48ccbc] mx-auto mb-4" />
						<h2 className="text-3xl font-bold text-gray-900 mb-4">
							Trusted by Agencies of All Sizes
						</h2>
						<p className="text-gray-600">See what our customers have to say</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{testimonials.map((testimonial, index) => (
							<div
								key={index}
								className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#48ccbc]"
							>
								<MessageCircle className="w-8 h-8 text-[#48ccbc] mb-4" />
								<p className="text-gray-700 italic mb-6">"{testimonial.quote}"</p>
								<div>
									<p className="font-bold text-gray-900">{testimonial.name}</p>
									<p className="text-sm text-gray-600">{testimonial.role}</p>
									<p className="text-sm text-[#0B4F96]">
										{testimonial.location} • {testimonial.agencySize} Agency
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div> */}

				{/* FAQ Section */}
				<div className="bg-white py-16">
					<div className="max-w-4xl mx-auto px-4">
						<div className="text-center mb-12">
							<HelpCircle className="w-12 h-12 text-[#0B4F96] mx-auto mb-4" />
							<h2 className="text-3xl font-bold text-gray-900 mb-4">
								Frequently Asked Questions
							</h2>
							<p className="text-gray-600">
								Everything you need to know about our pricing
							</p>
						</div>

						<div className="space-y-6">
							{faqs.map((faq, index) => (
								<div
									key={index}
									className="bg-gray-50 rounded-lg p-6 border-l-4 border-[#0B4F96]"
								>
									<h3 className="text-lg font-bold text-gray-900 mb-2">
										{faq.question}
									</h3>
									<p className="text-gray-700">{faq.answer}</p>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Final CTA */}
				<div className="bg-gradient-to-r from-[#0B4F96] to-[#48ccbc] py-16">
					<div className="max-w-4xl mx-auto px-4 text-center">
						<h2 className="text-3xl font-bold text-white mb-4">
							Ready to Transform Your Agency?
						</h2>
						<p className="text-xl text-white opacity-90 mb-8">
							Request access to get started. Our team will reach out to onboard you.
						</p>
						<button
							onClick={() => router.push("/request-access")}
							className="bg-white text-[#0B4F96] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
						>
							Request Access
						</button>
					</div>
				</div>
			</div>

			{/* Enterprise Contact Modal */}
			{showEnterpriseModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
						<div className="flex items-center justify-between p-6 border-b">
							<h2 className="text-xl font-bold text-gray-900">
								Contact Sales — Enterprise
							</h2>
							<button
								onClick={() => setShowEnterpriseModal(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="h-6 w-6" />
							</button>
						</div>
						{enterpriseSuccess ? (
							<div className="p-6 text-center">
								<div className="text-green-600 text-lg font-semibold mb-2">
									Message sent!
								</div>
								<p className="text-gray-600 mb-6">
									We&apos;ll be in touch within 1 business day.
								</p>
								<button
									onClick={() => setShowEnterpriseModal(false)}
									className="bg-[#0B4F96] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#48ccbc] transition-colors"
								>
									Close
								</button>
							</div>
						) : (
							<form onSubmit={handleEnterpriseSubmit} className="p-6 space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											required
											value={enterpriseForm.name}
											onChange={(e) =>
												setEnterpriseForm((f) => ({ ...f, name: e.target.value }))
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Email <span className="text-red-500">*</span>
										</label>
										<input
											type="email"
											required
											value={enterpriseForm.email}
											onChange={(e) =>
												setEnterpriseForm((f) => ({ ...f, email: e.target.value }))
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
										/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Agency Name <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											required
											value={enterpriseForm.agencyName}
											onChange={(e) =>
												setEnterpriseForm((f) => ({ ...f, agencyName: e.target.value }))
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Phone
										</label>
										<input
											type="tel"
											value={enterpriseForm.phone}
											onChange={(e) =>
												setEnterpriseForm((f) => ({ ...f, phone: e.target.value }))
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Tell us about your needs
									</label>
									<textarea
										rows={3}
										value={enterpriseForm.message}
										onChange={(e) =>
											setEnterpriseForm((f) => ({ ...f, message: e.target.value }))
										}
										className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96] resize-none"
										placeholder="Number of locations, staff size, specific requirements..."
									/>
								</div>
								{enterpriseError && (
									<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
										{enterpriseError}
									</div>
								)}
								<div className="flex justify-end gap-3 pt-2">
									<button
										type="button"
										onClick={() => setShowEnterpriseModal(false)}
										className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={enterpriseLoading}
										className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors disabled:opacity-50"
									>
										{enterpriseLoading && <Loader2 className="h-4 w-4 animate-spin" />}
										Send Message
									</button>
								</div>
							</form>
						)}
					</div>
				</div>
			)}
		</>
	);
}
