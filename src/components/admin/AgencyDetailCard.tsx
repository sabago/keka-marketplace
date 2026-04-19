'use client';

import { ApprovalStatus, AgencySize, UserRole } from '@prisma/client';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  ClipboardList
} from 'lucide-react';
import { useState } from 'react';

interface AgencyUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isPrimaryContact: boolean;
  createdAt: string | Date;
  emailVerified: Date | null;
}

interface Agency {
  id: string;
  agencyName: string;
  licenseNumber: string;
  taxId: string | null;
  agencySize: AgencySize;
  servicesOffered: string[];
  serviceArea: string[];
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string | null;
  primaryContactRole: string;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  verificationNotes: string | null;
  createdAt: string | Date;
  approvedAt: Date | null;
  users: AgencyUser[];
  // Intake Analytics
  intakeMethods?: string[];
  intakeTrackingDescription?: string | null;
  followUpFrequency?: string | null;
  followUpMethods?: string[];
}

interface AgencyDetailCardProps {
  agency: Agency;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  SUSPENDED: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  SUSPENDED: XCircle,
};

export default function AgencyDetailCard({ agency }: AgencyDetailCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatusIcon = statusIcons[agency.approvalStatus];

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div
        className={`p-4 rounded-lg border-2 flex items-center ${
          statusColors[agency.approvalStatus]
        }`}
      >
        <StatusIcon className="h-6 w-6 mr-3" />
        <div>
          <div className="font-semibold text-lg">
            Status: {agency.approvalStatus}
          </div>
          {agency.approvedAt && (
            <div className="text-sm mt-1">
              Approved on {formatDate(agency.approvedAt)}
            </div>
          )}
        </div>
      </div>

      {/* Agency Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Building2 className="h-5 w-5 text-[#0B4F96] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Agency Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Agency Name</label>
            <p className="mt-1 text-gray-900">{agency.agencyName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">License Number</label>
            <div className="flex items-center mt-1">
              <p className="text-gray-900 mr-2">{agency.licenseNumber}</p>
              <button
                onClick={() => copyToClipboard(agency.licenseNumber, 'license')}
                className="text-gray-400 hover:text-gray-600"
                title="Copy to clipboard"
              >
                {copiedField === 'license' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Agency Size</label>
            <p className="mt-1 text-gray-900">{agency.agencySize}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Tax ID / EIN</label>
            <div className="flex items-center mt-1">
              <p className="text-gray-900 mr-2">{agency.taxId || 'Not provided'}</p>
              {agency.taxId && (
                <button
                  onClick={() => copyToClipboard(agency.taxId!, 'taxId')}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy to clipboard"
                >
                  {copiedField === 'taxId' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services & Coverage */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <MapPin className="h-5 w-5 text-[#0B4F96] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Services & Coverage</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Services Offered
            </label>
            <div className="flex flex-wrap gap-2">
              {agency.servicesOffered.map((service, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Service Area
            </label>
            <div className="flex flex-wrap gap-2">
              {agency.serviceArea.map((area, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intake Process Analytics */}
      {(agency.intakeMethods && agency.intakeMethods.length > 0) ||
       (agency.followUpMethods && agency.followUpMethods.length > 0) ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ClipboardList className="h-5 w-5 text-[#0B4F96] mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Intake Process & Analytics</h3>
          </div>
          <div className="space-y-4">
            {/* Intake Methods */}
            {agency.intakeMethods && agency.intakeMethods.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Intake Methods
                </label>
                <div className="flex flex-wrap gap-2">
                  {agency.intakeMethods.map((method, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full capitalize"
                    >
                      {method === 'in-person' ? 'In-Person' : method}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Description */}
            {agency.intakeTrackingDescription && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Tracking System
                </label>
                <p className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                  {agency.intakeTrackingDescription}
                </p>
              </div>
            )}

            {/* Follow-up Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agency.followUpFrequency && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Follow-up Frequency
                  </label>
                  <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full capitalize">
                    {agency.followUpFrequency === 'as-needed' ? 'As Needed' :
                     agency.followUpFrequency === 'bi-weekly' ? 'Bi-weekly' :
                     agency.followUpFrequency}
                  </span>
                </div>
              )}

              {agency.followUpMethods && agency.followUpMethods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Follow-up Methods
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {agency.followUpMethods.map((method, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full capitalize"
                      >
                        {method === 'in-person' ? 'In-Person' :
                         method === 'text' ? 'Text/SMS' : method}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Primary Contact */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-[#0B4F96] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Primary Contact</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Name</label>
            <p className="mt-1 text-gray-900">{agency.primaryContactName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Role</label>
            <p className="mt-1 text-gray-900">{agency.primaryContactRole}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email</label>
            <div className="flex items-center mt-1">
              <a
                href={`mailto:${agency.primaryContactEmail}`}
                className="text-[#0B4F96] hover:text-[#48ccbc] mr-2"
              >
                {agency.primaryContactEmail}
              </a>
              <button
                onClick={() => copyToClipboard(agency.primaryContactEmail, 'email')}
                className="text-gray-400 hover:text-gray-600"
                title="Copy to clipboard"
              >
                {copiedField === 'email' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Phone</label>
            <p className="mt-1 text-gray-900">
              {agency.primaryContactPhone || 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* All Users */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-[#0B4F96] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Users ({agency.users.length})
          </h3>
        </div>
        <div className="space-y-3">
          {agency.users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center">
                  <p className="font-medium text-gray-900">{user.name || 'No name'}</p>
                  {user.isPrimaryContact && (
                    <span className="ml-2 px-2 py-0.5 bg-[#0B4F96] text-white text-xs rounded-full">
                      Primary
                    </span>
                  )}
                  {user.emailVerified && (
                    <CheckCircle className="ml-2 h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Role: {user.role} • Joined {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rejection Reason (if rejected) */}
      {agency.approvalStatus === 'REJECTED' && agency.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-2">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-900">Rejection Reason</h3>
          </div>
          <p className="text-red-800">{agency.rejectionReason}</p>
        </div>
      )}

      {/* Verification Notes */}
      {agency.verificationNotes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center mb-2">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">Verification Notes</h3>
          </div>
          <p className="text-blue-800 whitespace-pre-wrap">{agency.verificationNotes}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-500 font-medium">Agency ID</label>
            <div className="flex items-center mt-1">
              <code className="text-gray-700 text-xs mr-2">{agency.id}</code>
              <button
                onClick={() => copyToClipboard(agency.id, 'id')}
                className="text-gray-400 hover:text-gray-600"
                title="Copy to clipboard"
              >
                {copiedField === 'id' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-gray-500 font-medium">Submitted</label>
            <p className="text-gray-700 mt-1">{formatDate(agency.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
