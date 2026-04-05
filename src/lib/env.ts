/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at application startup.
 * Prevents runtime errors due to missing configuration.
 */

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

/**
 * Optional but recommended environment variables
 */
const recommendedEnvVars = [
  'ENCRYPTION_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_ENVIRONMENT',
  'PINECONE_INDEX_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL',
] as const;

interface ValidationResult {
  valid: boolean;
  missing: string[];
  missingRecommended: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const missingRecommended: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check recommended variables
  for (const envVar of recommendedEnvVars) {
    if (!process.env[envVar]) {
      missingRecommended.push(envVar);
    }
  }

  // Validate specific formats
  if (process.env.DATABASE_URL && !isValidDatabaseURL(process.env.DATABASE_URL)) {
    warnings.push('DATABASE_URL format may be invalid');
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    warnings.push('NEXTAUTH_SECRET should be at least 32 characters long');
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
    warnings.push('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)');
  }

  if (process.env.NEXTAUTH_URL && !isValidURL(process.env.NEXTAUTH_URL)) {
    warnings.push('NEXTAUTH_URL should be a valid URL');
  }

  // Check for common mistakes
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      warnings.push('NEXTAUTH_URL should not contain localhost in production');
    }

    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('ENCRYPTION_KEY is highly recommended for production');
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      warnings.push('Redis configuration missing - rate limiting will be disabled');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    missingRecommended,
    warnings,
  };
}

/**
 * Validate and throw error if required env vars are missing
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  if (!result.valid) {
    const errorMessage = [
      'Missing required environment variables:',
      ...result.missing.map((v) => `  - ${v}`),
      '',
      'Please add these variables to your .env file.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('Environment variable warnings:');
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  // Log missing recommended vars
  if (result.missingRecommended.length > 0) {
    console.info('Missing recommended environment variables:');
    result.missingRecommended.forEach((v) => console.info(`  - ${v}`));
    console.info('Some features may be disabled without these variables.');
  }
}

/**
 * Check if DATABASE_URL is valid
 */
function isValidDatabaseURL(url: string): boolean {
  // Check for common database URL patterns
  return (
    url.startsWith('postgresql://') ||
    url.startsWith('postgres://') ||
    url.startsWith('mysql://') ||
    url.startsWith('mongodb://') ||
    url.startsWith('sqlite://')
  );
}

/**
 * Check if URL is valid
 */
function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get environment type
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV;

  if (env === 'production') return 'production';
  if (env === 'test') return 'test';
  return 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

/**
 * Get required env var or throw error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value;
}

/**
 * Get optional env var with default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get numeric env var
 */
export function getNumericEnv(key: string, defaultValue: number): number {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.warn(`Environment variable ${key} is not a valid number, using default: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
}

/**
 * Get boolean env var
 */
export function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];

  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check feature flags
 */
export const featureFlags = {
  encryptionEnabled: () => !!process.env.ENCRYPTION_KEY,
  rateLimitingEnabled: () => !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  stripeEnabled: () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY),
  openAIEnabled: () => !!process.env.OPENAI_API_KEY,
  pineconeEnabled: () => !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME),
  s3Enabled: () => !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME),
  emailEnabled: () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
};

/**
 * Get configuration summary
 */
export function getConfigSummary() {
  return {
    environment: getEnvironment(),
    features: {
      encryption: featureFlags.encryptionEnabled(),
      rateLimiting: featureFlags.rateLimitingEnabled(),
      stripe: featureFlags.stripeEnabled(),
      openAI: featureFlags.openAIEnabled(),
      pinecone: featureFlags.pineconeEnabled(),
      s3: featureFlags.s3Enabled(),
      email: featureFlags.emailEnabled(),
    },
    validation: validateEnv(),
  };
}

// Validate environment on module load (only in production)
if (isProduction() && typeof window === 'undefined') {
  try {
    validateEnvOrThrow();
  } catch (error) {
    console.error('Environment validation failed:', error);
    // Don't throw in production to allow graceful degradation
  }
}
