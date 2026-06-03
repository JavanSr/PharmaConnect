import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';

const SUBSCRIPTION_URL = '/settings/subscription';

// ── Grace-allowed route base URLs ─────────────────────────────────────────────
// In grace mode, only these API prefixes are accessible.
// Everything else returns GRACE_FEATURE_LOCKED.
//
// Rationale:
//   /dispensing   — pharmacy must keep serving patients (operational survival)
//   /inventory    — cannot dispense correctly without stock visibility
//   /analytics    — owner sees revenue: motivates renewal ("you earned X this month")
//   /patient-safety — drug interaction checks are part of the dispensing workflow
//   /settings     — owner must reach the subscription page to renew
//   /notifications — lightweight, needed for in-app alerts to function
const GRACE_ALLOWED_BASE_URLS = new Set([
  '/api/v1/dispensing',
  '/api/v1/inventory',
  '/api/v1/analytics',
  '/api/v1/patient-safety',
  '/api/v1/settings',
  '/api/v1/notifications',
]);

function isSubscriptionException(req: AuthRequest): boolean {
  return req.baseUrl === '/api/v1/settings' && req.path === '/subscription';
}

function isGraceAllowedPath(req: AuthRequest): boolean {
  if (isSubscriptionException(req)) return true;
  return GRACE_ALLOWED_BASE_URLS.has(req.baseUrl);
}

/**
 * Returns true when an ACTIVE pharmacy's paid subscription has lapsed.
 * APOTEKH reuses trialEndsAt to store paidUntil for paid subscriptions.
 */
function isSubscriptionLapsed(pharmacy: {
  status?: string | null;
  trialEndsAt?: Date | string | null;
}): boolean {
  if (pharmacy.status !== 'ACTIVE') return false;
  if (!pharmacy.trialEndsAt) return false;
  return new Date(pharmacy.trialEndsAt) < new Date();
}

export function enforceTrialRestrictions(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.normalizedRole === 'SUPER_ADMIN') {
    next();
    return;
  }

  const pharmacy = req.user.pharmacy;
  if (!pharmacy) {
    next();
    return;
  }

  // ── Hard blocks: explicitly suspended or cancelled ────────────────────────
  if (
    pharmacy.isActive === false ||
    pharmacy.status === 'SUSPENDED' ||
    pharmacy.status === 'CANCELLED'
  ) {
    if (isSubscriptionException(req)) {
      next();
      return;
    }
    res.status(403).json({
      error: 'PHARMACY_SUSPENDED',
      subscribeUrl: SUBSCRIPTION_URL,
    });
    return;
  }

  // ── Trial expired: ended without payment ─────────────────────────────────
  const trialEndedByDate = pharmacy.trialEndsAt
    ? new Date(pharmacy.trialEndsAt) < new Date()
    : false;
  const isTrialExpired =
    pharmacy.status === 'TRIAL' &&
    (pharmacy.trialActive === false || trialEndedByDate);

  if (isTrialExpired) {
    if (isSubscriptionException(req)) {
      next();
      return;
    }
    res.status(402).json({
      error: 'TRIAL_EXPIRED',
      subscribeUrl: SUBSCRIPTION_URL,
    });
    return;
  }

  // ── Grace Access Model ────────────────────────────────────────────────────
  //
  // A pharmacy enters grace when:
  //   (a) status is explicitly GRACE, OR
  //   (b) status is ACTIVE but the paid subscription has lapsed
  //
  // Grace lasts a maximum of 30 days. After that the pharmacy is hard-locked.
  // Grace start = graceActivatedAt if set, else trialEndsAt (paidUntil).
  //
  // During grace the owner retains access to: Dispensing, Inventory, Analytics.
  // Grace restrictions:
  //   • Only OWNER may access the app (GRACE_SINGLE_USER_LIMIT).
  //   • Owner locked out of non-grace features (GRACE_FEATURE_LOCKED).
  //
  const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

  const inGrace =
    pharmacy.status === 'GRACE' || isSubscriptionLapsed(pharmacy);

  if (inGrace) {
    if (isSubscriptionException(req)) {
      next();
      return;
    }

    // Enforce 30-day grace cap.
    const graceStart: Date | null = pharmacy.graceActivatedAt
      ? new Date(pharmacy.graceActivatedAt)
      : pharmacy.trialEndsAt
        ? new Date(pharmacy.trialEndsAt)
        : null;

    if (graceStart !== null && Date.now() - graceStart.getTime() > GRACE_PERIOD_MS) {
      res.status(402).json({
        error: 'GRACE_EXPIRED',
        message: 'Your 30-day grace period has ended. Renew your subscription to restore access.',
        subscribeUrl: SUBSCRIPTION_URL,
      });
      return;
    }

    const isOwner =
      req.user.role === 'OWNER' || req.user.normalizedRole === 'OWNER';

    if (!isOwner) {
      res.status(402).json({
        error: 'GRACE_SINGLE_USER_LIMIT',
        message:
          "This pharmacy's subscription has lapsed. Only the account owner can access the system. Contact the pharmacy owner to renew.",
        subscribeUrl: SUBSCRIPTION_URL,
      });
      return;
    }

    if (!isGraceAllowedPath(req)) {
      res.status(402).json({
        error: 'GRACE_FEATURE_LOCKED',
        message:
          'This feature is not available during grace access. Renew your subscription to unlock it.',
        subscribeUrl: SUBSCRIPTION_URL,
      });
      return;
    }

    req.graceMode = true;
    next();
    return;
  }

  next();
}
