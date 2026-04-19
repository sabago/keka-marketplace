"use client";

import { useState, useEffect } from "react";
import { X, Calendar, FileText, Phone, Mail } from "lucide-react";

interface LogReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillSlug?: string;
}

interface ReferralSource {
  slug: string;
  title: string;
  category: string;
}

export default function LogReferralModal({
  isOpen,
  onClose,
  onSuccess,
  prefillSlug,
}: LogReferralModalProps) {
  const [sources, setSources] = useState<ReferralSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    referralSourceSlug: prefillSlug || "",
    submissionDate: new Date().toISOString().split("T")[0],
    submissionMethod: "PORTAL",
    patientType: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchReferralSources();
      // Pre-populate slug when modal opens (handles cases where prefillSlug arrives after mount)
      if (prefillSlug) {
        setFormData(prev => ({ ...prev, referralSourceSlug: prefillSlug }));
      }
    }
  }, [isOpen, prefillSlug]);

  const fetchReferralSources = async () => {
    try {
      const response = await fetch("/api/knowledge-base?published=true");
      if (response.ok) {
        const data = await response.json();
        // Deduplicate by slug in case the same slug appears in multiple content dirs
        const seen = new Set<string>();
        const unique = (data.articles || []).filter((a: ReferralSource) => {
          if (seen.has(a.slug)) return false;
          seen.add(a.slug);
          return true;
        });
        setSources(unique);
      }
    } catch (error) {
      console.error("Error fetching referral sources:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/referrals/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          referralSourceSlug: prefillSlug || "",
          submissionDate: new Date().toISOString().split("T")[0],
          submissionMethod: "PORTAL",
          patientType: "",
          notes: "",
        });
      } else {
        const error = await response.json();
        alert(error.message || "Failed to log referral");
      }
    } catch (error) {
      console.error("Error logging referral:", error);
      alert("An error occurred while logging the referral");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Log New Referral</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Referral Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referral Source *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                required
                value={formData.referralSourceSlug}
                onChange={(e) =>
                  setFormData({ ...formData, referralSourceSlug: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              >
                <option value="">Select a referral source...</option>
                {sources.map((source) => (
                  <option key={source.slug} value={source.slug}>
                    {source.title} {source.category && `- ${source.category}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submission Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submission Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="date"
                required
                value={formData.submissionDate}
                onChange={(e) =>
                  setFormData({ ...formData, submissionDate: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              />
            </div>
          </div>

          {/* Submission Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Submission Method *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: "PORTAL", label: "Online Portal", icon: Mail },
                { value: "PHONE", label: "Phone", icon: Phone },
                { value: "FAX", label: "Fax", icon: FileText },
                { value: "EMAIL", label: "Email", icon: Mail },
              ].map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, submissionMethod: method.value })
                    }
                    className={`p-3 border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                      formData.submissionMethod === method.value
                        ? "border-[#0B4F96] bg-blue-50 text-[#0B4F96]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Type (Optional)
            </label>
            <input
              type="text"
              value={formData.patientType}
              onChange={(e) => setFormData({ ...formData, patientType: e.target.value })}
              placeholder="e.g., Medicare, Private Pay, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Add any additional notes about this referral..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#48ccbc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging..." : "Log Referral"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
