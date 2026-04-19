"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserPlus, Users, Loader2, AlertCircle } from "lucide-react";
import StaffList from "@/components/StaffList";
import InviteStaffModal from "@/components/InviteStaffModal";
import { UserRole } from "@prisma/client";

interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: Date | null;
  isPrimaryContact: boolean;
  createdAt: Date;
  image: string | null;
  invitationStatus: "active" | "pending" | "expired";
}

export default function AgencyStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check authentication and authorization
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (
      session?.user &&
      session.user.role !== UserRole.AGENCY_ADMIN &&
      session.user.role !== UserRole.PLATFORM_ADMIN && session.user.role !== UserRole.SUPERADMIN
    ) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Fetch staff members
  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/agency/staff", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch staff members");
      }

      setStaffMembers(data.staffMembers || []);
    } catch (err: any) {
      console.error("Error fetching staff members:", err);
      setError(err.message || "Failed to load staff members. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      status === "authenticated" &&
      (session?.user.role === UserRole.AGENCY_ADMIN ||
        session?.user.role === UserRole.PLATFORM_ADMIN || session?.user.role === UserRole.SUPERADMIN)
    ) {
      fetchStaffMembers();
    }
  }, [session, status]);

  // Handle remove staff member
  const handleRemoveStaff = async (staffId: string) => {
    try {
      setActionLoading(true);

      const response = await fetch(`/api/agency/staff/${staffId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove staff member");
      }

      // Refresh the staff list
      await fetchStaffMembers();
    } catch (err: any) {
      console.error("Error removing staff member:", err);
      alert(err.message || "Failed to remove staff member. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (staffId: string) => {
    try {
      setActionLoading(true);

      const response = await fetch(`/api/agency/staff/${staffId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend invitation");
      }

      alert("Invitation resent successfully!");
      // Refresh the staff list
      await fetchStaffMembers();
    } catch (err: any) {
      console.error("Error resending invitation:", err);
      alert(err.message || "Failed to resend invitation. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle successful invitation
  const handleInviteSuccess = () => {
    fetchStaffMembers();
  };

  // Show loading state
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#0B4F96] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading staff members...</p>
        </div>
      </div>
    );
  }

  // Show error state for unauthorized users
  if (
    session?.user &&
    session.user.role !== UserRole.AGENCY_ADMIN &&
    session.user.role !== UserRole.PLATFORM_ADMIN && session.user.role !== UserRole.SUPERADMIN
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to access staff management.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#0B4F96] text-white px-6 py-2 rounded-lg hover:bg-[#48ccbc] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Staff Management
                </h1>
                <p className="text-gray-600">
                  Manage your agency's team members
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 bg-[#0B4F96] text-white px-6 py-3 rounded-lg hover:bg-[#48ccbc] transition-colors shadow-md hover:shadow-lg"
              disabled={actionLoading}
            >
              <UserPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Invite Staff Member</span>
              <span className="sm:hidden">Invite</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchStaffMembers}
                  className="text-sm text-red-600 hover:text-red-800 underline mt-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-[#0B4F96]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffMembers.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {staffMembers.filter((s) => s.invitationStatus === "active").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    staffMembers.filter((s) => s.invitationStatus === "pending")
                      .length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <StaffList
          staffMembers={staffMembers}
          onRemove={handleRemoveStaff}
          onResendInvitation={handleResendInvitation}
        />
      </div>

      {/* Invite Staff Modal */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
