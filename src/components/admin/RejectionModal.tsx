'use client';

import { useState } from 'react';
import { X, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string, notes?: string) => Promise<void>;
  agencyName: string;
}

export default function RejectionModal({
  isOpen,
  onClose,
  onReject,
  agencyName,
}: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    // Validate reason
    if (!reason.trim()) {
      setValidationError('Rejection reason is required');
      return;
    }

    if (reason.trim().length < 10) {
      setValidationError('Rejection reason must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await onReject(reason.trim(), notes.trim() || undefined);
      // Success - modal will be closed by parent component
      setReason('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject agency');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setNotes('');
      setError(null);
      setValidationError(null);
      onClose();
    }
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    setValidationError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                  Reject Agency
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {agencyName}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Warning Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  By rejecting this agency:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                  <li>They will be notified via email</li>
                  <li>They will NOT have access to the platform</li>
                  <li>You must provide a clear reason for rejection</li>
                </ul>
              </div>

              {/* Required Reason Field */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => handleReasonChange(e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    validationError
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-red-500'
                  }`}
                  placeholder="Explain why this agency is being rejected (minimum 10 characters)..."
                  disabled={isSubmitting}
                  required
                />
                {validationError && (
                  <p className="text-sm text-red-600 mt-1">{validationError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be sent to the agency in the rejection email.
                  {reason.length > 0 && ` (${reason.length} characters)`}
                </p>
              </div>

              {/* Optional Internal Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Add any additional internal notes (not sent to agency)..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  These notes are for internal use only and will not be sent to the agency.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim() || reason.trim().length < 10}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Agency
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
