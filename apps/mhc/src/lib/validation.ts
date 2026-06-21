/**
 * Input Validation & Sanitization
 *
 * Comprehensive validation schemas using Zod for all user inputs.
 * Never trust user input - validate everything!
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

export const urlSchema = z.string().url('Invalid URL format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

// ============================================================================
// USER VALIDATION
// ============================================================================

export const CreateUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  role: z.enum(['AGENCY_USER', 'AGENCY_ADMIN', 'PLATFORM_ADMIN']).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: emailSchema.optional(),
  role: z.enum(['AGENCY_USER', 'AGENCY_ADMIN', 'PLATFORM_ADMIN']).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// AGENCY VALIDATION
// ============================================================================

// Tax ID validation (EIN format: XX-XXXXXXX)
export const taxIdSchema = z
  .string()
  .regex(
    /^\d{2}-\d{7}$/,
    'Tax ID must be in format XX-XXXXXXX (e.g., 12-3456789)'
  );

// US States for dropdown
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const;

// Agency Self-Registration Schema (Passwordless)
export const AgencySignupSchema = z.object({
  // Agency Information
  agencyName: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(200, 'Agency name too long'),
  licenseNumber: z
    .string()
    .min(3, 'License number is required')
    .max(100, 'License number too long'),
  taxId: taxIdSchema,

  // Address
  streetAddress: z
    .string()
    .min(5, 'Street address is required')
    .max(200, 'Street address too long'),
  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City name too long'),
  state: z.enum(US_STATES, { error: () => ({ message: 'Please select a valid US state' }) }),
  zipCode: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789'),

  // Contact Information
  phoneNumber: z
    .string()
    .regex(/^[\d\s\(\)\-\+]+$/, 'Invalid phone number format')
    .min(10, 'Phone number is required')
    .max(20, 'Phone number too long'),
  websiteUrl: z
    .string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),

  // Primary Contact
  contactName: z
    .string()
    .min(2, 'Contact name is required')
    .max(200, 'Name too long'),
  contactEmail: emailSchema,
  contactRole: z.enum(['AGENCY_ADMIN', 'AGENCY_USER'], {
    error: () => ({ message: 'Please select a role' }),
  }),

  // Optional Fields
  agencySize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
});

export const CreateAgencySchema = z.object({
  agencyName: z
    .string()
    .min(2, 'Agency name must be at least 2 characters')
    .max(200, 'Agency name too long'),
  licenseNumber: z
    .string()
    .regex(
      /^[A-Z]{2}-[A-Z]+-\d+$/,
      'License number format: XX-XXXX-1234 (e.g., MA-HCBS-12345)'
    ),
  servicesOffered: z
    .array(z.string())
    .min(1, 'Select at least one service')
    .max(20, 'Too many services'),
  serviceArea: z
    .array(z.string())
    .min(1, 'Select at least one service area')
    .max(100, 'Too many service areas'),
  agencySize: z.enum(['SMALL', 'MEDIUM', 'LARGE']),
  primaryContactName: z.string().min(2).max(200),
  primaryContactRole: z.string().min(2).max(100),
  primaryContactEmail: emailSchema,
  primaryContactPhone: phoneSchema,
  intakeMethod: z.enum(['PHONE', 'FAX', 'EMAIL', 'PORTAL', 'MANUAL_ENTRY']).optional(),
  avgReferralsPerMonth: z.number().int().min(0).max(10000).optional(),
  timeToProcessReferral: z.number().int().min(0).max(1440).optional(),
  staffHandlingIntake: z.number().int().min(0).max(1000).optional(),
  painPoints: z.array(z.string()).max(50).optional(),
  preferredChannels: z.array(z.string()).max(20).optional(),
  specializations: z.array(z.string()).max(50).optional(),
  consentToAnalytics: z.boolean().default(false),
  consentToProcessRecs: z.boolean().default(false),
});

export const UpdateAgencySchema = z.object({
  agencyName: z.string().min(2).max(200).optional(),
  servicesOffered: z.array(z.string()).min(1).max(20).optional(),
  serviceArea: z.array(z.string()).min(1).max(100).optional(),
  agencySize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  primaryContactName: z.string().min(2).max(200).optional(),
  primaryContactRole: z.string().min(2).max(100).optional(),
  primaryContactEmail: emailSchema.optional(),
  primaryContactPhone: phoneSchema,
  intakeMethod: z.enum(['PHONE', 'FAX', 'EMAIL', 'PORTAL', 'MANUAL_ENTRY']).optional(),
  avgReferralsPerMonth: z.number().int().min(0).max(10000).optional(),
  timeToProcessReferral: z.number().int().min(0).max(1440).optional(),
  staffHandlingIntake: z.number().int().min(0).max(1000).optional(),
  painPoints: z.array(z.string()).max(50).optional(),
  preferredChannels: z.array(z.string()).max(20).optional(),
  specializations: z.array(z.string()).max(50).optional(),
  consentToAnalytics: z.boolean().optional(),
  consentToProcessRecs: z.boolean().optional(),
});

// ============================================================================
// SUBSCRIPTION VALIDATION
// ============================================================================

export const UpdateSubscriptionSchema = z.object({
  planType: z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']),
  agencyId: uuidSchema,
});

export const CancelSubscriptionSchema = z.object({
  agencyId: uuidSchema,
  reason: z.string().min(1).max(1000).optional(),
  feedback: z.string().max(5000).optional(),
});

// ============================================================================
// CHATBOT QUERY VALIDATION
// ============================================================================

export const ChatbotQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(2000, 'Query too long (max 2000 characters)'),
  agencyId: uuidSchema,
  context: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// REFERRAL TRACKING VALIDATION
// ============================================================================

export const CreateReferralTrackingSchema = z.object({
  agencyId: uuidSchema,
  referralSourceSlug: z.string().min(1).max(200),
  submissionMethod: z.string().max(100).optional(),
  patientType: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateReferralTrackingSchema = z.object({
  status: z.enum(['SUBMITTED', 'RESPONDED', 'ACCEPTED', 'DECLINED', 'PATIENT_STARTED']),
  responseTime: z.number().int().min(0).optional(),
  accepted: z.boolean().optional(),
  patientStarted: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
});

// ============================================================================
// PRODUCT VALIDATION (Marketplace)
// ============================================================================

export const CreateProductSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().min(0).max(999999),
  categories: z.array(uuidSchema).min(1).max(10),
  tags: z.array(z.string()).max(20).optional(),
});

export const UpdateProductSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().min(0).max(999999).optional(),
  categories: z.array(uuidSchema).min(1).max(10).optional(),
  tags: z.array(z.string()).max(20).optional(),
});

// ============================================================================
// REVIEW VALIDATION
// ============================================================================

export const CreateReviewSchema = z.object({
  productId: uuidSchema,
  customerName: z.string().min(1).max(200),
  customerEmail: emailSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000),
});

// ============================================================================
// ORDER VALIDATION
// ============================================================================

export const CreateOrderSchema = z.object({
  customerEmail: emailSchema,
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1, 'Order must contain at least one item')
    .max(50, 'Too many items in order'),
});

// ============================================================================
// KNOWLEDGE BASE VALIDATION
// ============================================================================

export const CreateKnowledgeBaseArticleSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  title: z.string().min(1).max(500),
  state: z.string().length(2, 'State must be 2-letter code'),
  category: z.string().max(100).optional(),
  isOverview: z.boolean().default(false),
  tags: z.array(z.string()).max(20),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  published: z.boolean().default(true),
});

export const UpdateKnowledgeBaseArticleSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  title: z.string().min(1).max(500).optional(),
  state: z.string().length(2, 'State must be 2-letter code').optional(),
  category: z.string().max(100).optional(),
  isOverview: z.boolean().optional(),
  tags: z.array(z.string()).max(20).optional(),
  content: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  published: z.boolean().optional(),
});

// ============================================================================
// PAGINATION VALIDATION
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  orderBy: z.string().max(100).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// SEARCH VALIDATION
// ============================================================================

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.record(z.string(), z.unknown()).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  } catch (error) {
    return { success: false, errors: ['Invalid JSON in request body'] };
  }
}

/**
 * Validate URL query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  url: URL,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const params = Object.fromEntries(url.searchParams.entries());
    const result = schema.safeParse(params);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
  } catch (error) {
    return { success: false, errors: ['Invalid query parameters'] };
  }
}

/**
 * Sanitize HTML to prevent XSS attacks
 * For use with user-generated content
 */
export function sanitizeHTML(html: string): string {
  // Basic XSS prevention - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
}

/**
 * Validate and sanitize redirect URL
 * Prevents open redirect vulnerabilities
 */
export function sanitizeRedirectURL(url: string, allowedDomains: string[]): string | null {
  try {
    const parsedURL = new URL(url);

    // Check if domain is in allowed list
    if (allowedDomains.some((domain) => parsedURL.hostname.endsWith(domain))) {
      return parsedURL.toString();
    }

    return null;
  } catch {
    return null;
  }
}
