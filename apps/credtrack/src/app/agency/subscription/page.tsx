"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users as UsersIcon,
  Zap,
  ArrowRight,
  X,
} from "lucide-react";
import type { CredTrackPlan } from "@/types/next-auth";

interface StaffCountData {
  records: Array<{ id: string }>;
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
  BUNDLED: "Bundled (MHC)",
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-700",
  GROWTH: "bg-blue-100 text-blue-700",
  ENTERPRISE: "bg-purple-100 text-purple-700",
  BUNDLED: "bg-green-100 text-green-700",
};

interface PlanCardProps {
  planKey: "GROWTH" | "ENTERPRISE";
  name: string;
  price: string;
  staffLimit: string;
  aiParsing: string;
  features: string[];
  currentPlan: string;
  isBundled: boolean;
  onUpgrade: (plan: "GROWTH" | "ENTERPRISE") => void;
  upgrading: boolean;
}

function PlanCard({
  planKey,
  name,
  price,
  staffLimit,
  aiParsing,
  features,
  currentPlan,
  isBundled,
  onUpgrade,
  upgrading,
}: PlanCardProps) {
  const isCurrent = currentPlan === planKey;
  const isDowngrade =
    currentPlan === "ENTERPRISE" && planKey === "GROWTH";
  const isEnterprise = planKey === "ENTERPRISE";

  return (
    <div
      className={`border-2 rounded-xl p-6 flex flex-col ${
        isEnterprise
          ? "border-purple-400 bg-purple-50"
          : "border-blue-300 bg-blue-50"
      }`}
    >
      {isEnterprise && (
        <div className="flex items-center gap-1 text-xs font-semibold text-purple-600 mb-2 uppercase tracking-wide">
          <Crown className="h-3.5 w-3.5" /> Most Popular
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
      <p className="text-3xl font-extrabold text-gray-900 mb-1">
        {price}
        <span className="text-base font-normal text-gray-500"> /mo</span>
      </p>
      <p className="text-sm text-gray-600 mb-4">
        {staffLimit} · {aiParsing}
      </p>

      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {isBundled ? (
        <p className="text-sm text-green-700 font-medium text-center">
          Included in your MHC subscription
        </p>
      ) : isCurrent ? (
        <div className="text-center py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded-lg">
          Current plan
        </div>
      ) : isDowngrade ? (
        <p className="text-sm text-gray-400 text-center">
          Contact support to downgrade
        </p>
      ) : (
        <button
          onClick={() => onUpgrade(planKey)}
          disabled={upgrading}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
            isEnterprise
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          } disabled:opacity-60`}
        >
          {upgrading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Upgrade to {name} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function SubscriptionManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  const plan = (session?.user as { credtrackPlan?: CredTrackPlan })
    ?.credtrackPlan ?? "STARTER";
  const isBundled =
    (session?.user as { isBundled?: boolean })?.isBundled ?? false;

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    const role = session.user?.role;
    if (
      role !== "AGENCY_ADMIN" &&
      role !== "PLATFORM_ADMIN" &&
      role !== "SUPERADMIN"
    ) {
      router.push("/my-credentials");
      return;
    }

    fetchStaffCount();
  }, [session, status, router]);

  const fetchStaffCount = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data: StaffCountData = await res.json();
        setStaffCount((data.records ?? []).length);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (targetPlan: "GROWTH" | "ENTERPRISE") => {
    if (isBundled) {
      setError(
        "CredTrack is already included in your Mastering HomeCare subscription."
      );
      return;
    }

    setUpgrading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setUpgrading(false);
    }
  };

  const staffLimit =
    plan === "GROWTH" ? 50 : plan === "STARTER" ? 5 : -1;
  const staffLimitLabel =
    staffLimit === -1 ? "Unlimited staff" : `Up to ${staffLimit} staff`;

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto" />
          <p className="mt-4 text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <Crown className="h-6 w-6 text-[#0B4F96]" />
            Subscription & Billing
          </h1>
          <p className="text-gray-500 text-sm">
            Manage your CredTrack plan and billing details.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Current plan card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-bold ${
                    isBundled ? "text-green-700" : "text-gray-900"
                  }`}
                >
                  {PLAN_LABELS[plan] ?? plan}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {plan === "BUNDLED" ? "Active via MHC" : "Active"}
                </span>
              </div>
            </div>
            {isBundled && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Included with</p>
                <p className="text-sm font-medium text-gray-700">
                  Mastering HomeCare
                </p>
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <UsersIcon className="h-8 w-8 text-[#0B4F96]" />
              <div>
                <p className="text-sm text-gray-500">Staff</p>
                <p className="text-xl font-bold text-gray-900">
                  {staffCount ?? "—"}
                  {staffLimit !== -1 && (
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      / {staffLimit}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{staffLimitLabel}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
              <Zap className="h-8 w-8 text-[#0B4F96]" />
              <div>
                <p className="text-sm text-gray-500">AI Credential Parsing</p>
                <p className="text-base font-semibold text-gray-900">
                  {plan === "STARTER"
                    ? "Not available"
                    : "Enabled"}
                </p>
                <p className="text-xs text-gray-500">
                  {plan === "GROWTH"
                    ? "Up to 100 parses/month"
                    : plan === "STARTER"
                    ? "Upgrade to enable"
                    : "Unlimited"}
                </p>
              </div>
            </div>
          </div>

          {isBundled && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                CredTrack is included in your Mastering HomeCare subscription at
                no extra charge. You have full Enterprise-level access.
              </p>
            </div>
          )}
        </div>

        {/* Upgrade options — only shown for STARTER or GROWTH (not BUNDLED or ENTERPRISE) */}
        {!isBundled && plan !== "ENTERPRISE" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {plan === "STARTER" ? "Upgrade Your Plan" : "Upgrade to Enterprise"}
            </h2>
            <div className={`grid gap-6 ${plan === "STARTER" ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"}`}>
              {plan === "STARTER" && (
                <PlanCard
                  planKey="GROWTH"
                  name="Growth"
                  price="$79"
                  staffLimit="Up to 50 staff"
                  aiParsing="100 AI parses/month"
                  features={[
                    "Up to 50 active staff members",
                    "AI credential parsing (100/month)",
                    "Automated expiration reminders",
                    "Compliance dashboard",
                    "Document type customization",
                    "Audit log",
                  ]}
                  currentPlan={plan}
                  isBundled={isBundled}
                  onUpgrade={handleUpgrade}
                  upgrading={upgrading}
                />
              )}
              <PlanCard
                planKey="ENTERPRISE"
                name="Enterprise"
                price="$199"
                staffLimit="Unlimited staff"
                aiParsing="Unlimited AI parses"
                features={[
                  "Unlimited active staff members",
                  "Unlimited AI credential parsing",
                  "Automated expiration reminders",
                  "Compliance dashboard",
                  "Document type customization",
                  "Full audit log history",
                  "Priority support",
                ]}
                currentPlan={plan}
                isBundled={isBundled}
                onUpgrade={handleUpgrade}
                upgrading={upgrading}
              />
            </div>
          </div>
        )}

        {/* Already on Enterprise non-bundled */}
        {!isBundled && plan === "ENTERPRISE" && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
            <Crown className="h-10 w-10 text-purple-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              You&apos;re on Enterprise
            </h2>
            <p className="text-sm text-gray-600">
              You have full access to all CredTrack features. Contact{" "}
              <a
                href="mailto:support@masteringhomecare.com"
                className="text-purple-600 hover:underline"
              >
                support@masteringhomecare.com
              </a>{" "}
              for billing inquiries.
            </p>
          </div>
        )}

        {/* Bundled messaging */}
        {isBundled && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Full access included
            </h2>
            <p className="text-sm text-gray-600">
              CredTrack Enterprise is bundled with your Mastering HomeCare
              subscription. To manage your MHC billing, visit{" "}
              <a
                href="https://masteringhomecare.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:underline"
              >
                masteringhomecare.com
              </a>
              .
            </p>
          </div>
        )}

        {/* Enterprise contact modal */}
        {showEnterpriseModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Enterprise Inquiry
                </h3>
                <button
                  onClick={() => setShowEnterpriseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Contact us to discuss Enterprise pricing and custom
                configurations for your agency.
              </p>
              <a
                href="mailto:sales@masteringhomecare.com?subject=CredTrack Enterprise Inquiry"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm"
              >
                Email sales@masteringhomecare.com
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
