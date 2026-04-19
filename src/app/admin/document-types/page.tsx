"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Plus,
  Edit,
  FileText,
  Globe,
  Building,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  LICENSE: "Licenses & Certificates",
  BACKGROUND_CHECK: "Background Checks",
  TRAINING: "Training & Education",
  VACCINATION: "Health & Vaccinations",
  HR: "HR Documents",
  ID: "Identification",
  INSURANCE: "Insurance",
  COMPETENCY: "Competency",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  LICENSE: "bg-blue-100 text-blue-800",
  BACKGROUND_CHECK: "bg-red-100 text-red-800",
  TRAINING: "bg-green-100 text-green-800",
  VACCINATION: "bg-purple-100 text-purple-800",
  HR: "bg-yellow-100 text-yellow-800",
  ID: "bg-orange-100 text-orange-800",
  INSURANCE: "bg-indigo-100 text-indigo-800",
  COMPETENCY: "bg-teal-100 text-teal-800",
  OTHER: "bg-gray-100 text-gray-800",
};

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  expirationDays: number | null;
  reminderDays: number[];
  isRequired: boolean;
  isGlobal: boolean;
  isActive: boolean;
  requiresFrontBack: boolean;
  allowsMultiPage: boolean;
  minFiles: number;
  maxFiles: number;
  recheckCadenceDays: number | null;
  customFields: Record<string, string> | null;
  agencyId: string | null;
  _count?: { credentials: number };
}

interface FormState {
  name: string;
  description: string;
  category: string;
  expirationDays: string;
  reminderDays: string;
  isRequired: boolean;
  requiresFrontBack: boolean;
  allowsMultiPage: boolean;
  minFiles: string;
  maxFiles: string;
  recheckCadenceDays: string;
  isGlobal: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  category: "OTHER",
  expirationDays: "",
  reminderDays: "30, 7",
  isRequired: false,
  requiresFrontBack: false,
  allowsMultiPage: true,
  minFiles: "1",
  maxFiles: "10",
  recheckCadenceDays: "",
  isGlobal: true,
};

export default function AdminDocumentTypesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterScope, setFilterScope] = useState<"ALL" | "GLOBAL" | "AGENCY">("ALL");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    const role = session.user?.role;
    if (role !== "PLATFORM_ADMIN" && role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchDocumentTypes();
  }, [session, status, router]);

  const fetchDocumentTypes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/document-types");
      if (!res.ok) throw new Error("Failed to fetch document types");
      const data = await res.json();
      setDocumentTypes(data.documentTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document types");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingType(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (dt: DocumentType) => {
    setEditingType(dt);
    setForm({
      name: dt.name,
      description: dt.description ?? "",
      category: dt.category,
      expirationDays: dt.expirationDays?.toString() ?? "",
      reminderDays: dt.reminderDays.join(", "),
      isRequired: dt.isRequired,
      requiresFrontBack: dt.requiresFrontBack,
      allowsMultiPage: dt.allowsMultiPage,
      minFiles: dt.minFiles.toString(),
      maxFiles: dt.maxFiles.toString(),
      recheckCadenceDays: dt.recheckCadenceDays?.toString() ?? "",
      isGlobal: dt.isGlobal,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleDisable = async (id: string, name: string) => {
    if (!confirm(`Disable "${name}"? Existing credentials referencing this type will not be affected, but new uploads of this type will be blocked.`)) return;
    try {
      const res = await fetch(`/api/admin/document-types/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to disable");
      }
      fetchDocumentTypes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disable document type");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/document-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to reactivate");
      }
      fetchDocumentTypes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reactivate document type");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const reminderDays = form.reminderDays
      .split(",")
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d) && d > 0);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      expirationDays: form.expirationDays ? parseInt(form.expirationDays) : null,
      reminderDays,
      isRequired: form.isRequired,
      requiresFrontBack: form.requiresFrontBack,
      allowsMultiPage: form.allowsMultiPage,
      minFiles: parseInt(form.minFiles) || 1,
      maxFiles: parseInt(form.maxFiles) || 10,
      recheckCadenceDays: form.recheckCadenceDays ? parseInt(form.recheckCadenceDays) : null,
      isGlobal: form.isGlobal,
    };

    setFormLoading(true);
    try {
      const url = editingType
        ? `/api/admin/document-types/${editingType.id}`
        : "/api/admin/document-types";
      const method = editingType ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setShowForm(false);
      fetchDocumentTypes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save document type");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredTypes = documentTypes.filter((dt) => {
    if (filterScope === "GLOBAL" && !dt.isGlobal) return false;
    if (filterScope === "AGENCY" && dt.isGlobal) return false;
    if (filterCategory !== "ALL" && dt.category !== filterCategory) return false;
    return true;
  });

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Types</h1>
            <p className="text-gray-600 mt-1">
              Manage platform-wide and agency-specific document types. Disable instead of deleting — existing credentials may still reference these types.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Document Type
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Scope</label>
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value as "ALL" | "GLOBAL" | "AGENCY")}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="ALL">All</option>
              <option value="GLOBAL">Global only</option>
              <option value="AGENCY">Agency custom only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="ALL">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex items-end">
            <span className="text-sm text-gray-500">{filteredTypes.length} of {documentTypes.length} types</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Files</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recheck</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Use</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTypes.map((dt) => (
                <tr key={dt.id} className={!dt.isActive ? "opacity-50 bg-gray-50" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{dt.name}</div>
                    {dt.description && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{dt.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[dt.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {CATEGORY_LABELS[dt.category] ?? dt.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {dt.isGlobal ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                        <Globe className="h-3 w-3" /> Global
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Building className="h-3 w-3" /> Agency
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {dt.requiresFrontBack ? (
                      <span className="text-xs font-medium text-amber-700">Front+Back</span>
                    ) : (
                      <span className="text-xs text-gray-500">{dt.minFiles}–{dt.maxFiles}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {dt.recheckCadenceDays ? `${dt.recheckCadenceDays}d` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {dt._count?.credentials ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    {dt.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(dt)}
                        className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded px-2 py-1"
                      >
                        <Edit className="h-3 w-3 inline mr-1" />Edit
                      </button>
                      {dt.isActive ? (
                        <button
                          onClick={() => handleDisable(dt.id, dt.name)}
                          className="text-xs text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-1"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(dt.id)}
                          className="text-xs text-green-600 hover:text-green-800 border border-green-200 rounded px-2 py-1"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTypes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    No document types found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingType ? "Edit Document Type" : "Add Document Type"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Days</label>
                  <input
                    type="number" min="1" value={form.expirationDays}
                    onChange={(e) => setForm((f) => ({ ...f, expirationDays: e.target.value }))}
                    placeholder="Leave blank if no expiration"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={2} value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Days</label>
                  <input
                    type="text" value={form.reminderDays}
                    onChange={(e) => setForm((f) => ({ ...f, reminderDays: e.target.value }))}
                    placeholder="e.g. 30, 14, 7"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recheck Cadence (days)</label>
                  <input
                    type="number" min="1" value={form.recheckCadenceDays}
                    onChange={(e) => setForm((f) => ({ ...f, recheckCadenceDays: e.target.value }))}
                    placeholder="e.g. 30 for OIG"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Files</label>
                  <input
                    type="number" min="1" value={form.minFiles}
                    onChange={(e) => setForm((f) => ({ ...f, minFiles: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Files</label>
                  <input
                    type="number" min="1" max="20" value={form.maxFiles}
                    onChange={(e) => setForm((f) => ({ ...f, maxFiles: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox" checked={form.isRequired}
                    onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))}
                    className="rounded"
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox" checked={form.requiresFrontBack}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setForm((f) => ({ ...f, requiresFrontBack: v, minFiles: v ? "2" : "1", maxFiles: v ? "2" : f.maxFiles }));
                    }}
                    className="rounded"
                  />
                  Requires Front + Back
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox" checked={form.allowsMultiPage}
                    onChange={(e) => setForm((f) => ({ ...f, allowsMultiPage: e.target.checked }))}
                    className="rounded"
                  />
                  Allows Multi-Page
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox" checked={form.isGlobal}
                    onChange={(e) => setForm((f) => ({ ...f, isGlobal: e.target.checked }))}
                    className="rounded"
                  />
                  Global (all agencies)
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit" disabled={formLoading}
                  className="flex-1 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] disabled:opacity-50 font-medium text-sm"
                >
                  {formLoading ? "Saving..." : editingType ? "Update" : "Create"}
                </button>
                <button
                  type="button" onClick={() => setShowForm(false)} disabled={formLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
