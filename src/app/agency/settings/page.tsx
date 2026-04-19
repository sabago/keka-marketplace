"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  TrendingUp,
  FileText,
  Star,
  ArrowRight,
  ShieldCheck,
  Zap,
  Crown,
} from "lucide-react";
import { UserRole, AgencySize } from "@prisma/client";
import Link from "next/link";

export default function AgencySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Stats state
  const [statsData, setStatsData] = useState<{
    agencyName: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    queriesThisMonth: number;
    queriesAllTime: number;
    credentialUploadsTotal: number;
    queryLimit: number;
    queriesRemaining: number;
    hasUnlimitedQueries: boolean;
    credentialLimit: number;
    isUnlimitedCredentials: boolean;
    staffCount: number;
    staffLimit: number;
    isUnlimitedStaff: boolean;
    billingPeriodStart: string | null;
    billingPeriodEnd: string | null;
  } | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
  const [complianceStats, setComplianceStats] = useState<{
    pendingReview: number;
    expiringSoon: number;
    expired: number;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    agencyName: string;
    agencySize: AgencySize;
    servicesOffered: string[];
    serviceArea: string[];
    primaryContactName: string;
    primaryContactRole: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
    intakeMethods: string[];
    followUpFrequency: string;
    followUpMethods: string[];
    avgReferralsPerMonth: number;
    specializations: string[];
  }>({
    agencyName: "",
    agencySize: AgencySize.MEDIUM,
    servicesOffered: [] as string[],
    serviceArea: [] as string[],
    primaryContactName: "",
    primaryContactRole: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    intakeMethods: [] as string[],
    followUpFrequency: "",
    followUpMethods: [] as string[],
    avgReferralsPerMonth: 0,
    specializations: [] as string[],
  });

  // Options for multi-select fields
  const serviceOptions = [
    "Home Health Care",
    "Personal Care",
    "Hospice",
    "Palliative Care",
    "Skilled Nursing",
    "Physical Therapy",
    "Occupational Therapy",
    "Speech Therapy",
    "Medical Social Work",
    "Home Health Aide",
  ];

  const intakeMethodOptions = [
    "Phone",
    "Online Portal",
    "Email",
    "Fax",
    "In-Person",
  ];

  const followUpMethodOptions = ["Email", "Phone", "Text", "In-Person", "Automated"];

  const followUpFrequencyOptions = [
    "Daily",
    "Weekly",
    "Bi-weekly",
    "Monthly",
    "As-needed",
  ];

  const specializationOptions = [
    "Pediatric Care",
    "Geriatric Care",
    "Post-Surgical Care",
    "Chronic Disease Management",
    "Wound Care",
    "IV Therapy",
    "Dementia/Alzheimer's Care",
    "End-of-Life Care",
    "Rehabilitation",
    "Mental Health",
  ];

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (
      session?.user &&
      session.user.role !== UserRole.AGENCY_ADMIN &&
      session.user.role !== UserRole.PLATFORM_ADMIN && session.user.role !== UserRole.SUPERADMIN
    ) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Fetch agency settings
  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user.role === UserRole.AGENCY_ADMIN ||
        session?.user.role === UserRole.PLATFORM_ADMIN || session?.user.role === UserRole.SUPERADMIN)
    ) {
      fetchSettings();
    }
  }, [session, status]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, subRes, referralsRes, favoritesRes, complianceRes] = await Promise.all([
        fetch("/api/agency/settings"),
        fetch("/api/agency/subscription"),
        fetch("/api/referrals"),
        fetch("/api/favorites"),
        fetch("/api/agency/compliance/dashboard"),
      ]);

      const data = await settingsRes.json();
      if (!settingsRes.ok) throw new Error(data.error || "Failed to fetch settings");

      setFormData({
        agencyName: data.agency.agencyName || "",
        agencySize: data.agency.agencySize || AgencySize.MEDIUM,
        servicesOffered: data.agency.servicesOffered || [],
        serviceArea: data.agency.serviceArea || [],
        primaryContactName: data.agency.primaryContactName || "",
        primaryContactRole: data.agency.primaryContactRole || "",
        primaryContactEmail: data.agency.primaryContactEmail || "",
        primaryContactPhone: data.agency.primaryContactPhone || "",
        intakeMethods: data.agency.intakeMethods || [],
        followUpFrequency: data.agency.followUpFrequency || "",
        followUpMethods: data.agency.followUpMethods || [],
        avgReferralsPerMonth: data.agency.avgReferralsPerMonth || 0,
        specializations: data.agency.specializations || [],
      });

      if (subRes.ok) {
        const sub = await subRes.json();
        setStatsData({
          agencyName: sub.agency?.agencyName || data.agency.agencyName || "",
          subscriptionPlan: sub.agency?.subscriptionPlan || "FREE",
          subscriptionStatus: sub.agency?.subscriptionStatus || "ACTIVE",
          queriesThisMonth: sub.agency?.queriesThisMonth ?? 0,
          queriesAllTime: sub.agency?.queriesAllTime ?? 0,
          credentialUploadsTotal: sub.agency?.credentialUploadsTotal ?? 0,
          queryLimit: sub.queryLimit,
          queriesRemaining: sub.queriesRemaining,
          hasUnlimitedQueries: sub.hasUnlimitedQueries,
          credentialLimit: sub.credentialLimit,
          isUnlimitedCredentials: sub.isUnlimitedCredentials,
          staffCount: sub.staffCount,
          staffLimit: sub.staffLimit,
          isUnlimitedStaff: sub.isUnlimitedStaff,
          billingPeriodStart: sub.agency?.billingPeriodStart ?? null,
          billingPeriodEnd: sub.agency?.billingPeriodEnd ?? null,
        });
      }

      if (referralsRes.ok) {
        const r = await referralsRes.json();
        setReferralCount((r.referrals || []).length);
      }
      if (favoritesRes.ok) {
        const f = await favoritesRes.json();
        setFavoriteCount((f.favorites || []).length);
      }
      if (complianceRes.ok) {
        const c = await complianceRes.json();
        setComplianceStats({
          pendingReview: c.stats?.documents?.pendingReview ?? 0,
          expiringSoon: c.stats?.documents?.expiringSoon ?? 0,
          expired: c.stats?.documents?.expired ?? 0,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/agency/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayValue = (
    field: keyof typeof formData,
    value: string
  ) => {
    const currentArray = formData[field] as string[];
    if (currentArray.includes(value)) {
      setFormData({
        ...formData,
        [field]: currentArray.filter((item) => item !== value),
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...currentArray, value],
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin" />
      </div>
    );
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "text-green-600 bg-green-100";
      case "TRIALING": return "text-blue-600 bg-blue-100";
      case "PAST_DUE": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return "text-red-600";
    if (pct >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Agency Overview Header */}
        {statsData && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#0B4F96] rounded-full flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{statsData.agencyName}</h1>
                    <p className="text-gray-600">Welcome back, {session?.user?.name || session?.user?.email}</p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(statsData.subscriptionStatus)}`}>
                  {statsData.subscriptionStatus}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Subscription & Usage card — upgrade-aware */}
              {(() => {
                const isFreePlan = statsData.subscriptionPlan === "FREE";
                const queriesUsed = isFreePlan ? statsData.queriesAllTime : statsData.queriesThisMonth;
                const queryPct = statsData.hasUnlimitedQueries ? 0 : Math.min(100, Math.round((queriesUsed / statsData.queryLimit) * 100));
                const credPct = statsData.isUnlimitedCredentials ? 0 : Math.min(100, Math.round((statsData.credentialUploadsTotal / statsData.credentialLimit) * 100));
                const queryAtLimit = !statsData.hasUnlimitedQueries && queriesUsed >= statsData.queryLimit;
                const credAtLimit = !statsData.isUnlimitedCredentials && statsData.credentialUploadsTotal >= statsData.credentialLimit;
                const atLimit = queryAtLimit || credAtLimit;
                const nearLimit = !atLimit && (queryPct >= 80 || credPct >= 80);

                if (atLimit) {
                  return (
                    <Link href="/agency/subscription" className="bg-gradient-to-br from-[#0B4F96] to-[#1a6bc4] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <Zap className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold bg-white/20 text-white px-2 py-1 rounded-full">Action needed</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {isFreePlan ? "Free trial limit reached" : "Monthly limit reached"}
                      </h3>
                      <p className="text-blue-100 text-sm mb-4">
                        {isFreePlan
                          ? "Upgrade to Pro for 200 queries/month and unlimited credential uploads."
                          : "Upgrade to Business for unlimited queries."}
                      </p>
                      <span className="inline-flex items-center gap-1.5 bg-white text-[#0B4F96] text-sm font-semibold px-3 py-1.5 rounded-lg">
                        Upgrade Now <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  );
                }

                return (
                  <Link href="/agency/subscription" className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${nearLimit ? "bg-amber-50 border border-amber-200" : "bg-white"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${nearLimit ? "bg-amber-100" : "bg-blue-100"}`}>
                        {isFreePlan ? <Crown className={`h-6 w-6 ${nearLimit ? "text-amber-600" : "text-[#0B4F96]"}`} /> : <CreditCard className={`h-6 w-6 ${nearLimit ? "text-amber-600" : "text-[#0B4F96]"}`} />}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Plan &amp; Billing</h3>
                    <p className={`text-xl font-bold mb-2 ${isFreePlan ? "text-amber-600" : "text-[#0B4F96]"}`}>
                      {isFreePlan ? "Free Trial" : statsData.subscriptionPlan}
                    </p>
                    {statsData.hasUnlimitedQueries ? (
                      <p className="text-sm text-gray-500">Unlimited queries · <span className="text-[#48ccbc] font-medium">All features unlocked</span></p>
                    ) : (
                      <div className="space-y-2">
                        {/* AI Queries */}
                        <div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                            <div className={`h-1.5 rounded-full ${queryPct >= 90 ? "bg-red-500" : queryPct >= 70 ? "bg-amber-400" : "bg-[#48ccbc]"}`} style={{ width: `${queryPct}%` }} />
                          </div>
                          <p className="text-sm text-gray-500">
                            <span className={`font-semibold ${getUsageColor(queryPct)}`}>{queriesUsed}/{statsData.queryLimit}</span>
                            {" "}{isFreePlan ? "lifetime queries used" : "queries this month"}
                            {nearLimit && queryPct >= 80 && <span className="ml-1 text-amber-600 font-medium">· Upgrade soon</span>}
                          </p>
                        </div>
                        {/* Credential uploads — FREE plan only */}
                        {isFreePlan && (
                          <div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                              <div className={`h-1.5 rounded-full ${credPct >= 90 ? "bg-red-500" : credPct >= 70 ? "bg-amber-400" : "bg-[#48ccbc]"}`} style={{ width: `${credPct}%` }} />
                            </div>
                            <p className="text-sm text-gray-500">
                              <span className={`font-semibold ${getUsageColor(credPct)}`}>{statsData.credentialUploadsTotal}/{statsData.credentialLimit}</span>
                              {" "}lifetime document uploads
                              {nearLimit && credPct >= 80 && <span className="ml-1 text-amber-600 font-medium">· Upgrade soon</span>}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {isFreePlan && (
                      <p className="text-xs text-amber-700 mt-2 font-medium">Free trial — limits do not reset</p>
                    )}
                  </Link>
                );
              })()}

              <Link href="/agency/staff" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Members</h3>
                {statsData.isUnlimitedStaff ? (
                  <><p className="text-3xl font-bold text-purple-600 mb-1">{statsData.staffCount}</p><p className="text-sm text-gray-600">Unlimited seats</p></>
                ) : (
                  <><p className="text-3xl font-bold text-gray-900 mb-1"><span className={getUsageColor(Math.round((statsData.staffCount / statsData.staffLimit) * 100))}>{statsData.staffCount}</span><span className="text-lg text-gray-500"> / {statsData.staffLimit}</span></p><p className="text-sm text-gray-600">{Math.round((statsData.staffCount / statsData.staffLimit) * 100)}% of seats used</p></>
                )}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Link href="/dashboard/referrals" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-[#0B4F96]" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Referrals</h3>
                {referralCount !== null && referralCount > 0
                  ? <p className="text-2xl font-bold text-[#0B4F96]">{referralCount} <span className="text-sm font-normal text-gray-500">logged</span></p>
                  : <p className="text-sm text-gray-600">Log and track your referral submissions</p>}
              </Link>
              <Link href="/dashboard/favorites" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6 text-yellow-500" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Favorites</h3>
                {favoriteCount !== null && favoriteCount > 0
                  ? <p className="text-2xl font-bold text-yellow-500">{favoriteCount} <span className="text-sm font-normal text-gray-500">saved</span></p>
                  : <p className="text-sm text-gray-600">Quick access to your bookmarked directory sources</p>}
              </Link>
              <Link href="/agency/compliance" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    complianceStats && (complianceStats.expired > 0 || complianceStats.expiringSoon > 0 || complianceStats.pendingReview > 0)
                      ? "bg-red-100"
                      : "bg-green-100"
                  }`}>
                    <ShieldCheck className={`h-6 w-6 ${
                      complianceStats && (complianceStats.expired > 0 || complianceStats.expiringSoon > 0 || complianceStats.pendingReview > 0)
                        ? "text-red-600"
                        : "text-green-600"
                    }`} />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Credential Compliance</h3>
                {complianceStats ? (
                  complianceStats.pendingReview === 0 && complianceStats.expiringSoon === 0 && complianceStats.expired === 0 ? (
                    <p className="text-sm text-green-600 font-medium">All credentials up to date</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      {complianceStats.pendingReview > 0 && (
                        <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {complianceStats.pendingReview} pending review
                        </span>
                      )}
                      {complianceStats.expiringSoon > 0 && (
                        <span className="text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                          {complianceStats.expiringSoon} expiring
                        </span>
                      )}
                      {complianceStats.expired > 0 && (
                        <span className="text-red-700 bg-red-50 px-2 py-1 rounded">
                          {complianceStats.expired} expired
                        </span>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-500">Monitor staff credential health</p>
                )}
              </Link>
            </div>
          </>
        )}

        {/* Settings Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agency Settings</h1>
              <p className="text-gray-600">Manage your agency profile and preferences</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">Success</h3>
              <p className="text-sm text-green-700 mt-1">
                Settings updated successfully!
              </p>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#0B4F96]" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agency Name
                </label>
                <input
                  type="text"
                  value={formData.agencyName}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">
                  To update your agency name, contact{' '}
                  <a href="mailto:info@masteringhomecare.com" className="underline hover:text-[#0B4F96]">
                    info@masteringhomecare.com
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agency Size *
                </label>
                <select
                  value={formData.agencySize}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      agencySize: e.target.value as AgencySize,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  required
                >
                  <option value={AgencySize.SMALL}>Small (1-10 employees)</option>
                  <option value={AgencySize.MEDIUM}>Medium (11-50 employees)</option>
                  <option value={AgencySize.LARGE}>Large (50+ employees)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0B4F96]" />
              Primary Contact
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.primaryContactName}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Contact Role *
                </label>
                <input
                  type="text"
                  value={formData.primaryContactRole}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactRole: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactEmail: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.primaryContactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactPhone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Services & Specializations
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Services Offered
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {serviceOptions.map((service) => (
                    <label
                      key={service}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.servicesOffered.includes(service)}
                        onChange={() => toggleArrayValue("servicesOffered", service)}
                        className="rounded text-[#0B4F96] focus:ring-[#0B4F96]"
                      />
                      <span className="text-sm text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Specializations
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {specializationOptions.map((spec) => (
                    <label key={spec} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specializations.includes(spec)}
                        onChange={() => toggleArrayValue("specializations", spec)}
                        className="rounded text-[#0B4F96] focus:ring-[#0B4F96]"
                      />
                      <span className="text-sm text-gray-700">{spec}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Operational Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Intake Methods
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {intakeMethodOptions.map((method) => (
                    <label
                      key={method}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.intakeMethods.includes(method)}
                        onChange={() => toggleArrayValue("intakeMethods", method)}
                        className="rounded text-[#0B4F96] focus:ring-[#0B4F96]"
                      />
                      <span className="text-sm text-gray-700">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-Up Frequency
                  </label>
                  <select
                    value={formData.followUpFrequency}
                    onChange={(e) =>
                      setFormData({ ...formData, followUpFrequency: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  >
                    <option value="">Select frequency</option>
                    {followUpFrequencyOptions.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Referrals per Month
                  </label>
                  <input
                    type="number"
                    value={formData.avgReferralsPerMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avgReferralsPerMonth: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Follow-Up Methods
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {followUpMethodOptions.map((method) => (
                    <label
                      key={method}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.followUpMethods.includes(method)}
                        onChange={() => toggleArrayValue("followUpMethods", method)}
                        className="rounded text-[#0B4F96] focus:ring-[#0B4F96]"
                      />
                      <span className="text-sm text-gray-700">{method}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#0B4F96] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#48ccbc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
