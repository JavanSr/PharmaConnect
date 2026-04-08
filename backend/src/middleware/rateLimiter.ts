import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';
const loginWindowMs = 60 * 1000;
const loginMaxAttempts = isProduction ? 5 : 100;

/**
 * Strict rate limiter for login endpoint:
 * Production: max 5 failed attempts per minute per IP.
 * Development: relaxed to avoid blocking seeded demo-account testing.
 */
export const loginRateLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: loginMaxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 1 minute.',
    retryAfter: Math.ceil(loginWindowMs / 1000),
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Use X-Forwarded-For if behind a proxy, otherwise use req.ip
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  },
});

/**
 * General API rate limiter:
 * Max 100 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again shortly.',
    retryAfter: 60,
  },
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  },
});

export default { loginRateLimiter, apiRateLimiter };
