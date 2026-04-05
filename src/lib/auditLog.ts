/**
 * Audit Logging System
 *
 * HIPAA-compliant audit logging for security and compliance tracking.
 * Logs all critical events without storing sensitive data (PHI, passwords, tokens).
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

/**
 * Event types that require audit logging
 */
export type AuditEventType =
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_deleted'
  | 'agency_created'
  | 'agency_updated'
  | 'agency_deleted'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'query_executed'
  | 'data_exported'
  | 'settings_changed'
  | 'password_changed'
  | 'password_reset_requested'
  | 'admin_action'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'permission_changed'
  | 'security_alert';

export interface AuditEventData {
  userId?: string;
  agencyId?: string;
  targetId?: string;
  targetType?: string;
  action?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  [key: string]: unknown;
}

interface AuditLogOptions {
  ip?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Hash an IP address for privacy compliance
 * Uses SHA-256 and returns only first 16 characters
 */
function hashIP(ip: string): string {
  if (!ip) return '';

  // Remove any IPv6 prefix
  const cleanIP = ip.replace(/^::ffff:/, '');

  // Hash the IP
  const hash = createHash('sha256')
    .update(cleanIP)
    .digest('hex');

  // Return first 16 characters for privacy
  return hash.substring(0, 16);
}

/**
 * Sanitize event data to prevent logging sensitive information
 */
function sanitizeEventData(data: AuditEventData): Record<string, unknown> {
  const sanitized = { ...data };

  // List of sensitive keys that should never be logged
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'encryptionKey',
    'encryption_key',
    'ssn',
    'socialSecurity',
    'creditCard',
    'credit_card',
    'cvv',
    'pin',
    'medicalRecord',
    'medical_record',
    'diagnosis',
    'prescription',
    'phi',
    'pii'
  ];

  // Recursively remove sensitive keys
  function removeSensitiveKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => removeSensitiveKeys(item));
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains any sensitive keyword
      const isSensitive = sensitiveKeys.some(sensitiveKey =>
        lowerKey.includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = removeSensitiveKeys(value);
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  return removeSensitiveKeys(sanitized);
}

/**
 * Log an audit event
 *
 * @param eventType - Type of event being logged
 * @param data - Event-specific data (will be sanitized)
 * @param options - Optional IP, user agent, and session information
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  data: AuditEventData,
  options: AuditLogOptions = {}
): Promise<void> {
  try {
    // Sanitize event data
    const sanitizedData = sanitizeEventData(data);

    // Hash IP address if provided
    const ipHash = options.ip ? hashIP(options.ip) : null;

    // Create audit log entry
    await prisma.eventLog.create({
      data: {
        eventType,
        eventData: sanitizedData as any,
        ipHash,
        userAgent: options.userAgent || null,
        sessionId: options.sessionId || null,
        agencyId: data.agencyId || null,
      },
    });
  } catch (error) {
    // Don't throw errors from audit logging to prevent disrupting application flow
    // But log to console for monitoring
    console.error('Failed to log audit event:', {
      eventType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Helper function to extract request metadata for audit logging
 */
export function getRequestMetadata(request: Request): AuditLogOptions {
  // Get IP address from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIP || 'unknown';

  // Get user agent
  const userAgent = request.headers.get('user-agent') || undefined;

  return {
    ip,
    userAgent,
  };
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  agencyId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.agencyId) {
    where.agencyId = filters.agencyId;
  }

  if (filters.eventType) {
    where.eventType = filters.eventType;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  return await prisma.eventLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: filters.limit || 100,
    skip: filters.offset || 0,
  });
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(agencyId?: string) {
  const where = agencyId ? { agencyId } : {};

  const [
    totalEvents,
    eventsByType,
    recentEvents,
  ] = await Promise.all([
    // Total event count
    prisma.eventLog.count({ where }),

    // Events grouped by type
    prisma.eventLog.groupBy({
      by: ['eventType'],
      where,
      _count: {
        eventType: true,
      },
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
    }),

    // Recent events (last 24 hours)
    prisma.eventLog.count({
      where: {
        ...where,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    totalEvents,
    eventsByType,
    recentEvents,
  };
}

/**
 * Delete old audit logs (for data retention compliance)
 * Default: Keep logs for 90 days
 */
export async function purgeOldAuditLogs(retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.eventLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
