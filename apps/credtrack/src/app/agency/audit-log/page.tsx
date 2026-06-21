"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity, ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface AuditEvent {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  user_login: "Login",
  user_logout: "Logout",
  user_created: "User Created",
  user_deleted: "User Deleted",
  agency_created: "Agency Created",
  agency_updated: "Agency Updated",
  subscription_created: "Subscription Created",
  subscription_updated: "Subscription Updated",
  subscription_canceled: "Subscription Canceled",
  settings_changed: "Settings Changed",
  admin_action: "Admin Action",
  security_alert: "Security Alert",
  data_exported: "Data Exported",
  credential_uploaded: "Credential Uploaded",
  credential_approved: "Credential Approved",
  credential_rejected: "Credential Rejected",
  credential_deleted: "Credential Deleted",
  staff_created: "Staff Created",
  staff_updated: "Staff Updated",
  staff_deleted: "Staff Deleted",
  document_type_created: "Document Type Created",
  document_type_updated: "Document Type Updated",
  document_type_disabled: "Document Type Disabled",
  parsing_job_started: "Parsing Started",
  parsing_job_completed: "Parsing Completed",
  parsing_job_failed: "Parsing Failed",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  user_login: "bg-green-100 text-green-700",
  user_logout: "bg-gray-100 text-gray-600",
  security_alert: "bg-red-100 text-red-700",
  subscription_canceled: "bg-orange-100 text-orange-700",
  data_exported: "bg-purple-100 text-purple-700",
  admin_action: "bg-blue-100 text-blue-700",
  credential_uploaded: "bg-blue-50 text-blue-600",
  credential_approved: "bg-green-100 text-green-700",
  credential_rejected: "bg-red-100 text-red-700",
  credential_deleted: "bg-orange-100 text-orange-700",
  parsing_job_failed: "bg-red-50 text-red-600",
};

function eventColor(eventType: string): string {
  return EVENT_TYPE_COLORS[eventType] ?? "bg-slate-100 text-slate-600";
}

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS);

export default function AgencyAuditLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    if (
      role !== "AGENCY_ADMIN" &&
      role !== "PLATFORM_ADMIN" &&
      role !== "SUPERADMIN"
    ) {
      router.push("/my-credentials");
    }
  }, [status, role, session, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (
      role !== "AGENCY_ADMIN" &&
      role !== "PLATFORM_ADMIN" &&
      role !== "SUPERADMIN"
    )
      return;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "50",
          ...(filterType ? { eventType: filterType } : {}),
        });
        const res = await fetch(`/api/audit-log?${params}`);
        if (!res.ok) throw new Error("Failed to load audit log");
        const data = await res.json();
        setEvents(data.events ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, filterType, role, status]);

  const formatData = (data: Record<string, unknown>): string => {
    const { userId, targetId, targetType, action, success, ...rest } = data;
    const parts: string[] = [];
    if (userId) parts.push(`User: ${String(userId).slice(0, 8)}…`);
    if (targetType && targetId)
      parts.push(`${targetType}: ${String(targetId).slice(0, 8)}…`);
    if (action) parts.push(String(action));
    if (success === false) parts.push("failed");
    const extras = Object.entries(rest)
      .filter(([k]) => !["agencyId", "metadata"].includes(k))
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .slice(0, 2);
    parts.push(...extras);
    return parts.join(" · ") || "—";
  };

  if (status === "loading") return null;
  if (
    role !== "AGENCY_ADMIN" &&
    role !== "PLATFORM_ADMIN" &&
    role !== "SUPERADMIN"
  )
    return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
            <Activity className="h-6 w-6 text-[#0B4F96]" />
            Audit Log
          </h1>
          <p className="text-gray-500 text-sm">
            Credential uploads, reviews, staff changes, and other agency
            activity.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-5">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B4F96]"
          >
            <option value="">All event types</option>
            {EVENT_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500 ml-auto">
            {total} total events
          </span>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-4 border-[#0B4F96] border-t-transparent animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              No events found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">
                    Time
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">
                    Event
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(event.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${eventColor(event.eventType)}`}
                      >
                        {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                      {formatData(
                        event.eventData as Record<string, unknown>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
