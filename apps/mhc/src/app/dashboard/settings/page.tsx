"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Users,
  CreditCard,
  Bell,
  Shield,
  Save,
  Plus,
  Trash2,
  Crown,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

interface AgencyProfile {
  agencyName: string;
  licenseNumber: string;
  primaryContactName: string;
  primaryContactRole: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  servicesOffered: string[];
  serviceArea: string[];
  agencySize: string;
  subscriptionPlan: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/agency/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.agency);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetch("/api/agency/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Agency Profile", icon: Building },
    { id: "team", label: "Team Members", icon: Users },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Data & Privacy", icon: Shield },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your agency profile and preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? "border-b-2 border-[#0B4F96] text-[#0B4F96]"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && profile && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agency Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profile.agencyName}
                        onChange={(e) =>
                          setProfile({ ...profile, agencyName: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={profile.licenseNumber}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Contact support to change license number
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Contact Name
                    </label>
                    <input
                      type="text"
                      value={profile.primaryContactName}
                      onChange={(e) =>
                        setProfile({ ...profile, primaryContactName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role/Title
                    </label>
                    <input
                      type="text"
                      value={profile.primaryContactRole}
                      onChange={(e) =>
                        setProfile({ ...profile, primaryContactRole: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={profile.primaryContactEmail}
                        onChange={(e) =>
                          setProfile({ ...profile, primaryContactEmail: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={profile.primaryContactPhone || ""}
                        onChange={(e) =>
                          setProfile({ ...profile, primaryContactPhone: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agency Size
                    </label>
                    <select
                      value={profile.agencySize}
                      onChange={(e) =>
                        setProfile({ ...profile, agencySize: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                    >
                      <option value="SMALL">Small (1-10 employees)</option>
                      <option value="MEDIUM">Medium (11-50 employees)</option>
                      <option value="LARGE">Large (50+ employees)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Team Members</h3>
                    <p className="text-sm text-gray-600">
                      Invite users and manage access levels
                    </p>
                  </div>
                  <button className="flex items-center px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Member
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">Team management coming soon</p>
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === "subscription" && profile && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center mb-2">
                        <Crown className="h-6 w-6 mr-2" />
                        <h3 className="text-2xl font-bold">{profile.subscriptionPlan} Plan</h3>
                      </div>
                      <p className="text-blue-100">
                        Your current subscription tier
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-2">FREE</h4>
                    <p className="text-3xl font-bold text-gray-800 mb-4">$0<span className="text-sm font-normal">/mo</span></p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>50 queries/month</li>
                      <li>Basic search</li>
                      <li>Email support</li>
                    </ul>
                  </div>

                  <div className="border-2 border-[#0B4F96] rounded-lg p-6 relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#0B4F96] text-white px-3 py-1 rounded-full text-xs font-semibold">
                        POPULAR
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-2">PRO</h4>
                    <p className="text-3xl font-bold text-gray-800 mb-4">$49<span className="text-sm font-normal">/mo</span></p>
                    <ul className="space-y-2 text-sm text-gray-600 mb-4">
                      <li>200 queries/month</li>
                      <li>AI recommendations</li>
                      <li>Priority support</li>
                      <li>Referral tracking</li>
                    </ul>
                    <button className="w-full py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors">
                      Upgrade to Pro
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-2">ENTERPRISE</h4>
                    <p className="text-3xl font-bold text-gray-800 mb-4">Custom</p>
                    <ul className="space-y-2 text-sm text-gray-600 mb-4">
                      <li>Unlimited queries</li>
                      <li>Custom integrations</li>
                      <li>Dedicated support</li>
                      <li>Multi-user access</li>
                    </ul>
                    <button className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Contact Sales
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    {[
                      { id: "weekly", label: "Weekly digest", description: "Summary of your activity" },
                      { id: "features", label: "New features", description: "Updates about platform improvements" },
                      { id: "referrals", label: "Referral updates", description: "Status changes on your referrals" },
                      { id: "recommendations", label: "AI recommendations", description: "Personalized suggestions" },
                    ].map((notif) => (
                      <div key={notif.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{notif.label}</p>
                          <p className="text-sm text-gray-600">{notif.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B4F96]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Data & Privacy</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Control your data and privacy settings
                  </p>

                  <div className="space-y-4">
                    <button className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                      <h4 className="font-medium text-gray-800 mb-1">Export Your Data</h4>
                      <p className="text-sm text-gray-600">
                        Download all your referral data and activity logs
                      </p>
                    </button>

                    <button className="w-full p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left">
                      <h4 className="font-medium text-red-600 mb-1">Delete Account</h4>
                      <p className="text-sm text-gray-600">
                        Permanently delete your account and all associated data
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
