'use client';

import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, FileText } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

interface AdminAction {
  id: string;
  actionType: string;
  admin: AdminUser;
  notes: string | null;
  details: any;
  createdAt: string | Date;
}

interface AuditLogViewerProps {
  actions: AdminAction[];
}

const actionTypeColors: Record<string, string> = {
  APPROVE_AGENCY: 'bg-green-100 text-green-800 border-green-300',
  REJECT_AGENCY: 'bg-red-100 text-red-800 border-red-300',
  SUSPEND_AGENCY: 'bg-orange-100 text-orange-800 border-orange-300',
  REACTIVATE_AGENCY: 'bg-blue-100 text-blue-800 border-blue-300',
  UPDATE_AGENCY: 'bg-purple-100 text-purple-800 border-purple-300',
};

const actionTypeIcons: Record<string, any> = {
  APPROVE_AGENCY: CheckCircle,
  REJECT_AGENCY: XCircle,
  SUSPEND_AGENCY: AlertTriangle,
  REACTIVATE_AGENCY: Shield,
  UPDATE_AGENCY: FileText,
};

const actionTypeLabels: Record<string, string> = {
  APPROVE_AGENCY: 'Approved',
  REJECT_AGENCY: 'Rejected',
  SUSPEND_AGENCY: 'Suspended',
  REACTIVATE_AGENCY: 'Reactivated',
  UPDATE_AGENCY: 'Updated',
};

export default function AuditLogViewer({ actions }: AuditLogViewerProps) {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(date);
  };

  if (actions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No audit log entries</p>
        <p className="text-gray-400 text-sm mt-2">
          Admin actions will appear here as they are performed
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-[#0B4F96] mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Audit Log ({actions.length})
          </h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Chronological history of all administrative actions
        </p>
      </div>

      {/* Timeline */}
      <div className="divide-y divide-gray-200">
        {actions.map((action, index) => {
          const Icon = actionTypeIcons[action.actionType] || FileText;
          const colorClass = actionTypeColors[action.actionType] || 'bg-gray-100 text-gray-800 border-gray-300';
          const label = actionTypeLabels[action.actionType] || action.actionType;

          return (
            <div key={action.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start">
                {/* Timeline Indicator */}
                <div className="flex flex-col items-center mr-4">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < actions.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2" style={{ minHeight: '20px' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded border ${colorClass}`}>
                        {label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500" title={formatDate(action.createdAt)}>
                      {formatRelativeTime(action.createdAt)}
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{action.admin.name || 'Admin'}</span>
                      <span className="text-gray-600"> ({action.admin.email})</span>
                    </p>
                  </div>

                  {/* Notes */}
                  {action.notes && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {action.notes}
                      </p>
                    </div>
                  )}

                  {/* Additional Details */}
                  {action.details && typeof action.details === 'object' && Object.keys(action.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View technical details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(action.details, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDate(action.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
