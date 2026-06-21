/**
 * Rate Limiting Configuration
 *
 * Prevents abuse and protects against brute force attacks.
 * Uses Upstash Redis for distributed rate limiting.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if Redis is configured
const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

/**
 * Create rate limiters for different endpoints
 */

// Chatbot API: 50 requests per hour per IP
export const chatbotRateLimit = isRedisConfigured()
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(50, '1 h'),
      analytics: true,
      prefix: '@ratelimit/chatbot',
    })
  : null;

// Auth signin: 5 attempts per 15 minutes per IP
export const authRateLimit = isRedisConfigured()
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: '@ratelimit/auth',
    })
  : null;

// Agency API: 100 requests per hour per agency
export const agencyRateLimit = isRedisConfigured()
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '1 h'),
      analytics: true,
      prefix: '@ratelimit/agency',
    })
  : null;

// General API: 200 requests per hour per IP
export const generalRateLimit = isRedisConfigured()
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(200, '1 h'),
      analytics: true,
      prefix: '@ratelimit/general',
    })
  : null;

// Admin actions: 50 requests per hour per user
export const adminRateLimit = isRedisConfigured()
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(50, '1 h'),
      analytics: true,
      prefix: '@ratelimit/admin',
    })
  : null;

/**
 * Get IP address from request
 */
export function getIP(request: Request): string {
  // Try various headers that proxies might set
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Parse forwarded-for header (contains comma-separated list)
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  return cfConnectingIP || realIP || '127.0.0.1';
}

/**
 * Check rate limit and return appropriate response
 */
export async function checkRateLimit(
  ratelimit: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // If rate limiting is not configured, allow all requests
  if (!ratelimit) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }

  try {
    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // If rate limiting fails, log error but allow request
    console.error('Rate limit check failed:', error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };
}

/**
 * Create 429 Too Many Requests response
 */
export function createRateLimitResponse(
  reset: number,
  limit: number,
  remaining: number
): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...createRateLimitHeaders(limit, remaining, reset),
      },
    }
  );
}
