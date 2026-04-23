"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
	Clock,
	FileText,
	ArrowRight,
	// TrendingUp,
	Star,
	Search,
	Activity,
	Building2,
	Users,
	CheckCircle,
	AlertCircle,
	BarChart3,
	// Phone,
	// Mail,
	// Globe,
	Zap,
	Crown,
} from "lucide-react";
import QueryUsageWidget from "@/components/QueryUsageWidget";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

// interface RecentActivity {
//   id: string;
//   type: string;
//   description: string;
//   timestamp: string;
//   icon: string;
// }

interface PlatformStats {
	totalAgencies: number;
	pendingApprovals: number;
	approvedAgencies: number;
	totalUsers: number;
	// Intake analytics
	intakeMethodCounts: Record<string, number>;
	followUpMethodCounts: Record<string, number>;
	followUpFrequencyCounts: Record<string, number>;
	agencySizeCounts: Record<string, number>;
	// Recent admin actions
	recentActions: {
		id: string;
		actionType: string;
		agencyName: string;
		adminName: string | null;
		createdAt: string;
	}[];
}

// ─── Label helpers ─────────────────────────────────────────────────────────────

const intakeMethodLabels: Record<string, string> = {
	phone: "Phone Calls",
	online: "Online Forms",
	email: "Email",
	fax: "Fax",
	"in-person": "In-Person",
};

const followUpMethodLabels: Record<string, string> = {
	email: "Email",
	phone: "Phone",
	text: "Text/SMS",
	"in-person": "In-Person",
	automated: "Automated System",
};

const followUpFrequencyLabels: Record<string, string> = {
	daily: "Daily",
	weekly: "Weekly",
	"bi-weekly": "Bi-weekly",
	monthly: "Monthly",
	"as-needed": "As Needed",
};

const agencySizeLabels: Record<string, string> = {
	SMALL: "Small (1–10)",
	MEDIUM: "Medium (11–50)",
	LARGE: "Large (51+)",
};

const actionTypeLabels: Record<string, string> = {
	APPROVE: "Approved",
	REJECT: "Rejected",
	SUSPEND: "Suspended",
	REACTIVATE: "Reactivated",
	INVITE_ADMIN: "Invited Admin",
	REASSIGN_ADMIN: "Reassigned Admin",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function HorizontalBar({
	label,
	count,
	total,
	color,
}: {
	label: string;
	count: number;
	total: number;
	color: string;
}) {
	const pct = total > 0 ? Math.round((count / total) * 100) : 0;
	return (
		<div className="flex items-center gap-3">
			<span className="w-32 text-sm text-gray-600 shrink-0 truncate">{label}</span>
			<div className="flex-1 bg-gray-100 rounded-full h-2">
				<div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
			</div>
			<span className="text-sm font-medium text-gray-700 w-16 text-right shrink-0">
				{count} <span className="text-gray-400 font-normal">({pct}%)</span>
			</span>
		</div>
	);
}

function StatCard({
	icon: Icon,
	label,
	value,
	sub,
	color,
}: {
	icon: React.ElementType;
	label: string;
	value: number | string;
	sub?: string;
	color: string;
}) {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-5 flex items-start gap-4">
			<div className={`p-2.5 rounded-lg ${color}`}>
				<Icon className="h-5 w-5 text-white" />
			</div>
			<div>
				<p className="text-sm text-gray-500">{label}</p>
				<p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
				{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard() {
	const [stats, setStats] = useState<PlatformStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const res = await fetch("/api/admin/platform-stats");
				if (!res.ok) throw new Error("Failed to load stats");
				const data = await res.json();
				setStats(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setLoading(false);
			}
		};
		fetchStats();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="h-10 w-10 rounded-full border-4 border-[#0B4F96] border-t-transparent animate-spin" />
			</div>
		);
	}

	if (error || !stats) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-gray-500">
				<AlertCircle className="h-10 w-10 mb-3 text-red-400" />
				<p>{error || "No data available"}</p>
			</div>
		);
	}

	const totalApproved = stats.approvedAgencies;

	return (
		<div className="space-y-8">
			{/* KPI row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={Building2}
					label="Total Agencies"
					value={stats.totalAgencies}
					color="bg-[#0B4F96]"
				/>
				<StatCard
					icon={AlertCircle}
					label="Pending Approvals"
					value={stats.pendingApprovals}
					sub={stats.pendingApprovals > 0 ? "Needs review" : "All clear"}
					color={stats.pendingApprovals > 0 ? "bg-amber-500" : "bg-green-500"}
				/>
				<StatCard
					icon={CheckCircle}
					label="Approved Agencies"
					value={stats.approvedAgencies}
					color="bg-[#48ccbc]"
				/>
				<StatCard
					icon={Users}
					label="Total Users"
					value={stats.totalUsers}
					sub="Agency admins & staff"
					color="bg-purple-500"
				/>
			</div>

			{/* Quick link to pending */}
			{stats.pendingApprovals > 0 && (
				<Link
					href="/admin/agencies"
					className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 hover:bg-amber-100 transition-colors"
				>
					<div className="flex items-center gap-2 text-amber-800 font-medium">
						<AlertCircle className="h-4 w-4" />
						{stats.pendingApprovals}{" "}
						{stats.pendingApprovals === 1 ? "agency is" : "agencies are"} waiting for
						approval
					</div>
					<ArrowRight className="h-4 w-4 text-amber-600" />
				</Link>
			)}

			{/* Analytics grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Intake Methods */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<div className="flex items-center gap-2 mb-5">
						<BarChart3 className="h-5 w-5 text-[#0B4F96]" />
						<h3 className="font-semibold text-gray-900">Intake Methods</h3>
						<span className="ml-auto text-xs text-gray-400">
							across {totalApproved} approved agencies
						</span>
					</div>
					<div className="space-y-3">
						{Object.entries(intakeMethodLabels).map(([key, label]) => (
							<HorizontalBar
								key={key}
								label={label}
								count={stats.intakeMethodCounts[key] ?? 0}
								total={totalApproved}
								color="bg-[#0B4F96]"
							/>
						))}
					</div>
				</div>

				{/* Follow-up Methods */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<div className="flex items-center gap-2 mb-5">
						<Zap className="h-5 w-5 text-[#48ccbc]" />
						<h3 className="font-semibold text-gray-900">Follow-up Methods</h3>
						<span className="ml-auto text-xs text-gray-400">
							across {totalApproved} approved agencies
						</span>
					</div>
					<div className="space-y-3">
						{Object.entries(followUpMethodLabels).map(([key, label]) => (
							<HorizontalBar
								key={key}
								label={label}
								count={stats.followUpMethodCounts[key] ?? 0}
								total={totalApproved}
								color="bg-[#48ccbc]"
							/>
						))}
					</div>
				</div>

				{/* Follow-up Frequency */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<div className="flex items-center gap-2 mb-5">
						<Clock className="h-5 w-5 text-purple-500" />
						<h3 className="font-semibold text-gray-900">Follow-up Frequency</h3>
					</div>
					<div className="space-y-3">
						{Object.entries(followUpFrequencyLabels).map(([key, label]) => (
							<HorizontalBar
								key={key}
								label={label}
								count={stats.followUpFrequencyCounts[key] ?? 0}
								total={totalApproved}
								color="bg-purple-500"
							/>
						))}
					</div>
				</div>

				{/* Agency Size */}
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<div className="flex items-center gap-2 mb-5">
						<Building2 className="h-5 w-5 text-indigo-500" />
						<h3 className="font-semibold text-gray-900">Agency Size Distribution</h3>
					</div>
					<div className="space-y-3">
						{Object.entries(agencySizeLabels).map(([key, label]) => (
							<HorizontalBar
								key={key}
								label={label}
								count={stats.agencySizeCounts[key] ?? 0}
								total={totalApproved}
								color="bg-indigo-500"
							/>
						))}
					</div>
				</div>
			</div>

			{/* Recent admin actions */}
			{stats.recentActions.length > 0 && (
				<div className="bg-white border border-gray-200 rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-gray-900 flex items-center gap-2">
							<Activity className="h-5 w-5 text-gray-400" />
							Recent Admin Actions
						</h3>
						<Link
							href="/admin/agencies"
							className="text-sm text-[#0B4F96] hover:underline"
						>
							View all agencies →
						</Link>
					</div>
					<div className="divide-y divide-gray-100">
						{stats.recentActions.map((action) => (
							<div key={action.id} className="flex items-center justify-between py-3">
								<div>
									<span
										className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-2 ${
											action.actionType === "APPROVE" || action.actionType === "REACTIVATE"
												? "bg-green-100 text-green-700"
												: action.actionType === "REJECT" || action.actionType === "SUSPEND"
													? "bg-red-100 text-red-700"
													: "bg-blue-100 text-blue-700"
										}`}
									>
										{actionTypeLabels[action.actionType] ?? action.actionType}
									</span>
									<span className="text-sm text-gray-900">{action.agencyName}</span>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-500">{action.adminName ?? "System"}</p>
									<p className="text-xs text-gray-400">
										{new Date(action.createdAt).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Quick links */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Link
					href="/admin/agencies"
					className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow group"
				>
					<Building2 className="h-7 w-7 text-[#0B4F96] mb-3" />
					<h3 className="font-semibold text-gray-900 mb-1">Manage Agencies</h3>
					<p className="text-sm text-gray-500 mb-3">
						Review applications and approvals
					</p>
					<span className="text-sm text-[#0B4F96] group-hover:text-[#48ccbc] flex items-center gap-1">
						Go to Agencies <ArrowRight className="h-3.5 w-3.5" />
					</span>
				</Link>
				<Link
					href="/admin/agencies?tab=users"
					className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow group"
				>
					<Users className="h-7 w-7 text-purple-500 mb-3" />
					<h3 className="font-semibold text-gray-900 mb-1">View All Users</h3>
					<p className="text-sm text-gray-500 mb-3">
						Browse agency admins and staff
					</p>
					<span className="text-sm text-[#0B4F96] group-hover:text-[#48ccbc] flex items-center gap-1">
						View Users <ArrowRight className="h-3.5 w-3.5" />
					</span>
				</Link>
				<Link
					href="/knowledge-base"
					className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow group"
				>
					<Search className="h-7 w-7 text-[#48ccbc] mb-3" />
					<h3 className="font-semibold text-gray-900 mb-1">Referral Directory</h3>
					<p className="text-sm text-gray-500 mb-3">Browse all referral guides</p>
					<span className="text-sm text-[#0B4F96] group-hover:text-[#48ccbc] flex items-center gap-1">
						Browse Directory <ArrowRight className="h-3.5 w-3.5" />
					</span>
				</Link>
			</div>
		</div>
	);
}

// ─── Agency Dashboard (existing) ──────────────────────────────────────────────

function AgencyDashboard({
	hideUsageWidget = false,
}: {
	hideUsageWidget?: boolean;
}) {
	const { data: session, update: updateSession } = useSession();
	// Any role that can manage an agency subscription should see upgrade prompts
	const isAdmin =
		session?.user?.role === "AGENCY_ADMIN" ||
		session?.user?.role === "PLATFORM_ADMIN" ||
		session?.user?.role === "SUPERADMIN";

	const tokenApprovalStatus = (session?.user as any)?.agencyApprovalStatus as string | null;
	const [liveApprovalStatus, setLiveApprovalStatus] = useState<string | null>(null);
	const [liveIsActive, setLiveIsActive] = useState<boolean | null>(null);
	// Use live status if fetched, otherwise fall back to JWT value
	const effectiveApprovalStatus = liveApprovalStatus ?? tokenApprovalStatus;
	const isSuspended = effectiveApprovalStatus === "SUSPENDED" || effectiveApprovalStatus === "REJECTED";
	const isDeactivated = liveIsActive === false;
	const actionsDisabled = (isSuspended || isDeactivated) && !isAdmin;

	const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
	const [referralCount, setReferralCount] = useState<number | null>(null);
	const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [usagePlan, setUsagePlan] = useState<string | null>(null);

	useEffect(() => {
		const fetchUsage =
			isAdmin && !hideUsageWidget
				? fetch("/api/dashboard/usage").then((r) => r.json())
				: Promise.resolve(null);

		Promise.allSettled([
			fetch("/api/agency/status").then((r) => {
				// Middleware returns 403 with X-Agency-Status header for suspended/rejected agencies
				const header = r.headers.get("X-Agency-Status");
				if (header) return { approvalStatus: header };
				return r.ok ? r.json() : null;
			}),
			fetch("/api/account/status").then((r) => r.ok ? r.json() : null),
			fetch("/api/referrals").then((r) =>
				r.ok ? r.json() : { referrals: [], myReferrals: [] },
			),
			fetch("/api/favorites").then((r) => (r.ok ? r.json() : { favorites: [] })),
			fetchUsage,
		])
			.then(([statusResult, accountResult, refResult, favResult, usageResult]) => {
				const statusData = statusResult.status === "fulfilled" ? statusResult.value : null;
				const accountData = accountResult.status === "fulfilled" ? accountResult.value : null;
				const refData = refResult.status === "fulfilled" ? refResult.value : { referrals: [], myReferrals: [] };
				const favData = favResult.status === "fulfilled" ? favResult.value : { favorites: [] };
				const usageData = usageResult.status === "fulfilled" ? usageResult.value : null;
				if (statusData?.approvalStatus) {
					setLiveApprovalStatus(statusData.approvalStatus);
					// If live DB status differs from JWT, force a session refresh so middleware
					// unblocks on the next navigation without requiring a sign-out/sign-in
					if (statusData.approvalStatus !== tokenApprovalStatus) {
						updateSession({ agencyApprovalStatus: statusData.approvalStatus });
					}
				}
				if (accountData?.isActive === false) setLiveIsActive(false);
				const referrals = hideUsageWidget
					? (refData.myReferrals ?? [])
					: (refData.referrals ?? []);
				setRecentReferrals(referrals.slice(0, 5));
				setReferralCount(referrals.length);
				setFavoriteCount((favData.favorites ?? []).length);
				if (usageData?.plan) setUsagePlan(usageData.plan);
			})
			.finally(() => setLoading(false));
	}, [isAdmin, hideUsageWidget]);

	const formatTimestamp = (timestamp: string) => {
		const diffMs = Date.now() - new Date(timestamp).getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffHours / 24);
		if (diffHours < 1) return "Just now";
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays}d ago`;
		return new Date(timestamp).toLocaleDateString();
	};

	return (
		<div className="space-y-8">
			{!hideUsageWidget && isAdmin && (
				<div>
					<QueryUsageWidget />
				</div>
			)}
			<div className="bg-white rounded-lg shadow-md p-6">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-xl font-semibold text-gray-800 flex items-center">
						<Clock className="h-6 w-6 text-[#0B4F96] mr-2" />
						Recent Referrals
					</h3>
					<Link
						href="/dashboard/referrals"
						className="text-sm text-[#0B4F96] hover:text-[#48ccbc] font-medium"
					>
						View All
					</Link>
				</div>
				{loading ? (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="animate-pulse flex items-center space-x-4">
								<div className="h-10 w-10 bg-gray-200 rounded-full" />
								<div className="flex-1">
									<div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
									<div className="h-3 bg-gray-200 rounded w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : recentReferrals.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
						<p className="font-medium">No referrals logged yet</p>
						<p className="text-sm mt-1">
							Start by logging a referral from the directory
						</p>
						{actionsDisabled ? (
							<span
								className="inline-block mt-4 px-4 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm cursor-not-allowed"
								title="Your agency account is suspended"
							>
								Log a Referral
							</span>
						) : (
							<Link
								href="/dashboard/referrals"
								className="inline-block mt-4 px-4 py-2 bg-[#0B4F96] text-white rounded-lg text-sm hover:bg-[#094080]"
							>
								Log a Referral
							</Link>
						)}
					</div>
				) : (
					<div className="space-y-3">
						{recentReferrals.map((referral) => (
							<div
								key={referral.id}
								className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
							>
								<div className="p-2 bg-blue-50 rounded-full text-[#0B4F96]">
									<FileText className="h-5 w-5" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-gray-800">
										{referral.referralSourceTitle || referral.referralSourceSlug}
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{referral.patientInitials &&
											`Patient: ${referral.patientInitials} · `}
										Status: {referral.status} · {formatTimestamp(referral.createdAt)}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{actionsDisabled ? (
					<div
						className="bg-white rounded-lg shadow-md p-6 opacity-50 cursor-not-allowed"
						title="Your agency account is suspended"
					>
						<FileText className="h-8 w-8 text-[#0B4F96] mb-3" />
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							Track Referrals
						</h3>
						<p className="text-sm text-gray-600 mb-4">
							Log and monitor your referral submissions
						</p>
						<span className="text-gray-400 font-medium text-sm flex items-center">
							Go to Referrals <ArrowRight className="h-4 w-4 ml-1" />
						</span>
					</div>
				) : (
					<Link
						href="/dashboard/referrals"
						className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
					>
						<FileText className="h-8 w-8 text-[#0B4F96] mb-3" />
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							Track Referrals
						</h3>
						{referralCount !== null && referralCount > 0 ? (
							<p className="text-2xl font-bold text-[#0B4F96] mb-4">
								{referralCount}{" "}
								<span className="text-sm font-normal text-gray-500">logged</span>
							</p>
						) : (
							<p className="text-sm text-gray-600 mb-4">
								Log and monitor your referral submissions
							</p>
						)}
						<span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
							Go to Referrals <ArrowRight className="h-4 w-4 ml-1" />
						</span>
					</Link>
				)}
				<Link
					href="/dashboard/favorites"
					className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
				>
					<Star className="h-8 w-8 text-[#48ccbc] mb-3" />
					<h3 className="text-lg font-semibold text-gray-800 mb-2">Favorites</h3>
					{favoriteCount !== null && favoriteCount > 0 ? (
						<p className="text-2xl font-bold text-yellow-500 mb-4">
							{favoriteCount}{" "}
							<span className="text-sm font-normal text-gray-500">saved</span>
						</p>
					) : (
						<p className="text-sm text-gray-600 mb-4">
							Quick access to your bookmarked sources
						</p>
					)}
					<span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
						View Favorites <ArrowRight className="h-4 w-4 ml-1" />
					</span>
				</Link>
				<Link
					href="/knowledge-base"
					className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
				>
					<Search className="h-8 w-8 text-purple-600 mb-3" />
					<h3 className="text-lg font-semibold text-gray-800 mb-2">
						Explore Directory
					</h3>
					<p className="text-sm text-gray-600 mb-4">
						Browse all referral sources and guides
					</p>
					<span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
						Browse Directory <ArrowRight className="h-4 w-4 ml-1" />
					</span>
				</Link>
				{/* Show upgrade card only for FREE-plan agency admins; platform/super admins have no plan to upgrade */}
				{!hideUsageWidget && isAdmin && usagePlan === "FREE" ? (
					<Link
						href="/agency/subscription"
						className="bg-gradient-to-br from-[#0B4F96] to-[#1a6bc4] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
					>
						<Crown className="h-8 w-8 text-white/80 mb-3" />
						<h3 className="text-lg font-semibold text-white mb-2">
							Upgrade Your Plan
						</h3>
						<p className="text-sm text-blue-100 mb-4">
							Get 200 AI queries/month and unlimited credential uploads
						</p>
						<span className="text-white font-medium text-sm flex items-center gap-1">
							See plans <ArrowRight className="h-4 w-4" />
						</span>
					</Link>
				) : actionsDisabled ? (
					<div
						className="bg-white rounded-lg shadow-md p-6 opacity-50 cursor-not-allowed"
						title="Your agency account is suspended"
					>
						<CheckCircle className="h-8 w-8 text-green-600 mb-3" />
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							My Credentials
						</h3>
						<p className="text-sm text-gray-600 mb-4">
							View and upload your compliance credentials
						</p>
						<span className="text-gray-400 font-medium text-sm flex items-center">
							View Credentials <ArrowRight className="h-4 w-4 ml-1" />
						</span>
					</div>
				) : (
					<Link
						href="/dashboard/credentials"
						className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
					>
						<CheckCircle className="h-8 w-8 text-green-600 mb-3" />
						<h3 className="text-lg font-semibold text-gray-800 mb-2">
							My Credentials
						</h3>
						<p className="text-sm text-gray-600 mb-4">
							View and upload your compliance credentials
						</p>
						<span className="text-[#0B4F96] group-hover:text-[#48ccbc] font-medium text-sm flex items-center">
							View Credentials <ArrowRight className="h-4 w-4 ml-1" />
						</span>
					</Link>
				)}
			</div>
		</div>
	);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
	const { data: session, status } = useSession();
	const role = (session?.user as any)?.role;
	const agencyId = (session?.user as any)?.agencyId as string | null | undefined;
	const isPlatformOrSuperAdmin =
		role === "PLATFORM_ADMIN" || role === "SUPERADMIN";
	const adminHasAgency = isPlatformOrSuperAdmin && !!agencyId;

	if (status === "loading") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="h-10 w-10 rounded-full border-4 border-[#0B4F96] border-t-transparent animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-800 mb-1">
						{adminHasAgency
							? "Platform Overview"
							: `Welcome back, ${session?.user?.name?.split(" ")[0] ?? "there"}!`}
					</h1>
					<p className="text-gray-500">
						{adminHasAgency
							? "Platform-wide analytics and agency management at a glance"
							: "Here's an overview of your referral management activity"}
					</p>
				</div>
				{adminHasAgency && <AdminDashboard />}
				{/* Personal activity — shown below platform stats for admins, standalone for everyone else */}
				<div
					className={
						isPlatformOrSuperAdmin ? "mt-12 border-t border-gray-200 pt-10" : ""
					}
				>
					{isPlatformOrSuperAdmin && (
						<div className="mb-8">
							<h2 className="text-xl font-semibold text-gray-800 mb-1">My Activity</h2>
							<p className="text-gray-500 text-sm">
								Your personal referrals, favorites, and credentials
							</p>
						</div>
					)}
					<AgencyDashboard hideUsageWidget={isPlatformOrSuperAdmin} />
				</div>
			</div>
		</div>
	);
}
