"use client";

import Link from "next/link";
import {
	ArrowLeft,
	Search,
	BookOpen,
	ClipboardList,
	Heart,
	MessageCircle,
	ChevronRight,
	Building2,
	Phone,
	Globe,
	FileText,
	Star,
	CheckCircle,
} from "lucide-react";

const steps = [
	{
		number: 1,
		icon: Search,
		title: "Browse by category",
		color: "#0B4F96",
		content: (
			<>
				<p className="text-gray-700 mb-3">
					The Referral Directory is organized into categories based on the type of
					referral source. You will find categories like:
				</p>
				<ul className="space-y-1.5 mb-4">
					{[
						"Hospitals & Health Systems — acute-care hospitals that discharge patients needing home care",
						"Aging Services (ASAPs) — state-funded agencies that coordinate elder care services",
						"Managed Care (MCOs & ACOs) — insurance-managed care organizations",
						"Insurance & Health Plans — Medicare Advantage, commercial insurers",
						"Councils on Aging & PACE — local senior programs",
						"Veterans Services — VA and veteran-focused programs",
						"Online Platforms & Partners — digital referral marketplaces",
					].map((item, i) => (
						<li key={i} className="flex items-start gap-2 text-sm text-gray-700">
							<CheckCircle className="w-4 h-4 text-[#48ccbc] mt-0.5 flex-shrink-0" />
							<span>{item}</span>
						</li>
					))}
				</ul>
				<p className="text-sm text-gray-600">
					On desktop, categories are listed in the sidebar on the left. On mobile,
					tap <strong>Browse Categories</strong> at the top of the page.
				</p>
			</>
		),
	},
	{
		number: 2,
		icon: BookOpen,
		title: "Read the article",
		color: "#0B4F96",
		content: (
			<>
				<p className="text-gray-700 mb-3">
					Click any source card to open its guide. Each guide covers one specific
					referral source — a hospital, insurance plan, or community program — and
					explains:
				</p>
				<ul className="space-y-2 mb-4">
					{[
						{
							label: "Overview",
							desc:
								"What the organization is and why it matters for home care agencies",
						},
						{
							label: "Who This Serves",
							desc:
								"What types of patients they refer and which agencies they work with",
						},
						{
							label: "How to Get Listed / Apply",
							desc: "Step-by-step instructions to become an approved provider",
						},
						{
							label: "Cost & Lead Quality",
							desc: "Whether there are fees and what volume to expect",
						},
						{ label: "Pros & Cons", desc: "Honest assessment of the opportunity" },
						{
							label: "Best Practices",
							desc:
								"Tips for agencies who have successfully built a relationship here",
						},
					].map((item, i) => (
						<li key={i} className="flex items-start gap-2 text-sm">
							<span className="font-semibold text-[#0B4F96] min-w-fit">
								{item.label}:
							</span>
							<span className="text-gray-700">{item.desc}</span>
						</li>
					))}
				</ul>
				<div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
					<strong>Tip:</strong> Use the <strong>table of contents</strong> on the
					left side of each article to jump directly to the section you need. Click
					any section heading to collapse or expand it.
				</div>
			</>
		),
	},
	{
		number: 3,
		icon: Heart,
		title: "Save your best sources",
		color: "#e53e3e",
		content: (
			<>
				<p className="text-gray-700 mb-3">
					When you find a referral source worth pursuing, click{" "}
					<strong>Save source</strong> (the heart icon) on the article page. This
					saves it to your Favorites list.
				</p>
				<p className="text-gray-700 mb-3">
					To view all your saved sources, go to your{" "}
					<strong>Dashboard → Favorites</strong>. From there you can quickly revisit
					any guide you&apos;ve saved without having to search again.
				</p>
				<p className="text-sm text-gray-500">
					You must be signed in to save sources.{" "}
					<Link href="/auth/signin" className="text-[#0B4F96] hover:underline">
						Sign in here.
					</Link>
				</p>
			</>
		),
	},
	{
		number: 4,
		icon: ClipboardList,
		title: "Log your referral submissions",
		color: "#0B4F96",
		content: (
			<>
				<p className="text-gray-700 mb-3">
					Once you have applied to or contacted a referral source, log it in your
					dashboard so you can track what happened. Click{" "}
					<strong>Log a referral</strong> on any article page — the source is
					pre-filled automatically.
				</p>
				<p className="text-gray-700 mb-3">In the log form, fill in:</p>
				<ul className="space-y-1.5 mb-4">
					{[
						"Submission Date — when you submitted your application or made contact",
						"Submission Method — phone, online portal, email, or fax",
						"Patient Type — the type of patient or payer involved (optional)",
						"Notes — anything you want to remember about this interaction",
					].map((item, i) => (
						<li key={i} className="flex items-start gap-2 text-sm text-gray-700">
							<CheckCircle className="w-4 h-4 text-[#48ccbc] mt-0.5 flex-shrink-0" />
							<span>{item}</span>
						</li>
					))}
				</ul>
				<p className="text-gray-700">
					All logged referrals appear in <strong>Dashboard → Referrals</strong> where
					you can see your outreach history and track outcomes over time.
				</p>
			</>
		),
	},
	{
		number: 5,
		icon: MessageCircle,
		title: "Ask the AI assistant",
		color: "#48ccbc",
		content: (
			<>
				<p className="text-gray-700 mb-3">
					The AI assistant (chat bubble in the bottom-right corner) is trained on all
					124+ guides in this directory. You can ask it questions like:
				</p>
				<ul className="space-y-1.5 mb-4">
					{[
						'"I\'m a new agency — where should I start to get referrals?"',
						'"How do I get referrals from hospitals in Massachusetts?"',
						'"What are ASAPs and how do I get listed?"',
						'"Which sources are free to apply to?"',
					].map((item, i) => (
						<li
							key={i}
							className="flex items-start gap-2 text-sm text-gray-700 italic"
						>
							<MessageCircle className="w-4 h-4 text-[#48ccbc] mt-0.5 flex-shrink-0 not-italic" />
							<span>{item}</span>
						</li>
					))}
				</ul>
				<p className="text-gray-700 mb-2">
					The assistant will answer your question and show links to the relevant
					guides so you can read more.
				</p>
				<div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
					<strong>Note:</strong> The AI assistant requires a MHC account. Your plan
					determines how many queries you get per month (FREE plan: 20 queries/month;
					PRO: 200/month).
				</div>
			</>
		),
	},
];

export default function HowToUsePage() {
	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-3xl mx-auto px-4 py-10">
				{/* Back link */}
				<Link
					href="/knowledge-base"
					className="inline-flex items-center gap-2 text-[#0B4F96] hover:text-[#0a4280] transition-colors text-sm font-medium mb-6"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Referral Directory
				</Link>

				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
						<Link href="/knowledge-base" className="hover:text-[#0B4F96]">
							Referral Directory
						</Link>
						<ChevronRight className="w-3.5 h-3.5" />
						<span className="text-gray-700 font-medium">
							How to use this directory
						</span>
					</div>
					<h1 className="text-3xl font-bold text-gray-900 mb-3">
						How to use the Referral Directory
					</h1>
					<p className="text-gray-600 text-lg leading-relaxed">
						The Referral Directory is a free guide to 124+ hospitals, insurance plans,
						aging services, and community programs in Massachusetts that send
						referrals to home care agencies. Here is how to get the most out of it.
					</p>
				</div>

				{/* What it is */}
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
					<h2 className="text-lg font-bold text-gray-900 mb-3">
						What is the Referral Directory?
					</h2>
					<p className="text-gray-700 mb-3">
						When a patient is discharged from a hospital or needs home care, a
						coordinator or case manager recommends specific agencies to the family.
						The Referral Directory helps your agency get onto those recommendation
						lists.
					</p>
					<p className="text-gray-700 mb-4">
						Each guide in the directory covers one referral source and explains
						exactly how your agency can apply, who to contact, and what to expect. The
						directory currently covers Massachusetts only — more states are coming
						soon.
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{[
							{
								icon: Building2,
								label: "124+ referral sources",
								sub: "Hospitals, insurers, aging services, and more",
							},
							{
								icon: FileText,
								label: "Step-by-step guides",
								sub: "How to apply for each source",
							},
							{ icon: Star, label: "Free to use", sub: "No account needed to browse" },
						].map((item, i) => (
							<div
								key={i}
								className="flex items-start gap-3 bg-blue-50 rounded-lg p-3"
							>
								<item.icon className="w-5 h-5 text-[#0B4F96] flex-shrink-0 mt-0.5" />
								<div>
									<p className="text-sm font-semibold text-gray-900">{item.label}</p>
									<p className="text-xs text-gray-600">{item.sub}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Steps */}
				<div className="space-y-4">
					{steps.map((step) => (
						<div
							key={step.number}
							className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
						>
							<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
								<div
									className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
									style={{ backgroundColor: step.color }}
								>
									{step.number}
								</div>
								<div className="flex items-center gap-2">
									<step.icon className="w-4 h-4" style={{ color: step.color }} />
									<h2 className="font-bold text-gray-900">{step.title}</h2>
								</div>
							</div>
							<div className="px-6 py-5">{step.content}</div>
						</div>
					))}
				</div>

				{/* CTA */}
				<div className="mt-8 bg-[#0B4F96] text-white rounded-xl p-6 text-center">
					<h2 className="text-xl font-bold mb-2">
						Ready to start finding referral sources?
					</h2>
					<p className="text-blue-100 mb-4 text-sm">
						Browse all 124+ guides — no account needed.
					</p>
					<Link
						href="/knowledge-base"
						className="inline-flex items-center gap-2 bg-white text-[#0B4F96] font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
					>
						<BookOpen className="w-4 h-4" />
						Browse the directory
					</Link>
				</div>
			</div>
		</div>
	);
}
