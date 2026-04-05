'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  User,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import CredentialTimeline from '@/components/employee/CredentialTimeline';

interface CredentialDetail {
  id: string;
  fileName: string;
  documentType: {
    id: string;
    name: string;
    description: string | null;
  };
  status: string;
  reviewStatus: string;
  isCompliant: boolean;
  expirationDate: Date | null;
  issueDate: Date | null;
  issuer: string | null;
  licenseNumber: string | null;
  verificationUrl: string | null;
  aiConfidence: number | null;
  aiParsedAt: Date | null;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  notes: string | null;
  fileSize: number;
  mimeType: string;
  s3DownloadUrl?: string;
}

export default function CredentialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const credentialId = params.id as string;

  const [credential, setCredential] = useState<CredentialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credentialId) {
      fetchCredentialDetail();
    }
  }, [credentialId]);

  const fetchCredentialDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/employee/credentials/${credentialId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch credential');
      }

      const data = await response.json();
      setCredential(data.credential);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching credential:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/credentials');
  };

  const handleUploadRenewal = () => {
    router.push('/dashboard/credentials/upload');
  };

  const handleDownload = () => {
    if (credential?.s3DownloadUrl) {
      window.open(credential.s3DownloadUrl, '_blank');
    }
  };

  const getStatusInfo = () => {
    if (!credential) return null;

    if (credential.status === 'EXPIRED') {
      return {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-5 w-5" />,
        label: 'Expired',
      };
    } else if (credential.status === 'EXPIRING_SOON') {
      return {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: <AlertCircle className="h-5 w-5" />,
        label: 'Expiring Soon',
      };
    } else if (credential.reviewStatus === 'PENDING_REVIEW') {
      return {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <Clock className="h-5 w-5" />,
        label: 'Pending Review',
      };
    } else if (credential.reviewStatus === 'REJECTED') {
      return {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="h-5 w-5" />,
        label: 'Rejected',
      };
    } else if (credential.isCompliant) {
      return {
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle className="h-5 w-5" />,
        label: 'Active',
      };
    }
    return {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <FileText className="h-5 w-5" />,
      label: 'Unknown',
    };
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const statusInfo = getStatusInfo();
  const needsAction =
    credential?.status === 'EXPIRED' ||
    credential?.status === 'EXPIRING_SOON' ||
    credential?.reviewStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Credentials
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#0B4F96] animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error Loading Credential</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && credential && (
          <>
            {/* Action Alert */}
            {needsAction && (
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">Action Required</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This credential needs your attention.
                    </p>
                  </div>
                  <button
                    onClick={handleUploadRenewal}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Upload Updated Document
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Credential Info Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-6 w-6 text-gray-400" />
                        <h1 className="text-2xl font-bold text-gray-900">
                          {credential.documentType.name}
                        </h1>
                      </div>
                      {credential.documentType.description && (
                        <p className="text-gray-600 ml-9">
                          {credential.documentType.description}
                        </p>
                      )}
                    </div>
                    {statusInfo && (
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${statusInfo.color}`}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* License Number */}
                    {credential.licenseNumber && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          License Number
                        </label>
                        <p className="text-base font-mono text-gray-900">
                          {credential.licenseNumber}
                        </p>
                      </div>
                    )}

                    {/* Issuer */}
                    {credential.issuer && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Issuer
                        </label>
                        <p className="text-base text-gray-900">{credential.issuer}</p>
                      </div>
                    )}

                    {/* Issue Date */}
                    {credential.issueDate && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Issue Date
                        </label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p className="text-base text-gray-900">
                            {formatDate(credential.issueDate)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Expiration Date */}
                    {credential.expirationDate && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Expiration Date
                        </label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p className="text-base text-gray-900">
                            {formatDate(credential.expirationDate)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Verification URL */}
                    {credential.verificationUrl && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Verification URL
                        </label>
                        <a
                          href={credential.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base text-[#0B4F96] hover:underline break-all"
                        >
                          {credential.verificationUrl}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Review Notes */}
                  {credential.reviewStatus === 'REJECTED' && credential.reviewNotes && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        Reason for Rejection:
                      </p>
                      <p className="text-sm text-red-700">{credential.reviewNotes}</p>
                    </div>
                  )}

                  {/* Employee Notes */}
                  {credential.notes && (
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-2">Notes:</p>
                      <p className="text-sm text-gray-700">{credential.notes}</p>
                    </div>
                  )}
                </div>

                {/* File Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    File Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Filename:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {credential.fileName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">File Size:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatFileSize(credential.fileSize)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">File Type:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {credential.mimeType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uploaded:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(credential.createdAt)}
                      </span>
                    </div>
                    {credential.aiConfidence !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">AI Confidence:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(credential.aiConfidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {credential.s3DownloadUrl && (
                    <button
                      onClick={handleDownload}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Document
                    </button>
                  )}
                </div>

                {/* Timeline */}
                <CredentialTimeline credential={credential} />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {needsAction && (
                      <button
                        onClick={handleUploadRenewal}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Updated Document
                      </button>
                    )}
                    {credential.s3DownloadUrl && (
                      <button
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    )}
                  </div>
                </div>

                {/* Compliance Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Compliance Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Is Compliant:</span>
                      <span
                        className={`text-sm font-medium ${
                          credential.isCompliant ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {credential.isCompliant ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Review Status:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {credential.reviewStatus.replace('_', ' ')}
                      </span>
                    </div>
                    {credential.reviewedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Reviewed:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(credential.reviewedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Help Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-3">Need Help?</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    If you have questions about this credential or need assistance,
                    please contact your administrator.
                  </p>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Ensure documents are clear and legible</li>
                    <li>• Upload renewed documents before expiration</li>
                    <li>• Check email for review notifications</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
