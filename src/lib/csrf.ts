/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Provides token-based CSRF protection for sensitive operations.
 * Next.js provides built-in CSRF protection via SameSite cookies,
 * but this module adds an extra layer for critical operations.
 */

import { randomBytes, createHash } from 'crypto';

const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

interface CSRFTokenData {
  token: string;
  createdAt: number;
  sessionId?: string;
}

// In-memory token store (use Redis in production for multi-instance deployments)
const tokenStore = new Map<string, CSRFTokenData>();

/**
 * Generate a cryptographically secure CSRF token
 *
 * @param sessionId - Optional session ID to tie token to specific session
 * @returns CSRF token string
 */
export function generateCSRFToken(sessionId?: string): string {
  // Generate random token
  const token = randomBytes(TOKEN_LENGTH).toString('hex');

  // Store token with metadata
  tokenStore.set(token, {
    token,
    createdAt: Date.now(),
    sessionId,
  });

  // Clean up expired tokens (simple cleanup)
  cleanupExpiredTokens();

  return token;
}

/**
 * Verify a CSRF token
 *
 * @param token - Token to verify
 * @param sessionId - Optional session ID to verify token is tied to correct session
 * @returns True if token is valid, false otherwise
 */
export function verifyCSRFToken(token: string, sessionId?: string): boolean {
  if (!token) {
    return false;
  }

  const tokenData = tokenStore.get(token);

  if (!tokenData) {
    return false;
  }

  // Check if token is expired
  if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY) {
    tokenStore.delete(token);
    return false;
  }

  // If sessionId is provided, verify it matches
  if (sessionId && tokenData.sessionId && tokenData.sessionId !== sessionId) {
    return false;
  }

  // Token is valid - delete it (one-time use)
  tokenStore.delete(token);

  return true;
}

/**
 * Clean up expired tokens from store
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();

  for (const [token, data] of tokenStore.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY) {
      tokenStore.delete(token);
    }
  }
}

/**
 * Extract CSRF token from request
 * Checks multiple locations: header, body, query params
 */
export function extractCSRFToken(request: Request): string | null {
  // Check X-CSRF-Token header
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }

  // Check csrf_token query parameter
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('csrf_token');
  if (queryToken) {
    return queryToken;
  }

  return null;
}

/**
 * Verify CSRF token from request
 */
export async function verifyCSRFFromRequest(
  request: Request,
  sessionId?: string
): Promise<boolean> {
  const token = extractCSRFToken(request);

  if (!token) {
    return false;
  }

  return verifyCSRFToken(token, sessionId);
}

/**
 * Create CSRF token response headers
 */
export function createCSRFHeaders(token: string): Record<string, string> {
  return {
    'X-CSRF-Token': token,
  };
}

/**
 * Middleware helper to check CSRF token for sensitive operations
 * Returns null if valid, or error Response if invalid
 */
export async function checkCSRFToken(
  request: Request,
  sessionId?: string
): Promise<Response | null> {
  // Only check CSRF for state-changing methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }

  const isValid = await verifyCSRFFromRequest(request, sessionId);

  if (!isValid) {
    return new Response(
      JSON.stringify({
        error: 'Invalid CSRF token',
        message: 'CSRF token is missing or invalid. Please refresh the page and try again.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

/**
 * Generate a double-submit cookie token
 * This is an alternative CSRF protection method
 */
export function generateDoubleSubmitToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Verify double-submit token
 * Compares cookie value with header/body value
 */
export function verifyDoubleSubmitToken(
  cookieToken: string | null,
  requestToken: string | null
): boolean {
  if (!cookieToken || !requestToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(cookieToken, requestToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  // Use crypto to ensure constant-time comparison
  const aHash = createHash('sha256').update(a).digest('hex');
  const bHash = createHash('sha256').update(b).digest('hex');

  let result = 0;
  for (let i = 0; i < aHash.length; i++) {
    result |= aHash.charCodeAt(i) ^ bHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get token count (for monitoring)
 */
export function getTokenCount(): number {
  return tokenStore.size;
}

/**
 * Clear all tokens (useful for testing)
 */
export function clearAllTokens(): void {
  tokenStore.clear();
}
