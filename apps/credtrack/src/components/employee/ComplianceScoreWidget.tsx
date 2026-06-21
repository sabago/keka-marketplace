'use client';

import { useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

// Easy to tune — weight categories by compliance importance
const CATEGORY_WEIGHTS = {
  LICENSE: 3,
  BACKGROUND_CHECK: 3,
  TRAINING: 2,
  VACCINATION: 2,
  HR: 1,
  ID: 1,
  INSURANCE: 1,
  COMPETENCY: 1,
  OTHER: 1,
} as const;

type DocumentCategory = keyof typeof CATEGORY_WEIGHTS;

interface CategoryBreakdown {
  category: DocumentCategory;
  compliant: number;
  total: number;
}

interface ComplianceScoreWidgetProps {
  stats: {
    totalCredentials: number;
    compliant: number;
    compliancePercentage: number;
    expiringSoon: number;
    expired: number;
    pendingReview: number;
  };
  categoryBreakdown?: CategoryBreakdown[];
}

export default function ComplianceScoreWidget({ stats, categoryBreakdown }: ComplianceScoreWidgetProps) {
  // Weighted score: sum(weight * compliantInCategory) / sum(weight * totalInCategory) * 100
  const weightedScore = useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return null;

    let weightedCompliant = 0;
    let weightedTotal = 0;

    for (const row of categoryBreakdown) {
      const weight = CATEGORY_WEIGHTS[row.category] ?? 1;
      weightedCompliant += weight * row.compliant;
      weightedTotal += weight * row.total;
    }

    if (weightedTotal === 0) return null;
    return Math.round((weightedCompliant / weightedTotal) * 100);
  }, [categoryBreakdown]);

  const displayScore = weightedScore !== null ? weightedScore : stats.compliancePercentage;
  const isWeighted = weightedScore !== null;

  const getScoreColor = () => {
    if (displayScore >= 90) return 'text-green-600';
    if (displayScore >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = () => {
    if (displayScore >= 90) return 'bg-green-50 border-green-200';
    if (displayScore >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreMessage = () => {
    if (displayScore === 100) return '🎉 Perfect! All credentials are compliant.';
    if (displayScore >= 90) return '✅ Great! You\'re almost fully compliant.';
    if (displayScore >= 70) return '⚠️ Good, but some credentials need attention.';
    return '🚨 Action needed! Several credentials require updates.';
  };

  const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    LICENSE: 'Licenses',
    BACKGROUND_CHECK: 'Background Checks',
    TRAINING: 'Training',
    VACCINATION: 'Vaccinations',
    HR: 'HR Docs',
    ID: 'Identification',
    INSURANCE: 'Insurance',
    COMPETENCY: 'Competency',
    OTHER: 'Other',
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
          {displayScore}%
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {stats.compliant} of {stats.totalCredentials} credentials compliant
        </p>
        {isWeighted && (
          <p className="mt-1 text-xs text-gray-500">
            Weighted by category importance
          </p>
        )}
      </div>

      {/* Status Message */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 text-center">
          {getScoreMessage()}
        </p>
      </div>

      {/* Category breakdown (when provided) */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">By Category</h4>
          <div className="space-y-1">
            {categoryBreakdown
              .slice()
              .sort(
                (a, b) =>
                  (CATEGORY_WEIGHTS[b.category] ?? 1) - (CATEGORY_WEIGHTS[a.category] ?? 1)
              )
              .map((row) => {
                const pct = row.total === 0 ? 100 : Math.round((row.compliant / row.total) * 100);
                const weight = CATEGORY_WEIGHTS[row.category] ?? 1;
                return (
                  <div key={row.category} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 truncate">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          pct >= 90
                            ? 'bg-green-500'
                            : pct >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-10 text-right">
                      {pct}%
                    </span>
                    {weight >= 3 && (
                      <span className="text-xs text-orange-600 font-medium">●</span>
                    )}
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ● = critical category (weight 3×)
          </p>
        </div>
      )}

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
          You&apos;ll receive automatic reminders 30 and 7 days before expiration.
        </p>
      </div>
    </div>
  );
}
