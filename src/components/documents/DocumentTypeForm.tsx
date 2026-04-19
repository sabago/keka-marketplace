"use client";

import { useState } from "react";
import { X, AlertCircle, Plus, Trash2 } from "lucide-react";

const DOCUMENT_CATEGORIES = [
  "LICENSE",
  "BACKGROUND_CHECK",
  "TRAINING",
  "HR",
  "ID",
  "INSURANCE",
  "VACCINATION",
  "COMPETENCY",
  "OTHER",
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  LICENSE: "Licenses & Certificates",
  BACKGROUND_CHECK: "Background Checks",
  TRAINING: "Training & Education",
  HR: "HR Documents",
  ID: "Identification",
  INSURANCE: "Insurance",
  VACCINATION: "Health & Vaccinations",
  COMPETENCY: "Competency",
  OTHER: "Other",
};

interface CustomFieldRow {
  key: string;
  type: "string" | "number";
}

interface DocumentTypeFormProps {
  documentType?: {
    id: string;
    name: string;
    description: string | null;
    category?: DocumentCategory;
    expirationDays: number | null;
    reminderDays: number[];
    isRequired: boolean;
    requiresFrontBack?: boolean;
    allowsMultiPage?: boolean;
    minFiles?: number;
    maxFiles?: number;
    recheckCadenceDays?: number | null;
    aiParsingEnabled?: boolean;
    customFields?: Record<string, string> | null;
  };
  onSuccess: () => void;
  onClose: () => void;
}

function parseCustomFieldsToRows(
  customFields?: Record<string, string> | null
): CustomFieldRow[] {
  if (!customFields) return [];
  return Object.entries(customFields).map(([key, type]) => ({
    key,
    type: type === "number" ? "number" : "string",
  }));
}

export default function DocumentTypeForm({
  documentType,
  onSuccess,
  onClose,
}: DocumentTypeFormProps) {
  const [formData, setFormData] = useState({
    name: documentType?.name || "",
    description: documentType?.description || "",
    category: (documentType?.category as DocumentCategory) || "OTHER",
    expirationDays: documentType?.expirationDays?.toString() || "",
    reminderDays: documentType?.reminderDays.join(", ") || "30, 7",
    isRequired: documentType?.isRequired || false,
    requiresFrontBack: documentType?.requiresFrontBack || false,
    allowsMultiPage: documentType?.allowsMultiPage !== false,
    minFiles: documentType?.requiresFrontBack
      ? "2"
      : (documentType?.minFiles?.toString() || "1"),
    maxFiles: documentType?.maxFiles?.toString() || "10",
    recheckCadenceDays: documentType?.recheckCadenceDays?.toString() || "",
    aiParsingEnabled: documentType?.aiParsingEnabled !== false,
  });

  const [customFieldRows, setCustomFieldRows] = useState<CustomFieldRow[]>(
    parseCustomFieldsToRows(documentType?.customFields)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!documentType;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "requiresFrontBack" && type === "checkbox") {
      // When requiresFrontBack is checked, enforce minFiles=2
      setFormData((prev) => ({
        ...prev,
        requiresFrontBack: checked,
        minFiles: checked ? "2" : prev.minFiles === "2" ? "1" : prev.minFiles,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addCustomField = () => {
    setCustomFieldRows((prev) => [...prev, { key: "", type: "string" }]);
  };

  const removeCustomField = (idx: number) => {
    setCustomFieldRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCustomFieldKey = (idx: number, key: string) => {
    setCustomFieldRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, key } : row))
    );
  };

  const updateCustomFieldType = (idx: number, type: "string" | "number") => {
    setCustomFieldRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, type } : row))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Document type name is required");
      return;
    }

    // Parse reminder days
    let reminderDaysArray: number[] = [];
    if (formData.reminderDays.trim()) {
      reminderDaysArray = formData.reminderDays
        .split(",")
        .map((day) => parseInt(day.trim()))
        .filter((day) => !isNaN(day) && day > 0);

      if (reminderDaysArray.length === 0) {
        setError("Please provide at least one valid reminder day (e.g., 30, 7)");
        return;
      }
    }

    // Validate file counts
    const minFilesNum = parseInt(formData.minFiles) || 1;
    const maxFilesNum = parseInt(formData.maxFiles) || 10;
    if (minFilesNum > maxFilesNum) {
      setError("Min files cannot exceed max files");
      return;
    }

    // Build customFields record
    const customFields: Record<string, string> | null =
      customFieldRows.length > 0
        ? Object.fromEntries(
            customFieldRows
              .filter((r) => r.key.trim() !== "")
              .map((r) => [r.key.trim(), r.type])
          )
        : null;

    setLoading(true);

    try {
      const url = isEditing
        ? `/api/agency/document-types/${documentType.id}`
        : "/api/agency/document-types";

      const method = isEditing ? "PUT" : "POST";

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        expirationDays: formData.expirationDays
          ? parseInt(formData.expirationDays)
          : null,
        reminderDays: reminderDaysArray,
        isRequired: formData.isRequired,
        requiresFrontBack: formData.requiresFrontBack,
        allowsMultiPage: formData.allowsMultiPage,
        minFiles: minFilesNum,
        maxFiles: maxFilesNum,
        recheckCadenceDays: formData.recheckCadenceDays
          ? parseInt(formData.recheckCadenceDays)
          : null,
        aiParsingEnabled: formData.aiParsingEnabled,
        customFields,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save document type");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document type");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "Edit Document Type" : "Add Custom Document Type"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Document Type Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Background Check, Drug Screening"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] bg-white"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional description of this document type..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
          </div>

          {/* Expiration Days */}
          <div>
            <label
              htmlFor="expirationDays"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Default Expiration Days
            </label>
            <input
              type="number"
              id="expirationDays"
              name="expirationDays"
              value={formData.expirationDays}
              onChange={handleChange}
              min="1"
              placeholder="e.g., 365 (leave empty if no expiration)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Number of days until this document type typically expires. Leave
              empty if documents don&apos;t expire.
            </p>
          </div>

          {/* Recheck Cadence */}
          <div>
            <label
              htmlFor="recheckCadenceDays"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Recheck Cadence (Days)
            </label>
            <input
              type="number"
              id="recheckCadenceDays"
              name="recheckCadenceDays"
              value={formData.recheckCadenceDays}
              onChange={handleChange}
              min="1"
              placeholder="e.g., 30 for monthly rechecks (leave empty if not required)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
            <p className="mt-1 text-xs text-gray-500">
              How often this document must be re-verified (e.g., OIG exclusion
              checks every 30 days). Leave empty if a one-time upload is
              sufficient.
            </p>
          </div>

          {/* Reminder Days */}
          <div>
            <label
              htmlFor="reminderDays"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reminder Days Before Expiration
            </label>
            <input
              type="text"
              id="reminderDays"
              name="reminderDays"
              value={formData.reminderDays}
              onChange={handleChange}
              placeholder="e.g., 30, 7"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated list of days before expiration to send reminders
              (e.g., &quot;30, 7&quot; sends reminders at 30 and 7 days before expiration)
            </p>
          </div>

          {/* File Requirements */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-medium text-gray-700 px-1">
              File Requirements
            </legend>

            {/* requiresFrontBack */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="requiresFrontBack"
                name="requiresFrontBack"
                checked={formData.requiresFrontBack}
                onChange={handleChange}
                className="h-4 w-4 text-[#0B4F96] border-gray-300 rounded focus:ring-[#0B4F96]"
              />
              <label htmlFor="requiresFrontBack" className="text-sm text-gray-700">
                Requires front &amp; back (e.g., driver&apos;s license, state ID)
              </label>
            </div>

            {/* allowsMultiPage */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowsMultiPage"
                name="allowsMultiPage"
                checked={formData.allowsMultiPage}
                onChange={handleChange}
                className="h-4 w-4 text-[#0B4F96] border-gray-300 rounded focus:ring-[#0B4F96]"
              />
              <label htmlFor="allowsMultiPage" className="text-sm text-gray-700">
                Allow multi-page uploads (e.g., competency checklists, physical exams)
              </label>
            </div>

            {/* Min / Max files — hidden when requiresFrontBack is set */}
            {!formData.requiresFrontBack && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="minFiles"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Min Files
                  </label>
                  <input
                    type="number"
                    id="minFiles"
                    name="minFiles"
                    value={formData.minFiles}
                    onChange={handleChange}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="maxFiles"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Max Files
                  </label>
                  <input
                    type="number"
                    id="maxFiles"
                    name="maxFiles"
                    value={formData.maxFiles}
                    onChange={handleChange}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
              </div>
            )}
            {formData.requiresFrontBack && (
              <p className="text-xs text-gray-500">
                Front & back mode requires exactly 2 files (min=2, max=2 is
                enforced automatically).
              </p>
            )}
          </fieldset>

          {/* Checkboxes row */}
          <div className="space-y-3">
            {/* isRequired */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRequired"
                name="isRequired"
                checked={formData.isRequired}
                onChange={handleChange}
                className="h-4 w-4 text-[#0B4F96] border-gray-300 rounded focus:ring-[#0B4F96]"
              />
              <label htmlFor="isRequired" className="text-sm text-gray-700">
                Mark as required document for all staff
              </label>
            </div>

            {/* aiParsingEnabled */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="aiParsingEnabled"
                name="aiParsingEnabled"
                checked={formData.aiParsingEnabled}
                onChange={handleChange}
                className="h-4 w-4 text-[#0B4F96] border-gray-300 rounded focus:ring-[#0B4F96]"
              />
              <label htmlFor="aiParsingEnabled" className="text-sm text-gray-700">
                Enable AI auto-parsing (extract dates, license numbers, etc.)
              </label>
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Custom Fields
              </label>
              <button
                type="button"
                onClick={addCustomField}
                className="flex items-center gap-1 text-sm text-[#0B4F96] hover:text-[#0a4280]"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Additional metadata fields to collect at upload time (e.g.,
              &quot;competencyName&quot; for in-service competencies, &quot;ceHours&quot; for
              continuing education).
            </p>

            {customFieldRows.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-xs text-gray-500">
                  No custom fields — click &quot;Add Field&quot; to add one
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {customFieldRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateCustomFieldKey(idx, e.target.value)}
                      placeholder="Field name (e.g., competencyName)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
                    />
                    <select
                      value={row.type}
                      onChange={(e) =>
                        updateCustomFieldType(
                          idx,
                          e.target.value as "string" | "number"
                        )
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm bg-white"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeCustomField(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading
                ? "Saving..."
                : isEditing
                ? "Update Document Type"
                : "Add Document Type"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
