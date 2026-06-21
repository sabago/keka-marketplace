'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface Credential {
  id: string;
  fileName: string;
  documentType: {
    name: string;
  };
  status: string;
  reviewStatus: string;
  isCompliant: boolean;
  expirationDate: Date | null;
  issueDate: Date | null;
  issuer: string | null;
  licenseNumber: string | null;
  aiConfidence: number | null;
  reviewNotes: string | null;
  createdAt: Date;
}

interface CredentialCardProps {
  credential: Credential;
  onUploadRenewal?: () => void;
}

export default function CredentialCard({ credential, onUploadRenewal }: CredentialCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleViewDetails = () => {
    router.push(`/dashboard/credentials/${credential.id}`);
  };

  const getStatusInfo = () => {
    if (credential.status === 'EXPIRED') {
      return {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Expired',
      };
    } else if (credential.status === 'EXPIRING_SOON') {
      return {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Expiring Soon',
      };
    } else if (credential.reviewStatus === 'PENDING_REVIEW') {
      return {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <Clock className="h-4 w-4" />,
        label: 'Pending Review',
      };
    } else if (credential.reviewStatus === 'REJECTED') {
      return {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Rejected',
      };
    } else if (credential.reviewStatus === 'APPROVED' || credential.isCompliant) {
      return {
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Active',
      };
    }
    return {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <FileText className="h-4 w-4" />,
      label: 'Unknown',
    };
  };

  const getDaysUntilExpiration = () => {
    if (!credential.expirationDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expDate = new Date(credential.expirationDate);
    expDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.floor(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntil;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusInfo = getStatusInfo();
  const daysUntilExpiration = getDaysUntilExpiration();
  const needsAction =
    credential.status === 'EXPIRED' ||
    credential.status === 'EXPIRING_SOON' ||
    credential.reviewStatus === 'REJECTED';

  return (
    <div
      className={`bg-white border-2 rounded-lg transition-all ${
        needsAction ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">
                {credential.documentType.name}
              </h3>
            </div>

            {credential.licenseNumber && (
              <p className="text-sm text-gray-600 font-mono">
                {credential.licenseNumber}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        {/* Expiration Info */}
        {credential.expirationDate && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Expires: <strong>{formatDate(credential.expirationDate)}</strong>
            </span>
            {daysUntilExpiration !== null && daysUntilExpiration >= 0 && (
              <span
                className={`ml-2 ${
                  daysUntilExpiration <= 7
                    ? 'text-red-600 font-semibold'
                    : daysUntilExpiration <= 30
                    ? 'text-yellow-600 font-semibold'
                    : 'text-gray-500'
                }`}
              >
                ({daysUntilExpiration} days)
              </span>
            )}
            {daysUntilExpiration !== null && daysUntilExpiration < 0 && (
              <span className="ml-2 text-red-600 font-semibold">
                (Expired {Math.abs(daysUntilExpiration)} days ago)
              </span>
            )}
          </div>
        )}

        {/* Review Notes */}
        {credential.reviewStatus === 'REJECTED' && credential.reviewNotes && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
            <p className="font-medium text-red-900 mb-1">Action Required:</p>
            <p className="text-red-700">{credential.reviewNotes}</p>
          </div>
        )}
        {credential.reviewStatus === 'PENDING_REVIEW' && credential.reviewNotes && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
            <p className="font-medium text-amber-900 mb-1">Under Review:</p>
            <p className="text-amber-700">{credential.reviewNotes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-[#0B4F96] hover:underline"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show details
              </>
            )}
          </button>
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#0B4F96] hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View full details
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4 space-y-3">
            {credential.issuer && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Issuer
                </label>
                <p className="text-sm text-gray-900">{credential.issuer}</p>
              </div>
            )}

            {credential.issueDate && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Issue Date
                </label>
                <p className="text-sm text-gray-900">
                  {formatDate(credential.issueDate)}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">
                Uploaded
              </label>
              <p className="text-sm text-gray-900">
                {formatDate(credential.createdAt)}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">
                Review Status
              </label>
              <p className="text-sm text-gray-900">{credential.reviewStatus}</p>
            </div>

            {credential.aiConfidence !== null && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  AI Confidence
                </label>
                <p className="text-sm text-gray-900">
                  {Math.round(credential.aiConfidence * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      {needsAction && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <button
            onClick={onUploadRenewal}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors"
          >
            <Upload className="h-4 w-4" />
            {credential.status === 'EXPIRED' || credential.status === 'EXPIRING_SOON'
              ? 'Upload Renewed Credential'
              : 'Upload Corrected Document'}
          </button>
        </div>
      )}
    </div>
  );
}
