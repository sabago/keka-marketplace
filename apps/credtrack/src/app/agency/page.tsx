"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Crown,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { CredTrackPlan } from "@/types/next-auth";

interface OrgStats {
  plan: CredTrackPlan;
  isBundled: boolean;
  staffCount: number;
  staffLimit: number;
  isUnlimitedStaff: boolean;
}

interface ComplianceStats {
  pendingReview: number;
  expiringSoon: number;
  expired: number;
}

export default function AgencyOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/auth/signin"); return; }
    const role = session.user?.role;
    if (role !== "AGENCY_ADMIN" && role !== "PLATFORM_ADMIN" && role !== "SUPERADMIN") {
      router.push("/my-credentials");
      return;
    }
    fetchData();
  }, [session, status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, complianceRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/compliance/dashboard?countsOnly=true"),
      ]);

      if (staffRes.ok) {
        const d = await staffRes.json();
        const plan = (session?.user as any)?.credtrackPlan as CredTrackPlan ?? "STARTER";
        const isBundled = (session?.user as any)?.isBundled ?? false;
        const staffLimit = plan === "STARTER" ? 5 : -1;
        setOrgStats({
          plan,
          isBundled,
          staffCount: (d.records ?? []).length,
          staffLimit,
          isUnlimitedStaff: staffLimit === -1,
        });
      }

      if (complianceRes.ok) {
        const c = await complianceRes.json();
        setComplianceStats({
          pendingReview: c.stats?.documents?.pendingReview ?? 0,
          expiringSoon: c.stats?.documents?.expiringSoon ?? 0,
          expired: c.stats?.documents?.expired ?? 0,
        });
      }

      // Get agency name from session
      setAgencyName((session?.user as any)?.orgName ?? session?.user?.name ?? "Your Agency");
    } catch {
      // non-fatal — page still renders with nulls
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  const hasComplianceIssues =
    complianceStats &&
    (complianceStats.expired > 0 ||
      complianceStats.expiringSoon > 0 ||
      complianceStats.pendingReview > 0);

  const planLabel = orgStats?.isBundled
    ? "MHC Bundled"
    : orgStats?.plan === "STARTER"
    ? "Free / Starter"
    : orgStats?.plan ?? "—";

  const atStaffLimit =
    orgStats &&
    !orgStats.isUnlimitedStaff &&
    orgStats.staffCount >= orgStats.staffLimit;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0B4F96] rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{agencyName}</h1>
              <p className="text-gray-600">
                Welcome back, {session?.user?.name || session?.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Plan card */}
          <Link
            href="/agency/subscription"
            className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
              atStaffLimit ? "bg-amber-50 border border-amber-200" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  atStaffLimit ? "bg-amber-100" : "bg-blue-100"
                }`}
              >
                {orgStats?.plan === "STARTER" ? (
                  <Crown className={`h-6 w-6 ${atStaffLimit ? "text-amber-600" : "text-[#0B4F96]"}`} />
                ) : (
                  <CreditCard className={`h-6 w-6 ${atStaffLimit ? "text-amber-600" : "text-[#0B4F96]"}`} />
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Plan &amp; Billing</h3>
            <p
              className={`text-xl font-bold ${
                orgStats?.plan === "STARTER" ? "text-amber-600" : "text-[#0B4F96]"
              }`}
            >
              {planLabel}
            </p>
            {atStaffLimit && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Staff limit reached — upgrade to add more
              </p>
            )}
          </Link>

          {/* Staff card */}
          <Link
            href="/agency/staff"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff</h3>
            {orgStats ? (
              orgStats.isUnlimitedStaff ? (
                <>
                  <p className="text-3xl font-bold text-purple-600">{orgStats.staffCount}</p>
                  <p className="text-sm text-gray-600">Unlimited seats</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900">
                    <span className={orgStats.staffCount >= orgStats.staffLimit ? "text-red-600" : "text-purple-600"}>
                      {orgStats.staffCount}
                    </span>
                    <span className="text-lg text-gray-500"> / {orgStats.staffLimit}</span>
                  </p>
                  <p className="text-sm text-gray-600">staff members tracked</p>
                </>
              )
            ) : (
              <p className="text-sm text-gray-500">Manage credential tracking</p>
            )}
          </Link>

          {/* Compliance card */}
          <Link
            href="/agency/compliance"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  hasComplianceIssues ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <ShieldCheck
                  className={`h-6 w-6 ${
                    hasComplianceIssues ? "text-red-600" : "text-green-600"
                  }`}
                />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Credential Compliance</h3>
            {complianceStats ? (
              !hasComplianceIssues ? (
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

        {/* Quick links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { href: "/agency/staff", label: "Staff", icon: Users },
              { href: "/agency/compliance", label: "Compliance", icon: ShieldCheck },
              { href: "/agency/document-types", label: "Document Types", icon: Zap },
              { href: "/agency/settings", label: "Settings", icon: Building2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-[#0B4F96] hover:bg-blue-50 transition-colors text-center"
              >
                <Icon className="h-6 w-6 text-[#0B4F96]" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
