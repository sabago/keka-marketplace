import { DocumentStatus } from '@prisma/client';

export function calculateDocumentStatus(expirationDate: Date | null): DocumentStatus {
  if (!expirationDate) return 'ACTIVE';
  const days = Math.floor((expirationDate.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export function getDocumentStatusColor(status: DocumentStatus): { bg: string; text: string } {
  switch (status) {
    case 'EXPIRED':      return { bg: 'bg-red-100',    text: 'text-red-800' };
    case 'EXPIRING_SOON':return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'ACTIVE':       return { bg: 'bg-green-100',  text: 'text-green-800' };
    case 'ARCHIVED':     return { bg: 'bg-gray-100',   text: 'text-gray-800' };
    default:             return { bg: 'bg-gray-100',   text: 'text-gray-800' };
  }
}

export function getStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case 'ACTIVE':        return 'Valid';
    case 'EXPIRING_SOON': return 'Expiring Soon';
    case 'EXPIRED':       return 'Expired';
    case 'ARCHIVED':      return 'Archived';
    default:              return status;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

export function getDaysUntilExpiration(expirationDate: Date | null): number | null {
  if (!expirationDate) return null;
  return Math.floor((new Date(expirationDate).getTime() - Date.now()) / 86400000);
}

/** Returns how many days ago a past expiration date was (positive = expired N days ago). */
export function getDaysExpired(expirationDate: Date | null): number | null {
  if (!expirationDate) return null;
  const days = Math.floor((Date.now() - new Date(expirationDate).getTime()) / 86400000);
  return days > 0 ? days : null;
}

/** Human-readable expiration message relative to today. */
export function formatExpirationMessage(expirationDate: Date | null): string {
  if (!expirationDate) return 'No expiration';
  const days = Math.floor((new Date(expirationDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 30) return `Expires in ${days} days`;
  return `Expires ${new Date(expirationDate).toLocaleDateString()}`;
}

/** Validate a file for upload. Returns { valid: true } or { valid: false, error: string }. */
export function validateFileUpload(
  file: File,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File must be a PDF or image (JPEG, PNG, WebP, GIF).' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File must be smaller than ${maxSizeMB} MB.` };
  }
  return { valid: true };
}
