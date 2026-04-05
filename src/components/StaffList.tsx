"use client";

import { useState } from "react";
import {
  User,
  Mail,
  MoreVertical,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
} from "lucide-react";
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

interface StaffListProps {
  staffMembers: StaffMember[];
  onRemove: (staffId: string) => void;
  onResendInvitation: (staffId: string) => void;
}

export default function StaffList({
  staffMembers,
  onRemove,
  onResendInvitation,
}: StaffListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.AGENCY_ADMIN:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        );
      case UserRole.PLATFORM_ADMIN:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Shield className="h-3 w-3" />
            Platform Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <User className="h-3 w-3" />
            Staff
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  if (staffMembers.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No staff members yet</p>
        <p className="text-sm text-gray-500 mt-2">
          Invite your team members to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staff Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staffMembers.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#0B4F96] flex items-center justify-center text-white font-medium">
                      {staff.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {staff.name || "Unnamed"}
                      </div>
                      {staff.isPrimaryContact && (
                        <div className="text-xs text-gray-500">Primary Contact</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {staff.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(staff.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(staff.invitationStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(staff.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === staff.id ? null : staff.id)
                      }
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                      disabled={staff.isPrimaryContact}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {openMenuId === staff.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                          {staff.invitationStatus !== "active" && (
                            <button
                              onClick={() => {
                                onResendInvitation(staff.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                            >
                              <Send className="h-4 w-4" />
                              Resend Invitation
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Are you sure you want to remove ${
                                    staff.name || staff.email
                                  } from your agency?`
                                )
                              ) {
                                onRemove(staff.id);
                                setOpenMenuId(null);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-gray-200">
        {staffMembers.map((staff) => (
          <div key={staff.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-[#0B4F96] flex items-center justify-center text-white font-medium flex-shrink-0">
                {staff.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {staff.name || "Unnamed"}
                  </h3>
                  {getRoleBadge(staff.role)}
                </div>
                <p className="text-sm text-gray-600 truncate mb-2">{staff.email}</p>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(staff.invitationStatus)}
                  <span className="text-xs text-gray-500">
                    Joined {new Date(staff.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {staff.isPrimaryContact && (
                  <div className="text-xs text-gray-500 mb-2">Primary Contact</div>
                )}
                {!staff.isPrimaryContact && (
                  <div className="flex gap-2">
                    {staff.invitationStatus !== "active" && (
                      <button
                        onClick={() => onResendInvitation(staff.id)}
                        className="flex items-center gap-1 px-3 py-1 text-xs text-[#0B4F96] border border-[#0B4F96] rounded hover:bg-[#0B4F96] hover:text-white transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to remove ${
                              staff.name || staff.email
                            } from your agency?`
                          )
                        ) {
                          onRemove(staff.id);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
