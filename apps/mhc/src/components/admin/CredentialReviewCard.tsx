'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
  Calendar,
  User,
  FileText,
  Hash,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface CredentialData {
  id: string;
  issuer: string | null;
  licenseNumber: string | null;
  issueDate: Date | null;
  expirationDate: Date | null;
  verificationUrl: string | null;
  aiConfidence: number | null;
  aiParsedData: any;
  reviewStatus: string;
  reviewNotes: string | null;
  status: string;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
  };
  documentType: {
    name: string;
  };
}

interface CredentialReviewCardProps {
  credential: CredentialData;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  onEdit: (corrections: any, notes?: string) => Promise<void>;
  onRequestCorrection: (notes: string) => Promise<void>;
}

export default function CredentialReviewCard({
  credential,
  onApprove,
  onReject,
  onEdit,
  onRequestCorrection,
}: CredentialReviewCardProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'reject' | 'correction'>('view');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  // Edit form state
  const [editedIssuer, setEditedIssuer] = useState(credential.issuer || '');
  const [editedLicenseNumber, setEditedLicenseNumber] = useState(credential.licenseNumber || '');
  const [editedIssueDate, setEditedIssueDate] = useState(
    credential.issueDate ? new Date(credential.issueDate).toISOString().split('T')[0] : ''
  );
  const [editedExpirationDate, setEditedExpirationDate] = useState(
    credential.expirationDate ? new Date(credential.expirationDate).toISOString().split('T')[0] : ''
  );
  const [editedVerificationUrl, setEditedVerificationUrl] = useState(credential.verificationUrl || '');

  const confidence = credential.aiConfidence || 0;
  const confidencePercent = Math.round(confidence * 100);

  const getConfidenceColor = () => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(notes || undefined);
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(notes);
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!notes.trim()) {
      alert('Please describe what correction is needed');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRequestCorrection(notes);
    } catch (error) {
      console.error('Error requesting correction:', error);
      alert('Failed to request correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdits = async () => {
    const corrections: any = {};

    if (editedIssuer !== credential.issuer) corrections.issuer = editedIssuer;
    if (editedLicenseNumber !== credential.licenseNumber) corrections.licenseNumber = editedLicenseNumber;
    if (editedIssueDate && editedIssueDate !== (credential.issueDate ? new Date(credential.issueDate).toISOString().split('T')[0] : '')) {
      corrections.issueDate = editedIssueDate;
    }
    if (editedExpirationDate && editedExpirationDate !== (credential.expirationDate ? new Date(credential.expirationDate).toISOString().split('T')[0] : '')) {
      corrections.expirationDate = editedExpirationDate;
    }
    if (editedVerificationUrl !== credential.verificationUrl) {
      corrections.verificationUrl = editedVerificationUrl;
    }

    if (Object.keys(corrections).length === 0) {
      alert('No changes made');
      return;
    }

    setIsSubmitting(true);
    try {
      await onEdit(corrections, notes || undefined);
    } catch (error) {
      console.error('Error saving edits:', error);
      alert('Failed to save edits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {credential.documentType.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {credential.employee.firstName} {credential.employee.lastName} • {credential.employee.email}
            </p>
          </div>

          {/* AI Confidence Badge */}
          {credential.aiConfidence !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getConfidenceColor()}`}>
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                {confidencePercent}% confidence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* AI Warning */}
      {confidence < 0.7 && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Low Confidence Detection</p>
              <p className="text-xs text-yellow-700 mt-1">
                AI parsing had low confidence ({confidencePercent}%). Please manually verify all fields.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {mode === 'view' && (
          <div className="space-y-4">
            {/* Issuer */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Issuing Organization
              </label>
              <p className="mt-1 text-gray-900">{credential.issuer || 'Not detected'}</p>
            </div>

            {/* License Number */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                License/Certificate Number
              </label>
              <p className="mt-1 text-gray-900 font-mono">{credential.licenseNumber || 'Not detected'}</p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Issue Date
                </label>
                <p className="mt-1 text-gray-900">{formatDate(credential.issueDate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expiration Date
                </label>
                <p className="mt-1 text-gray-900">{formatDate(credential.expirationDate)}</p>
              </div>
            </div>

            {/* Verification URL */}
            {credential.verificationUrl && (
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Verification URL
                </label>
                <a
                  href={credential.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-[#0B4F96] hover:underline text-sm break-all"
                >
                  {credential.verificationUrl}
                </a>
              </div>
            )}

            {/* AI Parsing Notes */}
            {credential.aiParsedData?.parsingNotes && (
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Parsing Notes
                </label>
                <p className="mt-1 text-sm text-gray-600 italic">{credential.aiParsedData.parsingNotes}</p>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Review Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="Add any notes about your review..."
              />
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <div className="space-y-4">
            {/* Issuer */}
            <div>
              <label className="text-sm font-medium text-gray-700">Issuing Organization *</label>
              <input
                type="text"
                value={editedIssuer}
                onChange={(e) => setEditedIssuer(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="e.g., Massachusetts Board of Nursing"
              />
            </div>

            {/* License Number */}
            <div>
              <label className="text-sm font-medium text-gray-700">License/Certificate Number *</label>
              <input
                type="text"
                value={editedLicenseNumber}
                onChange={(e) => setEditedLicenseNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent font-mono"
                placeholder="e.g., RN-123456"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Issue Date</label>
                <input
                  type="date"
                  value={editedIssueDate}
                  onChange={(e) => setEditedIssueDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expiration Date</label>
                <input
                  type="date"
                  value={editedExpirationDate}
                  onChange={(e) => setEditedExpirationDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                />
              </div>
            </div>

            {/* Verification URL */}
            <div>
              <label className="text-sm font-medium text-gray-700">Verification URL</label>
              <input
                type="url"
                value={editedVerificationUrl}
                onChange={(e) => setEditedVerificationUrl(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700">Correction Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                placeholder="Explain what corrections were made..."
              />
            </div>
          </div>
        )}

        {mode === 'reject' && (
          <div>
            <label className="text-sm font-medium text-gray-700">
              Reason for Rejection *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="Explain why this credential is being rejected..."
              required
            />
          </div>
        )}

        {mode === 'correction' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Requesting a correction will notify the employee to re-upload or fix their credential.
                The credential will not be marked as non-compliant.
              </p>
            </div>
            <label className="text-sm font-medium text-gray-700">
              Correction Instructions *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
              placeholder="Explain what needs to be corrected or re-uploaded..."
              required
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        {mode === 'view' && (
          <>
            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <Edit2 className="h-4 w-4" />
              Edit & Approve
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setMode('correction'); setNotes(''); }}
                className="flex items-center gap-2 px-4 py-2 text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <AlertCircle className="h-4 w-4" />
                Request Correction
              </button>
              <button
                onClick={() => setMode('reject')}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve
              </button>
            </div>
          </>
        )}

        {mode === 'edit' && (
          <>
            <button
              onClick={() => setMode('view')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdits}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#0B4F96] text-white rounded-lg hover:bg-[#083d75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Save & Approve
            </button>
          </>
        )}

        {mode === 'reject' && (
          <>
            <button
              onClick={() => {
                setMode('view');
                setNotes('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Confirm Rejection
            </button>
          </>
        )}

        {mode === 'correction' && (
          <>
            <button
              onClick={() => {
                setMode('view');
                setNotes('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleRequestCorrection}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              Send Correction Request
            </button>
          </>
        )}
      </div>
    </div>
  );
}
