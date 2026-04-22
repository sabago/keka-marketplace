"use client";

import { useEffect, useState } from "react";
import { Activity, Infinity, ArrowRight, AlertTriangle, Zap } from "lucide-react";
import Link from "next/link";

interface UsageData {
  plan: string;
  queriesUsed: number;
  queriesLimit: number;
  isUnlimited: boolean;
  isLifetime: boolean;
  resetDate: string | null;
  daysUntilReset: number | null;
  credentialUploadsUsed: number;
  credentialUploadsLimit: number;
  credentialUploadsUnlimited: boolean;
}

function UsageBar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function QueryUsageWidget() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = (showLoading = false) => {
    if (showLoading) setLoading(true);
    fetch("/api/dashboard/usage")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsage(true);
    const handler = () => fetchUsage(false);
    window.addEventListener("chatbot-query-used", handler);
    return () => window.removeEventListener("chatbot-query-used", handler);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-3 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (!data) return null;

  const {
    plan,
    queriesUsed,
    queriesLimit,
    isUnlimited,
    isLifetime,
    daysUntilReset,
    credentialUploadsUsed,
    credentialUploadsLimit,
    credentialUploadsUnlimited,
  } = data;

  const queryPct = isUnlimited ? 0 : Math.min(100, Math.round((queriesUsed / queriesLimit) * 100));
  const credPct = credentialUploadsUnlimited
    ? 0
    : Math.min(100, Math.round((credentialUploadsUsed / credentialUploadsLimit) * 100));

  const queryAtLimit = !isUnlimited && queriesUsed >= queriesLimit;
  const credAtLimit = !credentialUploadsUnlimited && credentialUploadsUsed >= credentialUploadsLimit;
  const queryNearLimit = !isUnlimited && queryPct >= 80 && !queryAtLimit;
  const credNearLimit = !credentialUploadsUnlimited && credPct >= 80 && !credAtLimit;

  const queryBarColor = queryPct >= 90 ? "bg-red-500" : queryPct >= 70 ? "bg-amber-400" : "bg-[#48ccbc]";
  const credBarColor = credPct >= 90 ? "bg-red-500" : credPct >= 70 ? "bg-amber-400" : "bg-[#48ccbc]";

  const isFreePlan = plan === "FREE";

  // At-limit: full-width upgrade CTA card
  if (queryAtLimit || credAtLimit) {
    return (
      <div className="bg-gradient-to-r from-[#0B4F96] to-[#1a6bc4] rounded-lg p-6 text-white shadow-md">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold mb-1">
              {queryAtLimit && credAtLimit
                ? "You've reached your free trial limits"
                : queryAtLimit
                ? isLifetime
                  ? "You've used all your free trial AI queries"
                  : "You've used all your monthly AI queries"
                : "You've used all your free trial credential uploads"}
            </h3>
            <p className="text-blue-100 text-sm mb-4">
              {isLifetime
                ? "Your free trial included 20 AI queries and 10 credential uploads. Upgrade to Pro to unlock 200 queries/month and unlimited credential tracking."
                : "Upgrade to Business or Enterprise for unlimited queries and credential uploads."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/agency/subscription"
                className="inline-flex items-center gap-2 bg-white text-[#0B4F96] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Upgrade Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="text-blue-100 text-sm self-center">
                {queryAtLimit && !isLifetime && daysUntilReset !== null
                  ? `Resets in ${daysUntilReset} ${daysUntilReset === 1 ? "day" : "days"}`
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#0B4F96]" />
          <h3 className="text-base font-semibold text-gray-900">Usage</h3>
        </div>
        <Link
          href="/agency/subscription"
          className="text-xs text-[#0B4F96] hover:text-[#48ccbc] font-medium transition-colors"
        >
          View plan details →
        </Link>
      </div>

      <div className="space-y-5">
        {/* AI Queries */}
        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-sm font-medium text-gray-700">
              AI Queries
              {isLifetime && (
                <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  lifetime trial
                </span>
              )}
            </span>
            {isUnlimited ? (
              <span className="flex items-center gap-1 text-sm text-purple-600 font-medium">
                <Infinity className="h-4 w-4" /> Unlimited
              </span>
            ) : (
              <span className={`text-sm font-semibold ${queryNearLimit ? "text-amber-600" : "text-gray-700"}`}>
                {queriesUsed} / {queriesLimit}
              </span>
            )}
          </div>
          {!isUnlimited && (
            <>
              <UsageBar used={queriesUsed} limit={queriesLimit} color={queryBarColor} />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-400">
                  {isLifetime
                    ? "Does not reset — trial limit"
                    : daysUntilReset !== null
                    ? `Resets in ${daysUntilReset} ${daysUntilReset === 1 ? "day" : "days"}`
                    : ""}
                </span>
                <span className="text-xs text-gray-400">{queryPct}% used</span>
              </div>
            </>
          )}
          {queryNearLimit && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 mt-2">
              {isLifetime
                ? `${queriesLimit - queriesUsed} of your free trial queries remaining.`
                : `${queriesLimit - queriesUsed} queries left this month.`}{" "}
              <Link href="/agency/subscription" className="font-semibold underline">
                Upgrade your plan
              </Link>{" "}
              to avoid interruption.
            </p>
          )}
        </div>

        {/* Credential Uploads — shown on FREE plan or if near/at limit on any plan */}
        {(isFreePlan || credNearLimit) && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-medium text-gray-700">
                Credential Uploads
                {isFreePlan && (
                  <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    lifetime trial
                  </span>
                )}
              </span>
              {credentialUploadsUnlimited ? (
                <span className="flex items-center gap-1 text-sm text-purple-600 font-medium">
                  <Infinity className="h-4 w-4" /> Unlimited
                </span>
              ) : (
                <span className={`text-sm font-semibold ${credNearLimit ? "text-amber-600" : "text-gray-700"}`}>
                  {credentialUploadsUsed} / {credentialUploadsLimit}
                </span>
              )}
            </div>
            {!credentialUploadsUnlimited && (
              <>
                <UsageBar used={credentialUploadsUsed} limit={credentialUploadsLimit} color={credBarColor} />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-gray-400">Does not reset — trial limit</span>
                  <span className="text-xs text-gray-400">{credPct}% used</span>
                </div>
              </>
            )}
            {credNearLimit && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 mt-2">
                {credentialUploadsLimit - credentialUploadsUsed} credential uploads remaining.{" "}
                <Link href="/agency/subscription" className="font-semibold underline">
                  Upgrade to Pro
                </Link>{" "}
                for unlimited document tracking.
              </p>
            )}
          </div>
        )}

        {/* Upgrade nudge for FREE plan that hasn't hit limits yet */}
        {isFreePlan && !queryAtLimit && !credAtLimit && (
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              On the free trial.{" "}
              <Link href="/agency/subscription" className="text-[#0B4F96] font-medium hover:underline">
                See upgrade options
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
