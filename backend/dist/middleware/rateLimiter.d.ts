/**
 * Strict rate limiter for login endpoint:
 * Production: max 5 failed attempts per minute per IP.
 * Development: relaxed to avoid blocking seeded demo-account testing.
 */
export declare const loginRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * General API rate limiter:
 * Max 100 requests per minute per IP.
 */
export declare const apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
declare const _default: {
    loginRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
    apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
};
export default _default;
//# sourceMappingURL=rateLimiter.d.ts.map