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
  // APOTEKH never cuts a pharmacy off completely. The owner retains access to
  // three core areas permanently:
  //
  //   1. Dispensing  — operational survival: keep serving patients
  //   2. Inventory   — cannot dispense without knowing stock
  //   3. Analytics   — owner sees revenue; motivates renewal
  //
  // Grace restrictions:
  //   • Only the OWNER role may access the app. Other staff are locked out
  //     (GRACE_SINGLE_USER_LIMIT) until the subscription is renewed.
  //   • Even the owner is locked out of non-grace features
  //     (GRACE_FEATURE_LOCKED) — compliance, reports, wholesale, CPD, etc.
  //   • The frontend shows locked items in the sidebar with "Renew to unlock".
  //   • There is no hard paywall — the owner can always keep working.
  //
  const inGrace =
    pharmacy.status === 'GRACE' || isSubscriptionLapsed(pharmacy);

  if (inGrace) {
    // Subscription exception always passes through (owner needs to renew).
    if (isSubscriptionException(req)) {
      next();
      return;
    }

    const isOwner =
      req.user.role === 'OWNER' || req.user.normalizedRole === 'OWNER';

    // Non-owners are fully locked out.
    if (!isOwner) {
      res.status(402).json({
        error: 'GRACE_SINGLE_USER_LIMIT',
        message:
          "This pharmacy's subscription has lapsed. Only the account owner can access the system. Contact the pharmacy owner to renew.",
        subscribeUrl: SUBSCRIPTION_URL,
      });
      return;
    }

    // Owner is locked out of non-grace features.
    if (!isGraceAllowedPath(req)) {
      res.status(402).json({
        error: 'GRACE_FEATURE_LOCKED',
        message:
          'This feature is not available during grace access. Renew your subscription to unlock it.',
        subscribeUrl: SUBSCRIPTION_URL,
      });
      return;
    }

    // Owner on an allowed path — proceed with grace flag.
    req.graceMode = true;
    next();
    return;
  }

  next();
}
