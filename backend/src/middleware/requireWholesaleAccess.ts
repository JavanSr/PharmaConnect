import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

/**
 * Wholesale access gate — must pass BOTH a role AND a tier check.
 *
 * Passes only if:
 *   role === 'WHOLESALE_MANAGER'
 *   OR (role === 'OWNER' AND subscriptionTier === 'WHOLESALE')
 *
 * B2B buyer routes (ordering from wholesalers) additionally require isVerified.
 *
 * A retail OWNER on ADDO/BASIC/STANDARD/PREMIUM receives 403 — they have
 * no read or write access to any /wholesale/* or /b2b/* route.
 *
 * SUPER_ADMIN bypasses this check entirely.
 *
 * DELIVERY_STAFF and WHOLESALE_COUNTER_STAFF have narrower per-route checks
 * on top of this base gate — apply requireWholesaleAccess first, then those.
 */
export function requireWholesaleAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const role = req.user?.normalizedRole ?? req.user?.role;
  const tier = req.user?.pharmacy?.subscriptionTier as string | undefined;

  if (role === 'SUPER_ADMIN') {
    return next();
  }

  const allowed =
    role === 'WHOLESALE_MANAGER' ||
    (role === 'OWNER' && tier === 'WHOLESALE');

  if (!allowed) {
    return res.status(403).json({
      error: 'Forbidden: wholesale access requires WHOLESALE tier or WHOLESALE_MANAGER role.',
    });
  }

  return next();
}

/**
 * Requires the pharmacy to be verified (FIN number on record) before
 * accessing B2B buyer ordering routes. Wholesale sellers are exempt —
 * they control the catalogue, not buying from it.
 */
export function requireVerified(req: AuthRequest, res: Response, next: NextFunction) {
  const role = req.user?.normalizedRole ?? req.user?.role;

  if (role === 'SUPER_ADMIN') return next();

  const isVerified = (req.user?.pharmacy as any)?.isVerified;

  if (!isVerified) {
    return res.status(403).json({
      error: 'PHARMACY_UNVERIFIED',
      message: 'Enter your TMDA Facility Identification Number (FIN) in Settings to access wholesale ordering.',
    });
  }

  return next();
}
