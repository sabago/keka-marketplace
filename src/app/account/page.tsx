"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, Mail, Shield, Building2, Key, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  SUPERADMIN: "Superadmin",
  AGENCY_ADMIN: "Agency Admin",
  AGENCY_USER: "Staff Member",
};

export default function AccountPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.name !== undefined) {
      setNameValue(session.user.name ?? "");
    }
  }, [session?.user?.name]);

  const handleNameSave = async () => {
    setNameSaving(true);
    setNameFeedback(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameFeedback({ type: "error", message: data.error || "Update failed." });
      } else {
        setNameFeedback({ type: "success", message: "Name updated successfully." });
        await update({ name: nameValue });
      }
    } catch {
      setNameFeedback({ type: "error", message: "Request failed." });
    } finally {
      setNameSaving(false);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-[#0B4F96] border-t-transparent animate-spin" />
      </div>
    );
  }

  const user = session.user;
  const role = (user as any).role as string;
  const agencyId = (user as any).agencyId as string | null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to change password." });
      } else {
        setFeedback({ type: "success", message: "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setFeedback({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Account</h1>

        {/* Profile card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Profile</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0B4F96] rounded-full flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{user.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="font-medium text-gray-900">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>
            {agencyId && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Agency</p>
                  {role === "AGENCY_ADMIN" || role === "PLATFORM_ADMIN" || role === "SUPERADMIN" ? (
                    <Link href="/agency" className="font-medium text-[#0B4F96] hover:underline">
                      View My Agency
                    </Link>
                  ) : (
                    <p className="font-medium text-gray-900">Linked</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit name */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Display Name</h2>
          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => { setNameValue(e.target.value); setNameFeedback(null); }}
              placeholder="Your full name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
            />
            <button
              onClick={handleNameSave}
              disabled={nameSaving || nameValue.trim() === (session.user?.name ?? "")}
              className="px-4 py-2 bg-[#0B4F96] text-white rounded-lg text-sm font-medium hover:bg-[#094080] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {nameSaving ? "Saving…" : "Save"}
            </button>
          </div>
          {nameFeedback && (
            <div className={`flex items-center gap-2 text-xs mt-2 ${nameFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {nameFeedback.type === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {nameFeedback.message}
            </div>
          )}
        </div>

        {/* Change password */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-500" /> Change Password
          </h2>
          <p className="text-sm text-gray-500 mb-5">Leave blank if you signed in with Google.</p>

          {feedback && (
            <div className={`flex items-center gap-2 text-sm mb-4 p-3 rounded-lg ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {feedback.type === "success"
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#0B4F96] text-white text-sm font-medium rounded-lg hover:bg-[#094080] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
