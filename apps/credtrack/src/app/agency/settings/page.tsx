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
  Briefcase,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Zap,
  Crown,
} from "lucide-react";
import Link from "next/link";
import type { CredTrackPlan } from "@/types/next-auth";

interface AgencyData {
  agencyName: string;
  agencySize: string;
  primaryContactName: string;
  primaryContactRole: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  servicesOffered: string[];
  serviceArea: string[];
  specializations: string[];
  intakeMethods: string[];
  followUpFrequency: string;
  followUpMethods: string[];
  avgReferralsPerMonth: number;
}

export default function AgencySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [complianceStats, setComplianceStats] = useState<{
    pendingReview: number;
    expiringSoon: number;
    expired: number;
  } | null>(null);

  const [staffCount, setStaffCount] = useState<number | null>(null);

  const [formData, setFormData] = useState<AgencyData>({
    agencyName: "",
    agencySize: "MEDIUM",
    primaryContactName: "",
    primaryContactRole: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    servicesOffered: [],
    serviceArea: [],
    specializations: [],
    intakeMethods: [],
    followUpFrequency: "",
    followUpMethods: [],
    avgReferralsPerMonth: 0,
  });

  const serviceOptions = [
    "Home Health Care", "Personal Care", "Hospice", "Palliative Care",
    "Skilled Nursing", "Physical Therapy", "Occupational Therapy",
    "Speech Therapy", "Medical Social Work", "Home Health Aide",
  ];
  const intakeMethodOptions = ["Phone", "Online Portal", "Email", "Fax", "In-Person"];
  const followUpMethodOptions = ["Email", "Phone", "Text", "In-Person", "Automated"];
  const followUpFrequencyOptions = ["Daily", "Weekly", "Bi-weekly", "Monthly", "As-needed"];
  const specializationOptions = [
    "Pediatric Care", "Geriatric Care", "Post-Surgical Care",
    "Chronic Disease Management", "Wound Care", "IV Therapy",
    "Dementia/Alzheimer's Care", "End-of-Life Care", "Rehabilitation", "Mental Health",
  ];

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/signin"); return; }

    const role = session?.user?.role;
    if (role !== "AGENCY_ADMIN" && role !== "PLATFORM_ADMIN" && role !== "SUPERADMIN") {
      router.push("/my-credentials");
      return;
    }

    fetchSettings();
  }, [status, session?.user?.role]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, complianceRes, staffRes] = await Promise.all([
        fetch("/api/agency/settings"),
        fetch("/api/compliance/dashboard?countsOnly=true"),
        fetch("/api/staff"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const a = data.agency ?? data;
        setFormData({
          agencyName: a.agencyName || "",
          agencySize: a.agencySize || "MEDIUM",
          primaryContactName: a.primaryContactName || "",
          primaryContactRole: a.primaryContactRole || "",
          primaryContactEmail: a.primaryContactEmail || "",
          primaryContactPhone: a.primaryContactPhone || "",
          servicesOffered: a.servicesOffered || [],
          serviceArea: a.serviceArea || [],
          specializations: a.specializations || [],
          intakeMethods: a.intakeMethods || [],
          followUpFrequency: a.followUpFrequency || "",
          followUpMethods: a.followUpMethods || [],
          avgReferralsPerMonth: a.avgReferralsPerMonth || 0,
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

      if (staffRes.ok) {
        const s = await staffRes.json();
        setStaffCount((s.records ?? []).length);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
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

  const toggleArrayValue = (field: keyof AgencyData, value: string) => {
    const currentArray = formData[field] as string[];
    setFormData({
      ...formData,
      [field]: currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin" />
      </div>
    );
  }

  const plan = (session?.user as any)?.credtrackPlan as CredTrackPlan | undefined;
  const isBundled = (session?.user as any)?.isBundled as boolean | undefined;
  const planLabel = isBundled ? "MHC Bundled" : plan === "STARTER" ? "Free / Starter" : plan ?? "—";

  const hasComplianceIssues =
    complianceStats &&
    (complianceStats.expired > 0 || complianceStats.expiringSoon > 0 || complianceStats.pendingReview > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Agency Overview Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0B4F96] rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{formData.agencyName || "Your Agency"}</h1>
              <p className="text-gray-600">Welcome back, {session?.user?.name || session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Quick stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Plan card */}
          <Link href="/agency/subscription" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                {plan === "STARTER" ? (
                  <Crown className="h-6 w-6 text-[#0B4F96]" />
                ) : (
                  <CreditCard className="h-6 w-6 text-[#0B4F96]" />
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Plan &amp; Billing</h3>
            <p className={`text-xl font-bold ${plan === "STARTER" ? "text-amber-600" : "text-[#0B4F96]"}`}>
              {planLabel}
            </p>
          </Link>

          {/* Staff card */}
          <Link href="/agency/staff" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff</h3>
            {staffCount !== null ? (
              <p className="text-2xl font-bold text-purple-600">
                {staffCount} <span className="text-sm font-normal text-gray-500">members tracked</span>
              </p>
            ) : (
              <p className="text-sm text-gray-600">Manage credential tracking</p>
            )}
          </Link>

          {/* Compliance card */}
          <Link href="/agency/compliance" className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasComplianceIssues ? "bg-red-100" : "bg-green-100"}`}>
                <ShieldCheck className={`h-6 w-6 ${hasComplianceIssues ? "text-red-600" : "text-green-600"}`} />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance</h3>
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

        {/* Settings Form Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Agency Settings</h2>
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
              <p className="text-sm text-green-700 mt-1">Settings updated successfully!</p>
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
                  onChange={(e) => setFormData({ ...formData, agencySize: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  required
                >
                  <option value="SMALL">Small (1-10 employees)</option>
                  <option value="MEDIUM">Medium (11-50 employees)</option>
                  <option value="LARGE">Large (50+ employees)</option>
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
                  onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, primaryContactRole: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#0B4F96]" />
              Services &amp; Specializations
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Services Offered
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {serviceOptions.map((service) => (
                    <label key={service} className="flex items-center gap-2 cursor-pointer">
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
