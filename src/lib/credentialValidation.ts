/**
 * Credential Validation Schemas
 * Zod schemas for credential upload, update, review, and search operations
 */

import { z } from 'zod';
import { uuidSchema } from './validation';

// ============================================================================
// CREDENTIAL ENUMS
// ============================================================================

export const DocumentStatusEnum = z.enum([
  'ACTIVE',
  'EXPIRING_SOON',
  'EXPIRED',
  'MISSING',
  'ARCHIVED',
  'PENDING_REVIEW',
]);

export const ReviewStatusEnum = z.enum([
  'PENDING_UPLOAD',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_CORRECTION',
]);

export const ReminderTypeEnum = z.enum([
  'EXPIRING_SOON',
  'EXPIRED',
  'MISSING',
  'RENEWAL_DUE',
  'FOLLOW_UP',
]);

export const NotificationChannelEnum = z.enum(['EMAIL', 'SMS', 'IN_APP', 'WEBHOOK']);

// ============================================================================
// EMPLOYEE VALIDATION
// ============================================================================

export const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(200, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(200, 'Last name too long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\d\s\(\)\-\+]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  employeeNumber: z.string().max(100, 'Employee number too long').optional().or(z.literal('')),
  hireDate: z.coerce.date().optional(),
  department: z.string().max(200, 'Department name too long').optional().or(z.literal('')),
  position: z.string().max(200, 'Position too long').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).default('ACTIVE'),
  userId: uuidSchema.optional(), // Optional link to User account
});

export const UpdateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[\d\s\(\)\-\+]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  employeeNumber: z.string().max(100).optional().or(z.literal('')),
  hireDate: z.coerce.date().optional(),
  department: z.string().max(200).optional().or(z.literal('')),
  position: z.string().max(200).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).optional(),
});

// ============================================================================
// DOCUMENT TYPE VALIDATION
// ============================================================================

export const CreateDocumentTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Document type name is required')
    .max(200, 'Document type name too long'),
  description: z.string().max(2000, 'Description too long').optional().or(z.literal('')),
  expirationDays: z.number().int().min(1).max(3650).optional(), // Max 10 years
  reminderDays: z
    .array(z.number().int().min(0).max(365))
    .max(10, 'Too many reminder days')
    .default([30, 7]),
  isRequired: z.boolean().default(false),
  isGlobal: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const UpdateDocumentTypeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  expirationDays: z.number().int().min(1).max(3650).optional(),
  reminderDays: z.array(z.number().int().min(0).max(365)).max(10).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// CREDENTIAL UPLOAD & UPDATE VALIDATION
// ============================================================================

export const UploadCredentialSchema = z.object({
  employeeId: uuidSchema,
  documentTypeId: uuidSchema,
  issueDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  issuer: z.string().max(200, 'Issuer name too long').optional().or(z.literal('')),
  licenseNumber: z.string().max(100, 'License number too long').optional().or(z.literal('')),
  verificationUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(5000, 'Notes too long').optional().or(z.literal('')),
}).refine(
  (data) => {
    // If both dates provided, issue date must be before expiration date
    if (data.issueDate && data.expirationDate) {
      return data.issueDate < data.expirationDate;
    }
    return true;
  },
  {
    message: 'Issue date must be before expiration date',
    path: ['issueDate'],
  }
);

export const UpdateCredentialSchema = z.object({
  issueDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  issuer: z.string().max(200).optional().or(z.literal('')),
  licenseNumber: z.string().max(100).optional().or(z.literal('')),
  verificationUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
  status: DocumentStatusEnum.optional(),
}).refine(
  (data) => {
    // If both dates provided, issue date must be before expiration date
    if (data.issueDate && data.expirationDate) {
      return data.issueDate < data.expirationDate;
    }
    return true;
  },
  {
    message: 'Issue date must be before expiration date',
    path: ['issueDate'],
  }
);

// ============================================================================
// CREDENTIAL REVIEW VALIDATION
// ============================================================================

export const ReviewCredentialSchema = z.object({
  reviewStatus: ReviewStatusEnum,
  reviewNotes: z.string().max(5000, 'Review notes too long').optional().or(z.literal('')),
  correctedData: z
    .object({
      issuer: z.string().max(200).optional(),
      licenseNumber: z.string().max(100).optional(),
      issueDate: z.coerce.date().optional(),
      expirationDate: z.coerce.date().optional(),
    })
    .optional(),
});

// ============================================================================
// CREDENTIAL SEARCH & FILTER VALIDATION
// ============================================================================

export const SearchCredentialsSchema = z.object({
  // Filters
  status: DocumentStatusEnum.or(
    z.array(DocumentStatusEnum).min(1, 'At least one status required')
  ).optional(),
  reviewStatus: ReviewStatusEnum.optional(),
  credentialTypeId: uuidSchema.optional(),
  credentialTypeName: z.string().max(200).optional(),
  employeeId: uuidSchema.optional(),
  employeeName: z.string().max(400).optional(),
  department: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  expiringBefore: z.coerce.date().optional(),
  expiringAfter: z.coerce.date().optional(),
  includeArchived: z.boolean().default(false),
  includeInactiveEmployees: z.boolean().default(false),

  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),

  // Sorting
  orderBy: z
    .enum([
      'expirationDate',
      'createdAt',
      'updatedAt',
      'employeeName',
      'credentialType',
      'status',
    ])
    .default('expirationDate'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================================================
// REMINDER VALIDATION
// ============================================================================

export const SendReminderSchema = z.object({
  credentialId: uuidSchema,
  channel: NotificationChannelEnum.default('EMAIL'),
  customMessage: z.string().max(2000, 'Custom message too long').optional(),
});

export const BulkRemindSchema = z.object({
  filters: z.object({
    status: DocumentStatusEnum.or(z.array(DocumentStatusEnum)).optional(),
    credentialTypeId: uuidSchema.optional(),
    department: z.string().max(200).optional(),
    expiringWithinDays: z.number().int().min(0).max(365).optional(),
  }),
  reminderType: ReminderTypeEnum,
  channel: NotificationChannelEnum.default('EMAIL'),
  customMessage: z.string().max(2000).optional(),
});

// ============================================================================
// COMPLIANCE REPORTING VALIDATION
// ============================================================================

export const ComplianceDashboardSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  department: z.string().max(200).optional(),
  includeInactiveEmployees: z.boolean().default(false),
});

export const ComplianceSnapshotSchema = z.object({
  period: z
    .string()
    .max(50)
    .regex(/^\d{4}-(Q[1-4]|\d{2})$/, 'Period must be in format YYYY-QQ or YYYY-MM')
    .optional(),
  notes: z.string().max(5000).optional(),
});

// ============================================================================
// EXPORT VALIDATION
// ============================================================================

export const ExportCredentialsSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']).default('csv'),
  filters: SearchCredentialsSchema.omit({ page: true, limit: true, orderBy: true, order: true }),
  fields: z
    .array(
      z.enum([
        'employeeId',
        'employeeNumber',
        'employeeName',
        'email',
        'department',
        'position',
        'credentialType',
        'credentialId',
        'issueDate',
        'expirationDate',
        'status',
        'reviewStatus',
        'issuer',
        'licenseNumber',
        'verificationUrl',
        'isCompliant',
        'lastReminderSent',
        'uploadedAt',
      ])
    )
    .optional(), // If not provided, export all fields
});

// ============================================================================
// BULK OPERATIONS VALIDATION
// ============================================================================

export const BulkImportCredentialsSchema = z.object({
  dryRun: z.boolean().default(false), // Preview without saving
  overwriteExisting: z.boolean().default(false),
  autoApprove: z.boolean().default(false), // Skip review for imported credentials
  credentials: z
    .array(
      z.object({
        employeeNumber: z.string().max(100).optional(),
        employeeEmail: z.string().email().optional(),
        credentialTypeName: z.string().max(200),
        issueDate: z.coerce.date().optional(),
        expirationDate: z.coerce.date().optional(),
        issuer: z.string().max(200).optional(),
        licenseNumber: z.string().max(100).optional(),
      })
    )
    .min(1, 'At least one credential required')
    .max(1000, 'Maximum 1000 credentials per import'),
});

export const BulkUpdateStatusSchema = z.object({
  credentialIds: z
    .array(uuidSchema)
    .min(1, 'At least one credential ID required')
    .max(500, 'Maximum 500 credentials per bulk update'),
  status: DocumentStatusEnum,
  reviewStatus: ReviewStatusEnum.optional(),
  notes: z.string().max(5000).optional(),
});

// ============================================================================
// CREDENTIAL PARSING VALIDATION
// ============================================================================

export const ParsedCredentialDataSchema = z.object({
  credentialType: z.string().max(200).nullable(),
  issuer: z.string().max(200).nullable(),
  licenseNumber: z.string().max(100).nullable(),
  issuedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  confidence: z.number().min(0).max(1), // 0.0 to 1.0
  rawText: z.string().optional(),
});

export const TriggerParsingSchema = z.object({
  credentialId: uuidSchema,
  priority: z.number().int().min(0).max(10).default(0),
  expectedType: z.string().max(200).optional(), // Hint for the LLM
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate multipart form data for credential upload
 */
export function validateCredentialFormData(formData: FormData): {
  success: boolean;
  data?: {
    file: File;
    metadata: z.infer<typeof UploadCredentialSchema>;
  };
  errors?: string[];
} {
  const errors: string[] = [];

  // Validate file
  const file = formData.get('file') as File | null;
  if (!file) {
    errors.push('File is required');
  } else {
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size must be less than 10 MB');
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Only PDF, JPEG, and PNG files are allowed');
    }
  }

  // Validate metadata
  const metadataString = formData.get('metadata') as string | null;
  if (!metadataString) {
    errors.push('Metadata is required');
    return { success: false, errors };
  }

  try {
    const metadata = JSON.parse(metadataString);
    const result = UploadCredentialSchema.safeParse(metadata);

    if (!result.success) {
      const validationErrors = result.error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      errors.push(...validationErrors);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return {
      success: true,
      data: {
        file: file!,
        metadata: result.data!,
      },
    };
  } catch (error) {
    errors.push('Invalid JSON in metadata field');
    return { success: false, errors };
  }
}

/**
 * Validate dates are in correct order
 */
export function validateCredentialDates(
  issueDate: Date | null,
  expirationDate: Date | null
): { valid: boolean; error?: string } {
  if (!issueDate || !expirationDate) {
    return { valid: true }; // Optional dates
  }

  if (issueDate >= expirationDate) {
    return {
      valid: false,
      error: 'Issue date must be before expiration date',
    };
  }

  // Issue date shouldn't be in the future
  if (issueDate > new Date()) {
    return {
      valid: false,
      error: 'Issue date cannot be in the future',
    };
  }

  return { valid: true };
}

/**
 * Sanitize credential data before saving
 */
export function sanitizeCredentialData(data: {
  issuer?: string;
  licenseNumber?: string;
  verificationUrl?: string;
  notes?: string;
}): {
  issuer?: string;
  licenseNumber?: string;
  verificationUrl?: string;
  notes?: string;
} {
  return {
    issuer: data.issuer?.trim(),
    licenseNumber: data.licenseNumber?.trim().toUpperCase(), // Normalize license numbers
    verificationUrl: data.verificationUrl?.trim(),
    notes: data.notes?.trim(),
  };
}

/**
 * Validate search filters have at least one filter specified
 */
export function hasValidSearchFilters(filters: z.infer<typeof SearchCredentialsSchema>): boolean {
  const filterKeys: (keyof z.infer<typeof SearchCredentialsSchema>)[] = [
    'status',
    'reviewStatus',
    'credentialTypeId',
    'credentialTypeName',
    'employeeId',
    'employeeName',
    'department',
    'position',
    'expiringBefore',
    'expiringAfter',
  ];

  return filterKeys.some((key) => filters[key] !== undefined && filters[key] !== null);
}
