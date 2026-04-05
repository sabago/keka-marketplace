"use client";

import { useState } from "react";
import { PLAN_PRICING, STAFF_LIMITS } from "@/lib/subscriptionHelpers";
import { PlanType, AgencySize } from "@prisma/client";
import {
	Check,
	X,
	DollarSign,
	HelpCircle,
	MessageCircle,
	Award,
	Users,
	Building2,
	Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
	const router = useRouter();
	const [selectedSize, setSelectedSize] = useState<AgencySize>(AgencySize.MEDIUM);

	// Agency size options with descriptions
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

	// Plan configurations
	const plans = [
		{
			type: PlanType.FREE,
			name: "Free",
			description: "Perfect for trying out the platform",
			features: [
				"20 AI queries per month",
				"Basic referral directory access",
				"State-specific guides",
				"Community access",
				"Email support",
			],
			limitations: ["Limited query capacity", "No advanced analytics"],
			cta: "Get Started Free",
		},
		{
			type: PlanType.PRO,
			name: "Pro",
			description: "For growing agencies",
			features: [
				"200 AI queries per month",
				"Advanced analytics dashboard",
				"Referral tracking",
				"Priority email support",
				"Export reports (CSV, PDF)",
				"API access (basic)",
				"Saved searches and alerts",
			],
			popular: true,
			cta: "Start 14-Day Free Trial",
		},
		{
			type: PlanType.BUSINESS,
			name: "Business",
			description: "For established agencies",
			features: [
				"Unlimited AI queries",
				"Advanced analytics & forecasting",
				"Priority phone & email support",
				"White-label reports",
				"Multi-location management",
				"Full API access",
				"Custom integrations",
				"Early access to new features",
			],
			cta: "Start 14-Day Free Trial",
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
			router.push("/auth/signin");
		} else if (planType === PlanType.ENTERPRISE) {
			// For enterprise, contact sales
			window.location.href = "mailto:sales@example.com?subject=Enterprise Plan Inquiry";
		} else {
			// For paid plans, redirect to signup with plan and size
			router.push(
				`/auth/signin?plan=${planType.toLowerCase()}&size=${selectedSize.toLowerCase()}`
			);
		}
	};

	const getPrice = (planType: PlanType) => {
		return PLAN_PRICING[planType][selectedSize];
	};

	const faqs = [
		{
			question: "How does agency size affect pricing?",
			answer:
				"Pricing is based on your agency size to ensure you only pay for what you need. Larger agencies get more staff seats and higher usage limits. You can upgrade your size tier as your agency grows.",
		},
		{
			question: "Can I change my agency size later?",
			answer:
				"Yes! You can upgrade your agency size at any time. The change takes effect immediately, and we'll prorate the difference in your next billing cycle.",
		},
		{
			question: "What are staff seats?",
			answer:
				"Staff seats allow you to invite team members to your agency account. Small agencies get up to 5 seats, Medium get up to 15 seats, and Large agencies get unlimited seats.",
		},
		{
			question: "What happens when I exceed my query limit?",
			answer:
				"For Free and Pro tiers, queries will be paused until the next billing cycle. You'll receive notifications before hitting your limit. Business and Enterprise plans have unlimited queries.",
		},
		{
			question: "Do you offer refunds?",
			answer:
				"We offer a 14-day free trial for all paid plans. If you're not satisfied within the first 30 days of paid service, we'll provide a full refund.",
		},
		{
			question: "Can I switch between plans?",
			answer:
				"Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences in your billing.",
		},
	];

	const testimonials = [
		{
			name: "Sarah Johnson",
			role: "Owner, CareConnect Home Health",
			location: "Boston, MA",
			agencySize: "Small",
			quote:
				"The Pro plan is perfect for our small agency. We've increased our referral conversions by 40% since switching.",
		},
		{
			name: "Michael Chen",
			role: "Director of Operations",
			location: "San Francisco, CA",
			agencySize: "Large",
			quote:
				"As a large agency, the unlimited staff seats and queries are essential. The platform pays for itself.",
		},
		{
			name: "Emily Rodriguez",
			role: "Marketing Manager",
			location: "Miami, FL",
			agencySize: "Medium",
			quote:
				"Started with the free plan, upgraded to Pro within a month. The ROI is undeniable for our medium-sized agency.",
		},
	];

	return (
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
						const price = getPrice(plan.type);
						return (
							<div
								key={plan.type}
								className={`relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 flex flex-col ${
									plan.popular
										? "border-4 border-[#48ccbc] scale-105"
										: "border border-gray-200"
								}`}
							>
								{/* Popular Badge */}
								{plan.popular && (
									<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
										<div className="bg-[#48ccbc] text-white px-4 py-1 rounded-full text-sm font-bold">
											Most Popular
										</div>
									</div>
								)}

								{/* Plan Header */}
								<div className="text-center mb-4">
									<h3 className="text-2xl font-bold text-gray-900 mb-2">
										{plan.name}
									</h3>
									<p className="text-gray-600 text-sm">{plan.description}</p>
								</div>

								{/* Price */}
								<div className="text-center mb-6">
									{price === 0 ? (
										<div className="text-4xl font-bold text-[#0B4F96]">Free</div>
									) : (
										<>
											<div className="flex items-baseline justify-center gap-1">
												<span className="text-4xl font-bold text-[#0B4F96]">
													${price}
												</span>
												<span className="text-gray-600">/month</span>
											</div>
											{plan.type === PlanType.ENTERPRISE && (
												<div className="mt-2 text-sm text-gray-600">Custom pricing</div>
											)}
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
							<h3 className="text-xl font-bold text-gray-900 mb-2">Agency Dashboard</h3>
							<p className="text-gray-600">
								Manage your agency profile, staff, and subscriptions
							</p>
						</div>
						<div className="text-center">
							<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Sparkles className="w-8 h-8 text-[#0B4F96]" />
							</div>
							<h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Tools</h3>
							<p className="text-gray-600">
								Get intelligent recommendations and insights
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Testimonials */}
			<div className="bg-gradient-to-b from-white to-gray-50 py-16">
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
			</div>

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
						Join hundreds of agencies already using our platform. Start with a free
						trial today.
					</p>
					<button
						onClick={() => router.push("/auth/signin")}
						className="bg-white text-[#0B4F96] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
					>
						Get Started Now
					</button>
				</div>
			</div>
		</div>
	);
}
