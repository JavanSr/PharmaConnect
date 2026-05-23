import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';

const SUBSCRIPTION_URL = '/settings/subscription';

function isSubscriptionException(req: AuthRequest): boolean {
  return req.baseUrl === '/api/v1/settings' && req.path === '/subscription';
}

export function enforceTrialRestrictions(req: AuthRequest, res: Response, next: NextFunction): void {
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

  if (pharmacy.isActive === false || pharmacy.status === 'SUSPENDED' || pharmacy.status === 'CANCELLED') {
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

  const trialEndedByDate = pharmacy.trialEndsAt ? new Date(pharmacy.trialEndsAt) < new Date() : false;
  const isTrialExpired = pharmacy.status === 'TRIAL' && (pharmacy.trialActive === false || trialEndedByDate);
  if (!isTrialExpired) {
    next();
    return;
  }

  if (isSubscriptionException(req)) {
    next();
    return;
  }

  res.status(402).json({
    error: 'TRIAL_EXPIRED',
    subscribeUrl: SUBSCRIPTION_URL,
  });
}
