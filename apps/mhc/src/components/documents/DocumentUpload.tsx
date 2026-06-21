"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, FileText, AlertCircle, AlertTriangle, ArrowUp, ArrowDown, ChevronDown, Search } from "lucide-react";
import { validateFileUpload, formatFileSize } from "@/lib/documentHelpers";

// ── Types ─────────────────────────────────────────────────────────────────────

type PageRole = "FRONT" | "BACK" | "SINGLE" | "PAGE";

interface FileSlot {
  role: PageRole;
  file: File;
  order: number;
}

interface EnrichedDocumentType {
  id: string;
  name: string;
  description?: string | null;
  expirationDays?: number | null;
  category: string;
  requiresFrontBack: boolean;
  allowsMultiPage: boolean;
  minFiles: number;
  maxFiles: number;
  recheckCadenceDays?: number | null;
  customFields?: Record<string, string> | null;
  isGlobal?: boolean;
}

interface DocumentUploadProps {
  staffRecordId: string;
  documentTypes: EnrichedDocumentType[];
  defaultDocumentTypeId?: string;
  onSuccess: () => void;
  onClose: () => void;
  /** When true, renders as an inline card instead of a fixed modal overlay */
  inline?: boolean;
}

// ── Category labels + ordering ────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "LICENSE",
  "BACKGROUND_CHECK",
  "TRAINING",
  "VACCINATION",
  "HR",
  "ID",
  "INSURANCE",
  "COMPETENCY",
  "OTHER",
] as const;

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

// ── Sub-components ────────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  file: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  dragActive: boolean;
  setDragActive: (v: boolean) => void;
  inputId: string;
}

function DropZone({
  label,
  file,
  onSelect,
  onRemove,
  dragActive,
  setDragActive,
  inputId,
}: DropZoneProps) {
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) onSelect(e.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <div className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-7 w-7 text-[#0B4F96] flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 ml-2">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
        dragActive ? "border-[#48ccbc] bg-teal-50" : "border-gray-300 hover:border-gray-400"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Upload className="mx-auto h-8 w-8 text-gray-400" />
      <p className="mt-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xs text-gray-500">PDF, JPEG, PNG up to 10 MB</p>
      <input
        type="file"
        onChange={(e) => { if (e.target.files?.[0]) onSelect(e.target.files[0]); }}
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        id={inputId}
      />
      <label
        htmlFor={inputId}
        className="mt-3 inline-block px-3 py-1.5 bg-[#0B4F96] text-white rounded text-xs hover:bg-[#0a4280] cursor-pointer"
      >
        Choose File
      </label>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentUpload({
  staffRecordId,
  documentTypes,
  onSuccess,
  onClose,
  defaultDocumentTypeId,
  inline = false,
}: DocumentUploadProps) {
  const [files, setFiles] = useState<FileSlot[]>([]);
  const [documentTypeId, setDocumentTypeId] = useState(defaultDocumentTypeId ?? "");
  const [selectedType, setSelectedType] = useState<EnrichedDocumentType | null>(
    defaultDocumentTypeId ? (documentTypes.find((t) => t.id === defaultDocumentTypeId) ?? null) : null
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [issueDate, setIssueDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActiveMap, setDragActiveMap] = useState<Record<string, boolean>>({});

  // ── Searchable type picker ────────────────────────────────────────────────────
  const [typeSearch, setTypeSearch] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!typeOpen) return;
    const handle = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [typeOpen]);

  // ── Dropdown grouping ────────────────────────────────────────────────────────

  const customTypes = documentTypes.filter((t) => t.isGlobal === false);

  // Group ALL non-custom types by category (covers both isGlobal=true and isGlobal=undefined)
  const grouped = documentTypes
    .filter((t) => t.isGlobal !== false)
    .reduce<Record<string, EnrichedDocumentType[]>>((acc, t) => {
      const cat = t.category ?? "OTHER";
      (acc[cat] ??= []).push(t);
      return acc;
    }, {});

  // ── Type selection ───────────────────────────────────────────────────────────

  const handleTypeChange = (id: string) => {
    setDocumentTypeId(id);
    setFiles([]);
    setCustomFieldValues({});
    setError(null);
    const type = documentTypes.find((t) => t.id === id) ?? null;
    setSelectedType(type);
  };

  // ── File helpers ─────────────────────────────────────────────────────────────

  const validateAndAdd = useCallback(
    (file: File): string | null => {
      const v = validateFileUpload(file, 10);
      return v.valid ? null : (v.error ?? "Invalid file");
    },
    []
  );

  const addFrontFile = (file: File) => {
    const err = validateAndAdd(file);
    if (err) { setError(err); return; }
    setError(null);
    setFiles((prev) => [
      ...prev.filter((f) => f.role !== "FRONT"),
      { role: "FRONT", file, order: 0 },
    ]);
  };

  const addBackFile = (file: File) => {
    const err = validateAndAdd(file);
    if (err) { setError(err); return; }
    setError(null);
    setFiles((prev) => [
      ...prev.filter((f) => f.role !== "BACK"),
      { role: "BACK", file, order: 1 },
    ]);
  };

  const addPageFile = (file: File) => {
    if (!selectedType) return;
    const err = validateAndAdd(file);
    if (err) { setError(err); return; }
    if (files.length >= (selectedType.maxFiles ?? 10)) {
      setError(`Maximum ${selectedType.maxFiles} file(s) allowed for this document type.`);
      return;
    }
    setError(null);
    const order = files.length;
    setFiles((prev) => [...prev, { role: files.length === 0 && !selectedType.requiresFrontBack ? "SINGLE" : "PAGE", file, order }]);
  };

  const removeFile = (order: number) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.order !== order);
      // Re-number orders
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  const moveFile = (order: number, direction: "up" | "down") => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.order === order);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!documentTypeId || !selectedType) {
      setError("Please select a document type");
      return;
    }

    const minFiles = selectedType.minFiles ?? 1;
    const maxFiles = selectedType.maxFiles ?? 10;

    if (selectedType.requiresFrontBack) {
      const hasFront = files.some((f) => f.role === "FRONT");
      const hasBack = files.some((f) => f.role === "BACK");
      if (!hasFront || !hasBack) {
        setError(`${selectedType.name} requires both a Front and a Back file.`);
        return;
      }
    } else if (files.length < minFiles) {
      setError(`${selectedType.name} requires at least ${minFiles} file(s).`);
      return;
    }

    if (files.length > maxFiles) {
      setError(`${selectedType.name} allows a maximum of ${maxFiles} file(s).`);
      return;
    }

    if (issueDate && expirationDate) {
      if (new Date(issueDate) >= new Date(expirationDate)) {
        setError("Issue date must be before expiration date");
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("staffRecordId", staffRecordId);
      formData.append("documentTypeId", documentTypeId);
      if (issueDate) formData.append("issueDate", issueDate);
      if (expirationDate) formData.append("expirationDate", expirationDate);
      if (notes) formData.append("notes", notes);

      // Multi-file format
      files.forEach((f, i) => {
        formData.append(`files[${i}][file]`, f.file);
        formData.append(`files[${i}][pageRole]`, f.role);
        formData.append(`files[${i}][order]`, String(f.order));
      });

      if (Object.keys(customFieldValues).length > 0) {
        formData.append("customFieldValues", JSON.stringify(customFieldValues));
      }

      const response = await fetch("/api/agency/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload document");

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const inner = (
    <>
      {/* Header — only shown in modal mode */}
      {!inline && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}>
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={inline ? "space-y-6" : "p-6 space-y-6"}>
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Document type — searchable grouped combobox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <div className="relative" ref={typePickerRef}>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => { setTypeOpen((v) => !v); setTypeSearch(""); }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#0B4F96] text-sm"
              >
                <span className={selectedType ? "text-gray-900" : "text-gray-400"}>
                  {selectedType ? selectedType.name : "Select document type..."}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${typeOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {typeOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 flex flex-col">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={typeSearch}
                      onChange={(e) => setTypeSearch(e.target.value)}
                      placeholder="Search document types..."
                      className="flex-1 text-sm outline-none placeholder-gray-400"
                    />
                    {typeSearch && (
                      <button type="button" onClick={() => setTypeSearch("")} className="text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Options list */}
                  <div className="overflow-y-auto flex-1">
                    {(() => {
                      const q = typeSearch.toLowerCase();
                      const matchCustom = customTypes.filter((t) => !q || t.name.toLowerCase().includes(q));
                      const matchedGlobalCount = CATEGORY_ORDER.reduce(
                        (sum, cat) => sum + (grouped[cat] ?? []).filter((t) => !q || t.name.toLowerCase().includes(q)).length,
                        0
                      );
                      const total = matchedGlobalCount + matchCustom.length;

                      if (total === 0) {
                        return (
                          <p className="text-sm text-gray-500 px-3 py-4 text-center">No results for &quot;{typeSearch}&quot;</p>
                        );
                      }

                      // Always render grouped (both browse and search modes)
                      return (
                        <>
                          {CATEGORY_ORDER.map((cat) => {
                            const items = (grouped[cat] ?? []).filter((t) =>
                              !q || t.name.toLowerCase().includes(q)
                            );
                            if (items.length === 0) return null;
                            return (
                              <div key={cat}>
                                <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                                  {CATEGORY_LABELS[cat]}
                                </p>
                                {items.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => { handleTypeChange(t.id); setTypeOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${documentTypeId === t.id ? "bg-blue-50 font-medium text-[#0B4F96]" : "text-gray-900"}`}
                                  >
                                    {t.name}
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                          {matchCustom.length > 0 && (
                            <div>
                              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                                Custom (your agency)
                              </p>
                              {matchCustom.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => { handleTypeChange(t.id); setTypeOpen(false); }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${documentTypeId === t.id ? "bg-blue-50 font-medium text-[#0B4F96]" : "text-gray-900"}`}
                                >
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Recheck cadence note */}
            {selectedType?.recheckCadenceDays && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                This document requires periodic rechecking every {selectedType.recheckCadenceDays} days.
              </p>
            )}
          </div>

          {/* File upload zone(s) — type-driven */}
          {selectedType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document File(s) *
                {selectedType.requiresFrontBack && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">(Front and Back required)</span>
                )}
                {!selectedType.requiresFrontBack && selectedType.allowsMultiPage && selectedType.maxFiles > 1 && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    ({selectedType.minFiles}–{selectedType.maxFiles} files)
                  </span>
                )}
              </label>

              {selectedType.requiresFrontBack ? (
                /* Front + Back mode */
                <div className="grid grid-cols-2 gap-3">
                  <DropZone
                    label="Front"
                    file={files.find((f) => f.role === "FRONT")?.file ?? null}
                    onSelect={addFrontFile}
                    onRemove={() => setFiles((prev) => prev.filter((f) => f.role !== "FRONT"))}
                    dragActive={!!dragActiveMap["FRONT"]}
                    setDragActive={(v) => setDragActiveMap((m) => ({ ...m, FRONT: v }))}
                    inputId="file-front"
                  />
                  <DropZone
                    label="Back"
                    file={files.find((f) => f.role === "BACK")?.file ?? null}
                    onSelect={addBackFile}
                    onRemove={() => setFiles((prev) => prev.filter((f) => f.role !== "BACK"))}
                    dragActive={!!dragActiveMap["BACK"]}
                    setDragActive={(v) => setDragActiveMap((m) => ({ ...m, BACK: v }))}
                    inputId="file-back"
                  />
                </div>
              ) : selectedType.allowsMultiPage && selectedType.maxFiles > 1 ? (
                /* Multi-page mode */
                <div className="space-y-3">
                  {/* Existing files list */}
                  {files.map((slot, idx) => (
                    <div key={slot.order} className="border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-[#0B4F96]" />
                        <div>
                          <p className="text-xs text-gray-500">Page {idx + 1}</p>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{slot.file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(slot.file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveFile(slot.order, "up")}
                          disabled={idx === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 p-1"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFile(slot.order, "down")}
                          disabled={idx === files.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 p-1"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(slot.order)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Add page button */}
                  {files.length < (selectedType.maxFiles ?? 10) && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-500 mb-2">
                        {files.length === 0 ? "Add files" : `Add page ${files.length + 1}`} · PDF, JPEG, PNG up to 10 MB
                      </p>
                      <input
                        type="file"
                        onChange={(e) => { if (e.target.files?.[0]) addPageFile(e.target.files[0]); }}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id="file-multi-add"
                      />
                      <label
                        htmlFor="file-multi-add"
                        className="inline-block px-3 py-1.5 bg-[#0B4F96] text-white rounded text-xs hover:bg-[#0a4280] cursor-pointer"
                      >
                        Add File
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                /* Single file mode */
                <DropZone
                  label="Document"
                  file={files[0]?.file ?? null}
                  onSelect={(file) => {
                    const err = validateAndAdd(file);
                    if (err) { setError(err); return; }
                    setError(null);
                    setFiles([{ role: "SINGLE", file, order: 0 }]);
                  }}
                  onRemove={() => setFiles([])}
                  dragActive={!!dragActiveMap["SINGLE"]}
                  setDragActive={(v) => setDragActiveMap((m) => ({ ...m, SINGLE: v }))}
                  inputId="file-single"
                />
              )}
            </div>
          )}

          {/* Custom fields (e.g. competencyName, ceHours) */}
          {selectedType?.customFields && Object.keys(selectedType.customFields).length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700">Additional Information</p>
              {Object.entries(selectedType.customFields).map(([key, type]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}{" "}
                    {type === "number" && <span className="text-xs text-gray-500">(number)</span>}
                  </label>
                  <input
                    type={type === "number" ? "number" : "text"}
                    value={customFieldValues[key] ?? ""}
                    onChange={(e) =>
                      setCustomFieldValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" ? "any" : undefined}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Issue Date */}
          <div>
            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-2">
              Issue Date
            </label>
            <input
              type="date" id="issueDate" value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
          </div>

          {/* Expiration Date */}
          <div>
            <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date
            </label>
            <input
              type="date" id="expirationDate" value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
              placeholder="Additional notes or comments..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || files.length === 0 || !documentTypeId}
              className="flex-1 bg-[#0B4F96] text-white px-4 py-2 rounded-lg hover:bg-[#0a4280] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
            {!inline && (
              <button
                type="button" onClick={onClose} disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
    </>
  );

  if (inline) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {inner}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {inner}
      </div>
    </div>
  );
}
