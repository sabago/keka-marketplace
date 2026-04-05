'use client';

import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface ComplianceScoreWidgetProps {
  stats: {
    totalCredentials: number;
    compliant: number;
    compliancePercentage: number;
    expiringSoon: number;
    expired: number;
    pendingReview: number;
  };
}

export default function ComplianceScoreWidget({ stats }: ComplianceScoreWidgetProps) {
  const getScoreColor = () => {
    if (stats.compliancePercentage >= 90) return 'text-green-600';
    if (stats.compliancePercentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = () => {
    if (stats.compliancePercentage >= 90) return 'bg-green-50 border-green-200';
    if (stats.compliancePercentage >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreMessage = () => {
    if (stats.compliancePercentage === 100) return '🎉 Perfect! All credentials are compliant.';
    if (stats.compliancePercentage >= 90) return '✅ Great! You\'re almost fully compliant.';
    if (stats.compliancePercentage >= 70) return '⚠️ Good, but some credentials need attention.';
    return '🚨 Action needed! Several credentials require updates.';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Compliance Score</h3>
        <TrendingUp className="h-5 w-5 text-gray-400" />
      </div>

      {/* Score Display */}
      <div className={`mb-6 p-6 border-2 rounded-lg text-center ${getScoreBackground()}`}>
        <div className={`text-5xl font-bold ${getScoreColor()}`}>
          {stats.compliancePercentage}%
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {stats.compliant} of {stats.totalCredentials} credentials compliant
        </p>
      </div>

      {/* Status Message */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 text-center">
          {getScoreMessage()}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {/* Compliant */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Compliant</span>
          </div>
          <span className="text-sm font-semibold text-green-600">
            {stats.compliant}
          </span>
        </div>

        {/* Expiring Soon */}
        {stats.expiringSoon > 0 && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">Expiring Soon</span>
            </div>
            <span className="text-sm font-semibold text-yellow-600">
              {stats.expiringSoon}
            </span>
          </div>
        )}

        {/* Expired */}
        {stats.expired > 0 && (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-900">Expired</span>
            </div>
            <span className="text-sm font-semibold text-red-600">
              {stats.expired}
            </span>
          </div>
        )}

        {/* Pending Review */}
        {stats.pendingReview > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Pending Review</span>
            </div>
            <span className="text-sm font-semibold text-blue-600">
              {stats.pendingReview}
            </span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> Keep your compliance score above 90% by renewing credentials before they expire.
          You'll receive automatic reminders 30 and 7 days before expiration.
        </p>
      </div>
    </div>
  );
}
