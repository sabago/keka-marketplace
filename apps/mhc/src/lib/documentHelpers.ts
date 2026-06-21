/**
 * Document Helper Utilities
 * Helper functions for document status calculation, formatting, and validation
 */

import { DocumentStatus } from '@prisma/client';

/**
 * Calculate document status based on expiration date
 */
export function calculateDocumentStatus(expirationDate: Date | null): DocumentStatus {
  if (!expirationDate) {
    return 'ACTIVE';
  }

  const now = new Date();
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 0) {
    return 'EXPIRED';
  } else if (daysUntilExpiration <= 30) {
    return 'EXPIRING_SOON';
  } else {
    return 'ACTIVE';
  }
}

/**
 * Get Tailwind color classes for document status
 */
export function getDocumentStatusColor(status: DocumentStatus): {
  bg: string;
  text: string;
  badge: string;
} {
  switch (status) {
    case 'EXPIRED':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        badge: 'bg-red-500',
      };
    case 'EXPIRING_SOON':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        badge: 'bg-yellow-500',
      };
    case 'ACTIVE':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        badge: 'bg-green-500',
      };
    case 'ARCHIVED':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        badge: 'bg-gray-500',
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        badge: 'bg-gray-500',
      };
  }
}

/**
 * Format expiration message based on expiration date
 */
export function formatExpirationMessage(expirationDate: Date | null): string {
  if (!expirationDate) {
    return 'No expiration';
  }

  const now = new Date();
  const daysUntilExpiration = Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiration < 0) {
    const daysExpired = Math.abs(daysUntilExpiration);
    return `Expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago`;
  } else if (daysUntilExpiration === 0) {
    return 'Expires today';
  } else if (daysUntilExpiration === 1) {
    return 'Expires tomorrow';
  } else if (daysUntilExpiration <= 30) {
    return `Expires in ${daysUntilExpiration} days`;
  } else {
    return `Expires ${expirationDate.toLocaleDateString()}`;
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Valid';
    case 'EXPIRING_SOON':
      return 'Expiring Soon';
    case 'EXPIRED':
      return 'Expired';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
}

/**
 * Filter documents by expiration window
 */
export function getUpcomingExpirations<T extends { expirationDate: Date | null }>(
  documents: T[],
  days: number
): T[] {
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(now.getDate() + days);

  return documents.filter((doc) => {
    if (!doc.expirationDate) return false;
    return doc.expirationDate >= now && doc.expirationDate <= threshold;
  });
}

/**
 * Filter expired documents
 */
export function getExpiredDocuments<T extends { expirationDate: Date | null }>(
  documents: T[]
): T[] {
  const now = new Date();
  return documents.filter((doc) => {
    if (!doc.expirationDate) return false;
    return doc.expirationDate < now;
  });
}

/**
 * Validate file for upload
 */
export function validateFileUpload(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB} MB`,
    };
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PDF, JPEG, and PNG files are allowed',
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') {
    return '📄';
  } else if (mimeType.startsWith('image/')) {
    return '🖼️';
  } else {
    return '📎';
  }
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: Date | null): number | null {
  if (!expirationDate) return null;

  const now = new Date();
  return Math.floor(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Calculate days expired
 */
export function getDaysExpired(expirationDate: Date | null): number | null {
  if (!expirationDate) return null;

  const now = new Date();
  const days = Math.floor(
    (now.getTime() - expirationDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return days > 0 ? days : null;
}

/**
 * Check if date is valid
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate date range (issue date before expiration date)
 */
export function validateDateRange(
  issueDate: Date | null,
  expirationDate: Date | null
): { valid: boolean; error?: string } {
  if (!issueDate || !expirationDate) {
    return { valid: true }; // Optional dates
  }

  if (!isValidDate(issueDate) || !isValidDate(expirationDate)) {
    return {
      valid: false,
      error: 'Invalid date format',
    };
  }

  if (issueDate >= expirationDate) {
    return {
      valid: false,
      error: 'Issue date must be before expiration date',
    };
  }

  return { valid: true };
}
