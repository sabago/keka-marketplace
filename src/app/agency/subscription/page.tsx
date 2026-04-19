"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
  CreditCard,
  ArrowRight,
  Users as UsersIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { UserRole, PlanType, AgencySize } from "@prisma/client";
import { PLAN_PRICING, STAFF_LIMITS, getPriceIdForPlan } from "@/lib/subscriptionHelpers";

const ANNUAL_PRICING: Record<PlanType, Record<AgencySize, number>> = {
  FREE: { SMALL: 0, MEDIUM: 0, LARGE: 0 },
  PRO: { SMALL: 490, MEDIUM: 990, LARGE: 1490 },
  BUSINESS: { SMALL: 1990, MEDIUM: 2990, LARGE: 4490 },
  ENTERPRISE: { SMALL: 4990, MEDIUM: 7990, LARGE: 11990 },
};

interface SubscriptionData {
  agency: {
    id: string;
    agencyName: string;
    agencySize: AgencySize;
    subscriptionPlan: PlanType;
    subscriptionStatus: string;
    queriesThisMonth: number;
    queriesAllTime: number;
    credentialUploadsTotal: number;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
  queryLimit: number;
  queriesRemaining: number;
  hasUnlimitedQueries: boolean;
  credentialLimit: number;
  isUnlimitedCredentials: boolean;
  staffCount: number;
  staffLimit: number;
  isUnlimitedStaff: boolean;
}

export default function SubscriptionManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

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

  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user.role === UserRole.AGENCY_ADMIN ||
        session?.user.role === UserRole.PLATFORM_ADMIN || session?.user.role === UserRole.SUPERADMIN)
    ) {
      fetchSubscriptionData();
    }
  }, [session, status]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agency/subscription");
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to fetch subscription data");
      }

      setData(responseData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType: PlanType) => {
    if (!data) return;

    try {
      setUpgrading(true);
      const priceId = getPriceIdForPlan(planType, data.agency.agencySize, billingCycle);

      if (!priceId) {
        throw new Error("Price ID not found for this plan and agency size");
      }

      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          agencyId: data.agency.id,
          billingCycle,
        }),
      });

      const checkoutData = await response.json();

      if (!response.ok) {
        throw new Error(checkoutData.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      window.location.href = checkoutData.url;
    } catch (err: any) {
      alert(err.message);
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const portalData = await response.json();

      if (!response.ok) {
        throw new Error(portalData.error || "Failed to access customer portal");
      }

      window.location.href = portalData.url;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isFreeplan = data?.agency.subscriptionPlan === PlanType.FREE;

  const getQueryUsagePercentage = () => {
    if (!data || data.hasUnlimitedQueries) return 0;
    const used = isFreeplan ? data.agency.queriesAllTime : data.agency.queriesThisMonth;
    return Math.min(100, Math.round((used / data.queryLimit) * 100));
  };

  const getCredentialUsagePercentage = () => {
    if (!data || data.isUnlimitedCredentials) return 0;
    return Math.min(100, Math.round((data.agency.credentialUploadsTotal / data.credentialLimit) * 100));
  };

  const getStaffUsagePercentage = () => {
    if (!data || data.isUnlimitedStaff) return 0;
    return Math.min(100, Math.round((data.staffCount / data.staffLimit) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Failed to load subscription data"}</p>
          <button
            onClick={fetchSubscriptionData}
            className="bg-[#0B4F96] text-white px-6 py-2 rounded-lg hover:bg-[#48ccbc] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentPrice = PLAN_PRICING[data.agency.subscriptionPlan][data.agency.agencySize];
  const queryUsagePercentage = getQueryUsagePercentage();
  const staffUsagePercentage = getStaffUsagePercentage();
  const credentialUsagePercentage = getCredentialUsagePercentage();
  const queriesUsedDisplay = isFreeplan ? data.agency.queriesAllTime : data.agency.queriesThisMonth;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-lg flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
                <p className="text-gray-600">Manage your plan and billing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Plan */}
        <div className="bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-lg p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-blue-100 mb-2">Current Plan</p>
              <h2 className="text-3xl font-bold">
                {data.agency.subscriptionPlan === "FREE" ? "Starter" : data.agency.subscriptionPlan}
              </h2>
              <p className="text-blue-100 mt-1">
                {data.agency.subscriptionPlan === "FREE"
                  ? "20 free queries included"
                  : `${data.agency.agencySize.charAt(0) + data.agency.agencySize.slice(1).toLowerCase()} Agency`}
              </p>
            </div>
            <div>
              <p className="text-blue-100 mb-2">Monthly Cost</p>
              <h2 className="text-3xl font-bold">
                {currentPrice === 0 ? "Free" : `$${currentPrice}`}
              </h2>
              <p className="text-blue-100 mt-1">
                {currentPrice === 0 ? "Upgrade when queries run out" : "per month"}
              </p>
            </div>
            <div>
              <p className="text-blue-100 mb-2">Status</p>
              <div className="flex items-center gap-2">
                {data.agency.subscriptionStatus === "ACTIVE" ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
                <span className="text-xl font-semibold">
                  {data.agency.subscriptionStatus}
                </span>
              </div>
            </div>
          </div>

          {data.agency.stripeSubscriptionId && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <button
                onClick={handleManageSubscription}
                className="flex items-center gap-2 bg-white text-[#0B4F96] px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <CreditCard className="h-5 w-5" />
                Manage Billing & Payment
              </button>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className={`grid grid-cols-1 ${isFreeplan ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6 mb-8`}>
          {/* Query Usage */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Query Usage</h3>
              <TrendingUp className="h-5 w-5 text-[#0B4F96]" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {isFreeplan ? "Lifetime Used" : "This Month"}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {queriesUsedDisplay} /{" "}
                    {data.hasUnlimitedQueries ? "Unlimited" : data.queryLimit}
                  </span>
                </div>
                {!data.hasUnlimitedQueries && (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        queryUsagePercentage >= 90
                          ? "bg-red-500"
                          : queryUsagePercentage >= 70
                          ? "bg-yellow-500"
                          : "bg-[#48ccbc]"
                      }`}
                      style={{ width: `${queryUsagePercentage}%` }}
                    />
                  </div>
                )}
              </div>
              {!isFreeplan && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">All Time</span>
                    <span className="font-semibold text-gray-900">
                      {data.agency.queriesAllTime} queries
                    </span>
                  </div>
                </div>
              )}
              {!isFreeplan && data.agency.billingPeriodEnd && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Resets on{" "}
                    {new Date(data.agency.billingPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
              )}
              {isFreeplan && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                    Free trial limit — does not reset. Upgrade for monthly query allowances.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Credential Document Usage — FREE plan only */}
          {isFreeplan && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Credential Documents</h3>
                <TrendingUp className="h-5 w-5 text-[#0B4F96]" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Lifetime Uploads</span>
                    <span className="font-semibold text-gray-900">
                      {data.agency.credentialUploadsTotal} / {data.credentialLimit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        credentialUsagePercentage >= 90
                          ? "bg-red-500"
                          : credentialUsagePercentage >= 70
                          ? "bg-yellow-500"
                          : "bg-[#48ccbc]"
                      }`}
                      style={{ width: `${credentialUsagePercentage}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                    Free trial limit — does not reset. Upgrade to Pro for unlimited credential tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Staff Usage */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Staff Seats</h3>
              <UsersIcon className="h-5 w-5 text-[#0B4F96]" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Current Staff</span>
                  <span className="font-semibold text-gray-900">
                    {data.staffCount} /{" "}
                    {data.isUnlimitedStaff ? "Unlimited" : data.staffLimit}
                  </span>
                </div>
                {!data.isUnlimitedStaff && (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        staffUsagePercentage >= 90
                          ? "bg-red-500"
                          : staffUsagePercentage >= 70
                          ? "bg-yellow-500"
                          : "bg-[#48ccbc]"
                      }`}
                      style={{ width: `${staffUsagePercentage}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Agency Size: <span className="font-semibold text-gray-900">
                    {data.agency.agencySize.charAt(0) +
                      data.agency.agencySize.slice(1).toLowerCase()}
                  </span>
                </p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push("/agency/staff")}
                  className="text-sm text-[#0B4F96] hover:underline font-medium"
                >
                  Manage Staff →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        {data.agency.subscriptionPlan !== PlanType.ENTERPRISE && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>

              {/* Billing cycle toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === "monthly"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    billingCycle === "annual"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Annual
                  <span className="text-[10px] font-bold bg-[#48ccbc] text-white px-1.5 py-0.5 rounded">
                    2 months free
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PRO */}
              {data.agency.subscriptionPlan === PlanType.FREE && (
                <div className="border-2 border-[#48ccbc] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="h-6 w-6 text-[#48ccbc]" />
                    <h3 className="text-xl font-bold text-gray-900">Pro</h3>
                  </div>
                  {billingCycle === "monthly" ? (
                    <p className="text-3xl font-bold text-[#0B4F96] mb-1">
                      ${PLAN_PRICING.PRO[data.agency.agencySize]}<span className="text-lg font-normal">/mo</span>
                    </p>
                  ) : (
                    <div className="mb-1">
                      <p className="text-3xl font-bold text-[#0B4F96]">
                        ${ANNUAL_PRICING.PRO[data.agency.agencySize]}<span className="text-lg font-normal">/yr</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        ${Math.round(ANNUAL_PRICING.PRO[data.agency.agencySize] / 12)}/mo · Save ${PLAN_PRICING.PRO[data.agency.agencySize] * 2}
                      </p>
                    </div>
                  )}
                  <ul className="space-y-2 mb-6 mt-4">
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                      200 queries per month
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                      Unlimited credential tracking
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                      Priority support
                    </li>
                  </ul>
                  <button
                    onClick={() => handleUpgrade(PlanType.PRO)}
                    disabled={upgrading}
                    className="w-full flex items-center justify-center gap-2 bg-[#48ccbc] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#3ab8a8] transition-colors disabled:opacity-50"
                  >
                    Upgrade to Pro <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* BUSINESS */}
              {(data.agency.subscriptionPlan === PlanType.FREE ||
                data.agency.subscriptionPlan === PlanType.PRO) && (
                <div className="border-2 border-[#0B4F96] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="h-6 w-6 text-[#0B4F96]" />
                    <h3 className="text-xl font-bold text-gray-900">Business</h3>
                  </div>
                  {billingCycle === "monthly" ? (
                    <p className="text-3xl font-bold text-[#0B4F96] mb-1">
                      ${PLAN_PRICING.BUSINESS[data.agency.agencySize]}<span className="text-lg font-normal">/mo</span>
                    </p>
                  ) : (
                    <div className="mb-1">
                      <p className="text-3xl font-bold text-[#0B4F96]">
                        ${ANNUAL_PRICING.BUSINESS[data.agency.agencySize]}<span className="text-lg font-normal">/yr</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        ${Math.round(ANNUAL_PRICING.BUSINESS[data.agency.agencySize] / 12)}/mo · Save ${PLAN_PRICING.BUSINESS[data.agency.agencySize] * 2}
                      </p>
                    </div>
                  )}
                  <ul className="space-y-2 mb-6 mt-4">
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                      Unlimited queries
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                      Advanced analytics & forecasting
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                      Full API access
                    </li>
                  </ul>
                  <button
                    onClick={() => handleUpgrade(PlanType.BUSINESS)}
                    disabled={upgrading}
                    className="w-full flex items-center justify-center gap-2 bg-[#0B4F96] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#48ccbc] transition-colors disabled:opacity-50"
                  >
                    Upgrade to Business <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* ENTERPRISE */}
              <div className="border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="h-6 w-6 text-gray-600" />
                  <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
                </div>
                {billingCycle === "monthly" ? (
                  <p className="text-3xl font-bold text-[#0B4F96] mb-1">
                    ${PLAN_PRICING.ENTERPRISE[data.agency.agencySize]}<span className="text-lg font-normal">/mo</span>
                  </p>
                ) : (
                  <div className="mb-1">
                    <p className="text-3xl font-bold text-[#0B4F96]">
                      ${ANNUAL_PRICING.ENTERPRISE[data.agency.agencySize]}<span className="text-lg font-normal">/yr</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      ${Math.round(ANNUAL_PRICING.ENTERPRISE[data.agency.agencySize] / 12)}/mo · Save ${PLAN_PRICING.ENTERPRISE[data.agency.agencySize] * 2}
                    </p>
                  </div>
                )}
                <ul className="space-y-2 mb-6 mt-4">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                    Everything in Business
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-5 w-5 text-[#48ccbc] flex-shrink-0 mt-0.5" />
                    24/7 priority support
                  </li>
                </ul>
                <button
                  onClick={() =>
                    (window.location.href =
                      "mailto:sales@example.com?subject=Enterprise Plan Inquiry")
                  }
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Contact Sales <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {billingCycle === "annual" && (
              <p className="text-xs text-gray-500 mt-4 text-center">
                Annual plans are billed upfront for 12 months. You save the equivalent of 2 months compared to monthly billing.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
