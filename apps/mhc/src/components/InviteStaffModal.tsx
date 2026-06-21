"use client";

import { useState, useEffect } from "react";
import { X, Mail, User, Loader2, AlertCircle } from "lucide-react";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StaffLimit {
  canAdd: boolean;
  currentCount: number;
  limit: number;
  isUnlimited: boolean;
}

export default function InviteStaffModal({
  isOpen,
  onClose,
  onSuccess,
}: InviteStaffModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [staffLimit, setStaffLimit] = useState<StaffLimit | null>(null);
  const [limitLoading, setLimitLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStaffLimit();
    }
  }, [isOpen]);

  const fetchStaffLimit = async () => {
    setLimitLoading(true);
    try {
      const response = await fetch("/api/agency/staff/limit");
      if (response.ok) {
        const data = await response.json();
        setStaffLimit(data);
      }
    } catch (err) {
      // Non-critical, continue without quota info
    } finally {
      setLimitLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/agency/invite-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to send invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setName("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Invite Staff Member
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Staff Quota Badge */}
          {!limitLoading && staffLimit && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
              staffLimit.canAdd
                ? "bg-blue-50 border-blue-200"
                : "bg-orange-50 border-orange-200"
            }`}>
              <span className={`text-sm font-medium ${staffLimit.canAdd ? "text-blue-800" : "text-orange-800"}`}>
                Team members used
              </span>
              <span className={`text-sm font-semibold ${staffLimit.canAdd ? "text-blue-900" : "text-orange-900"}`}>
                {staffLimit.currentCount} / {staffLimit.isUnlimited ? "Unlimited" : staffLimit.limit}
              </span>
            </div>
          )}

          {/* At Limit Warning */}
          {!limitLoading && staffLimit && !staffLimit.canAdd && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Staff limit reached</p>
                <p className="text-sm mt-1">
                  You have reached your plan's staff limit of {staffLimit.limit}. Please upgrade your subscription to add more team members.
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              <p className="font-medium">Invitation sent successfully!</p>
              <p className="text-sm mt-1">
                The staff member will receive an email with instructions to set up
                their account.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Name Input */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="John Doe"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="john@example.com"
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              The staff member will receive an email invitation with a link to set
              up their password and access their account. The invitation link will
              expire in 24 hours.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || success || (staffLimit !== null && !staffLimit.canAdd)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
