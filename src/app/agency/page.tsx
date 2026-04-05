"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
	Building2,
	Users,
	CreditCard,
	Settings,
	TrendingUp,
	AlertCircle,
	CheckCircle,
	ArrowRight,
} from "lucide-react";

interface AgencyData {
	agency: {
		id: string;
		agencyName: string;
		agencySize: string;
		subscriptionPlan: string;
		subscriptionStatus: string;
		queriesThisMonth: number;
		billingPeriodStart: string | null;
		billingPeriodEnd: string | null;
	};
	queryLimit: number;
	queriesRemaining: number;
	hasUnlimitedQueries: boolean;
	staffCount: number;
	staffLimit: number;
	isUnlimitedStaff: boolean;
}

export default function AgencyOverviewPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const [agencyData, setAgencyData] = useState<AgencyData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		// Check authentication and role
		if (status === "loading") return;

		if (!session) {
			router.push("/auth/signin");
			return;
		}

		// Check if user has agency access
		if (
			session.user?.role !== "AGENCY_ADMIN" &&
			session.user?.role !== "AGENCY_USER"
		) {
			router.push("/dashboard");
			return;
		}

		// Fetch agency data
		fetchAgencyData();
	}, [session, status, router]);

	const fetchAgencyData = async () => {
		try {
			const response = await fetch("/api/agency/subscription");

			if (!response.ok) {
				throw new Error("Failed to fetch agency data");
			}

			const data = await response.json();
			setAgencyData(data);
		} catch (err: any) {
			setError(err.message || "Failed to load agency data");
		} finally {
			setLoading(false);
		}
	};

	if (loading || status === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading agency dashboard...</p>
				</div>
			</div>
		);
	}

	if (error || !agencyData) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="bg-white p-8 rounded-lg shadow-md max-w-md">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-gray-900 text-center mb-2">
						Error Loading Dashboard
					</h2>
					<p className="text-gray-600 text-center mb-4">
						{error || "Failed to load agency data"}
					</p>
					<button
						onClick={() => window.location.reload()}
						className="w-full bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280]"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const { agency, queryLimit, queriesRemaining, hasUnlimitedQueries, staffCount, staffLimit, isUnlimitedStaff } = agencyData;

	// Calculate usage percentages
	const queryUsagePercent = hasUnlimitedQueries
		? 0
		: ((agency.queriesThisMonth / queryLimit) * 100).toFixed(0);
	const staffUsagePercent = isUnlimitedStaff
		? 0
		: ((staffCount / staffLimit) * 100).toFixed(0);

	// Determine status colors
	const getStatusColor = (status: string) => {
		switch (status) {
			case "ACTIVE":
				return "text-green-600 bg-green-100";
			case "TRIALING":
				return "text-blue-600 bg-blue-100";
			case "PAST_DUE":
				return "text-yellow-600 bg-yellow-100";
			case "CANCELED":
			case "SUSPENDED":
				return "text-red-600 bg-red-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const getUsageColor = (percent: number) => {
		if (percent >= 90) return "text-red-600";
		if (percent >= 70) return "text-yellow-600";
		return "text-green-600";
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				{/* Welcome Header */}
				<div className="bg-white rounded-lg shadow-md p-6 mb-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="w-16 h-16 bg-[#0B4F96] rounded-full flex items-center justify-center">
								<Building2 className="h-8 w-8 text-white" />
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-900">
									{agency.agencyName}
								</h1>
								<p className="text-gray-600">
									Welcome back, {session?.user?.name || session?.user?.email}
								</p>
							</div>
						</div>
						<div>
							<span
								className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
									agency.subscriptionStatus
								)}`}
							>
								{agency.subscriptionStatus}
							</span>
						</div>
					</div>
				</div>

				{/* Quick Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
					{/* Subscription Card */}
					<Link
						href="/agency/subscription"
						className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
								<CreditCard className="h-6 w-6 text-[#0B4F96]" />
							</div>
							<ArrowRight className="h-5 w-5 text-gray-400" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							Subscription
						</h3>
						<p className="text-3xl font-bold text-[#0B4F96] mb-1">
							{agency.subscriptionPlan}
						</p>
						<p className="text-sm text-gray-600">
							{agency.agencySize} Agency
						</p>
					</Link>

					{/* Query Usage Card */}
					<Link
						href="/agency/subscription"
						className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
								<TrendingUp className="h-6 w-6 text-[#48ccbc]" />
							</div>
							<ArrowRight className="h-5 w-5 text-gray-400" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							AI Queries
						</h3>
						{hasUnlimitedQueries ? (
							<>
								<p className="text-3xl font-bold text-[#48ccbc] mb-1">
									{agency.queriesThisMonth}
								</p>
								<p className="text-sm text-gray-600">Unlimited plan</p>
							</>
						) : (
							<>
								<p className="text-3xl font-bold text-gray-900 mb-1">
									<span className={getUsageColor(Number(queryUsagePercent))}>
										{queriesRemaining}
									</span>
									<span className="text-lg text-gray-500">
										{" "}
										/ {queryLimit}
									</span>
								</p>
								<p className="text-sm text-gray-600">
									{queryUsagePercent}% used this month
								</p>
							</>
						)}
					</Link>

					{/* Staff Card */}
					<Link
						href="/agency/staff"
						className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
					>
						<div className="flex items-center justify-between mb-4">
							<div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
								<Users className="h-6 w-6 text-purple-600" />
							</div>
							<ArrowRight className="h-5 w-5 text-gray-400" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							Team Members
						</h3>
						{isUnlimitedStaff ? (
							<>
								<p className="text-3xl font-bold text-purple-600 mb-1">
									{staffCount}
								</p>
								<p className="text-sm text-gray-600">Unlimited seats</p>
							</>
						) : (
							<>
								<p className="text-3xl font-bold text-gray-900 mb-1">
									<span className={getUsageColor(Number(staffUsagePercent))}>
										{staffCount}
									</span>
									<span className="text-lg text-gray-500">
										{" "}
										/ {staffLimit}
									</span>
								</p>
								<p className="text-sm text-gray-600">
									{staffUsagePercent}% of seats used
								</p>
							</>
						)}
					</Link>
				</div>

				{/* Action Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					{/* Quick Actions */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<Settings className="h-5 w-5 text-[#0B4F96]" />
							Quick Actions
						</h2>
						<div className="space-y-3">
							<Link
								href="/agency/settings"
								className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<Building2 className="h-5 w-5 text-gray-600" />
									<span className="text-gray-700">Agency Settings</span>
								</div>
								<ArrowRight className="h-4 w-4 text-gray-400" />
							</Link>
							<Link
								href="/agency/staff"
								className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<Users className="h-5 w-5 text-gray-600" />
									<span className="text-gray-700">Manage Staff</span>
								</div>
								<ArrowRight className="h-4 w-4 text-gray-400" />
							</Link>
							<Link
								href="/agency/subscription"
								className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<CreditCard className="h-5 w-5 text-gray-600" />
									<span className="text-gray-700">Subscription & Billing</span>
								</div>
								<ArrowRight className="h-4 w-4 text-gray-400" />
							</Link>
						</div>
					</div>

					{/* Billing Period Info */}
					<div className="bg-white rounded-lg shadow-md p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-[#48ccbc]" />
							Billing Period
						</h2>
						{agency.billingPeriodStart && agency.billingPeriodEnd ? (
							<div className="space-y-4">
								<div>
									<p className="text-sm text-gray-600 mb-1">Current Period</p>
									<p className="text-gray-900 font-medium">
										{new Date(agency.billingPeriodStart).toLocaleDateString()} -{" "}
										{new Date(agency.billingPeriodEnd).toLocaleDateString()}
									</p>
								</div>
								<div>
									<p className="text-sm text-gray-600 mb-1">Usage This Period</p>
									<p className="text-2xl font-bold text-[#0B4F96]">
										{agency.queriesThisMonth} queries
									</p>
								</div>
								{!hasUnlimitedQueries && (
									<div className="pt-4 border-t border-gray-200">
										<div className="flex items-center gap-2 text-sm">
											{Number(queryUsagePercent) >= 90 ? (
												<AlertCircle className="h-4 w-4 text-red-500" />
											) : (
												<CheckCircle className="h-4 w-4 text-green-500" />
											)}
											<span className="text-gray-700">
												{Number(queryUsagePercent) >= 90
													? "Running low on queries"
													: "Usage is healthy"}
											</span>
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-gray-500">No active billing period</p>
							</div>
						)}
					</div>
				</div>

				{/* Upgrade Prompt (if on free or hitting limits) */}
				{(agency.subscriptionPlan === "FREE" ||
					(!hasUnlimitedQueries && Number(queryUsagePercent) >= 80)) && (
					<div className="bg-gradient-to-r from-[#0B4F96] to-[#48ccbc] rounded-lg shadow-md p-6 text-white">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-2xl font-bold mb-2">
									{agency.subscriptionPlan === "FREE"
										? "Upgrade Your Plan"
										: "Running Low on Queries?"}
								</h2>
								<p className="text-blue-100 mb-4">
									{agency.subscriptionPlan === "FREE"
										? "Unlock more features and unlimited queries with a paid plan."
										: "Upgrade to a higher plan for more queries or unlimited access."}
								</p>
								<Link
									href="/pricing"
									className="inline-block bg-white text-[#0B4F96] px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
								>
									View Plans
								</Link>
							</div>
							<div className="hidden md:block">
								<TrendingUp className="h-24 w-24 text-white opacity-30" />
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
