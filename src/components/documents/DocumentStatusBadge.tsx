import { DocumentStatus } from '@prisma/client';
import { getDocumentStatusColor, getStatusLabel } from '@/lib/documentHelpers';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export default function DocumentStatusBadge({ status, className = '' }: DocumentStatusBadgeProps) {
  const colors = getDocumentStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${className}`}
    >
      {label}
    </span>
  );
}
