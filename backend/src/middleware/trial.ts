import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';

const SUBSCRIPTION_URL = '/settings/subscription';

function isInventoryReadOnlyException(req: AuthRequest): boolean {
  return req.method === 'GET' && req.baseUrl === '/api/v1/inventory' && req.path.startsWith('/products');
}

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

  const isTrialExpired = pharmacy.status === 'TRIAL' && pharmacy.trialActive === false;
  if (!isTrialExpired) {
    next();
    return;
  }

  if (isSubscriptionException(req) || isInventoryReadOnlyException(req)) {
    next();
    return;
  }

  res.status(402).json({
    error: 'TRIAL_EXPIRED',
    subscribeUrl: SUBSCRIPTION_URL,
  });
}
