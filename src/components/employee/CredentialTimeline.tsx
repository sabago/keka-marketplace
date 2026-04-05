'use client';

import {
  Upload,
  Sparkles,
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface TimelineEvent {
  type: 'upload' | 'parsing' | 'reviewed' | 'approved' | 'rejected';
  timestamp: Date;
  description: string;
  details?: string;
  user?: string;
}

interface CredentialTimelineProps {
  credential: {
    createdAt: Date;
    aiParsedAt: Date | null;
    reviewedAt: Date | null;
    reviewStatus: string;
    reviewedBy: string | null;
    reviewNotes: string | null;
    aiConfidence: number | null;
    uploadedBy: string;
  };
}

export default function CredentialTimeline({ credential }: CredentialTimelineProps) {
  const buildTimeline = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Upload event
    events.push({
      type: 'upload',
      timestamp: new Date(credential.createdAt),
      description: 'Credential uploaded',
      details: 'Document uploaded to system',
      user: credential.uploadedBy,
    });

    // 2. AI Parsing event
    if (credential.aiParsedAt) {
      events.push({
        type: 'parsing',
        timestamp: new Date(credential.aiParsedAt),
        description: 'AI parsing completed',
        details: credential.aiConfidence
          ? `Confidence: ${Math.round(credential.aiConfidence * 100)}%`
          : undefined,
      });
    }

    // 3. Review event
    if (credential.reviewedAt) {
      if (credential.reviewStatus === 'APPROVED') {
        events.push({
          type: 'approved',
          timestamp: new Date(credential.reviewedAt),
          description: 'Credential approved',
          details: credential.reviewNotes || 'Approved by administrator',
          user: credential.reviewedBy || undefined,
        });
      } else if (credential.reviewStatus === 'REJECTED') {
        events.push({
          type: 'rejected',
          timestamp: new Date(credential.reviewedAt),
          description: 'Credential rejected',
          details: credential.reviewNotes || 'Requires correction',
          user: credential.reviewedBy || undefined,
        });
      }
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'upload':
        return <Upload className="h-5 w-5" />;
      case 'parsing':
        return <Sparkles className="h-5 w-5" />;
      case 'reviewed':
        return <UserCheck className="h-5 w-5" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5" />;
      case 'rejected':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'upload':
        return 'bg-blue-100 text-blue-600';
      case 'parsing':
        return 'bg-purple-100 text-purple-600';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-600';
      case 'approved':
        return 'bg-green-100 text-green-600';
      case 'rejected':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getConnectorColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'approved':
        return 'bg-green-300';
      case 'rejected':
        return 'bg-red-300';
      default:
        return 'bg-gray-300';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrentStatus = () => {
    if (credential.reviewStatus === 'APPROVED') {
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        color: 'bg-green-100 text-green-700 border-green-200',
        label: 'Approved',
      };
    } else if (credential.reviewStatus === 'REJECTED') {
      return {
        icon: <XCircle className="h-5 w-5" />,
        color: 'bg-red-100 text-red-700 border-red-200',
        label: 'Rejected',
      };
    } else if (credential.reviewStatus === 'PENDING_REVIEW') {
      return {
        icon: <Clock className="h-5 w-5" />,
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        label: 'Pending Review',
      };
    } else {
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'In Progress',
      };
    }
  };

  const timeline = buildTimeline();
  const currentStatus = getCurrentStatus();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Credential History</h3>
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${currentStatus.color}`}
        >
          {currentStatus.icon}
          {currentStatus.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {timeline.map((event, index) => (
          <div key={index} className="relative">
            {/* Connector Line */}
            {index < timeline.length - 1 && (
              <div
                className={`absolute left-5 top-12 w-0.5 h-full ${getConnectorColor(
                  event.type
                )}`}
              />
            )}

            {/* Event */}
            <div className="flex gap-4">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(
                  event.type
                )}`}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {event.description}
                    </h4>
                    {event.details && (
                      <p className="text-sm text-gray-600 mb-2">{event.details}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(event.timestamp)}</span>
                      {event.user && <span>• by {event.user}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Pending Status */}
        {credential.reviewStatus === 'PENDING_REVIEW' && (
          <div className="relative">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-600 mb-1">
                  Awaiting admin review
                </h4>
                <p className="text-sm text-gray-500">
                  Your credential is in the review queue. You'll receive an email
                  notification when it's been reviewed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Time */}
      {credential.reviewedAt && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total processing time:</span>
            <span className="font-medium text-gray-900">
              {Math.ceil(
                (new Date(credential.reviewedAt).getTime() -
                  new Date(credential.createdAt).getTime()) /
                  (1000 * 60 * 60)
              )}{' '}
              hours
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
