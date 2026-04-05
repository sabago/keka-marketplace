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
} from "lucide-react";
import { UserRole, AgencySize } from "@prisma/client";

export default function AgencySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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
      session.user.role !== UserRole.PLATFORM_ADMIN
    ) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Fetch agency settings
  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user.role === UserRole.AGENCY_ADMIN ||
        session?.user.role === UserRole.PLATFORM_ADMIN)
    ) {
      fetchSettings();
    }
  }, [session, status]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agency/settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch settings");
      }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
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
                  Agency Name *
                </label>
                <input
                  type="text"
                  value={formData.agencyName}
                  onChange={(e) =>
                    setFormData({ ...formData, agencyName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  required
                />
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
