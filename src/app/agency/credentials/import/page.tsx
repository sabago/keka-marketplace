"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";

interface ImportResult {
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { row: number; employeeRef: string; reason: string }[];
}

const TEMPLATE_CSV = `employeeEmail,employeeNumber,credentialTypeName,issueDate,expirationDate,issuer,licenseNumber
jane.doe@example.com,,CPR Certification,2024-01-15,2026-01-15,American Heart Association,CPR-12345
,EMP-001,Nursing License,2023-06-01,2025-06-01,State Board of Nursing,RN-98765`;

export default function BulkImportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B4F96]" />
      </div>
    );
  }

  if (
    !session ||
    (session.user?.role !== "AGENCY_ADMIN" &&
      session.user?.role !== "PLATFORM_ADMIN")
  ) {
    router.push("/dashboard");
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError("");
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credential-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dryRun", String(dryRun));
    formData.append("overwriteExisting", String(overwriteExisting));
    formData.append("autoApprove", String(autoApprove));

    try {
      const res = await fetch("/api/agency/credentials/bulk-import/csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Bulk Import Credentials
          </h1>
          <p className="text-gray-600 mt-1">
            Upload a CSV file to import or update multiple employee credentials
            at once.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              CSV Template
            </h2>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-[#0B4F96] hover:text-[#48ccbc]"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Accepted columns:{" "}
            <code className="bg-gray-100 px-1 rounded">employeeEmail</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">employeeNumber</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">credentialTypeName</code>{" "}
            (required),{" "}
            <code className="bg-gray-100 px-1 rounded">issueDate</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">expirationDate</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">issuer</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">licenseNumber</code>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#0B4F96] transition-colors"
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              {file ? (
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {file.name}
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-600">
                    Click to select a CSV file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Max 1,000 rows
                  </p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Import Options</h3>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-[#0B4F96] rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Dry run (preview only)
                </span>
                <p className="text-xs text-gray-500">
                  Validate and count records without making any changes
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-[#0B4F96] rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Overwrite existing credentials
                </span>
                <p className="text-xs text-gray-500">
                  Update records that already exist for an employee + credential
                  type pair
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-[#0B4F96] rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Auto-approve imported credentials
                </span>
                <p className="text-xs text-gray-500">
                  Mark credentials as approved without manual review (use for
                  trusted data sources)
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-2.5 px-4 bg-[#0B4F96] text-white rounded-lg font-medium hover:bg-[#0a4485] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {dryRun ? "Previewing..." : "Importing..."}
              </span>
            ) : dryRun ? (
              "Preview Import"
            ) : (
              "Import Credentials"
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {result.dryRun ? "Preview Results" : "Import Results"}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {result.created}
                </p>
                <p className="text-xs text-green-600">
                  {result.dryRun ? "Would create" : "Created"}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">
                  {result.updated}
                </p>
                <p className="text-xs text-blue-600">
                  {result.dryRun ? "Would update" : "Updated"}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">
                  {result.skipped}
                </p>
                <p className="text-xs text-gray-600">Skipped</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">
                  {result.failed}
                </p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>

            {result.dryRun && result.failed === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm mb-4">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Preview looks good! Uncheck "Dry run" and submit to complete the
                import.
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Errors ({result.errors.length})
                </h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Row
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Employee
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-gray-500">{e.row}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {e.employeeRef}
                          </td>
                          <td className="px-4 py-2 text-red-600">{e.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!result.dryRun && result.failed === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Import complete! {result.created + result.updated} credentials
                processed.{" "}
                <button
                  onClick={() => router.push("/agency/compliance")}
                  className="underline ml-1"
                >
                  View compliance dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
