import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';
import { hasTierAccess, normalizeTier, type SupportedTier } from '../types/roles';
import { hasRoleAccess } from './auth';

const UPGRADE_URL = '/settings/subscription';

export function requireTier(required: SupportedTier) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.normalizedRole === 'SUPER_ADMIN') {
      next();
      return;
    }

    const current = normalizeTier(req.user.pharmacy?.subscriptionTier ?? null);
    if (current && hasTierAccess(current, required)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'TIER_INSUFFICIENT',
      current,
      required,
      upgradeUrl: UPGRADE_URL,
    });
  };
}

export function requireTierAndRole(requiredTier: SupportedTier, roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const current = normalizeTier(req.user.pharmacy?.subscriptionTier ?? null);
    if (!current || !hasTierAccess(current, requiredTier)) {
      res.status(403).json({
        error: 'TIER_INSUFFICIENT',
        current,
        required: requiredTier,
        upgradeUrl: UPGRADE_URL,
      });
      return;
    }

    if (!hasRoleAccess(req.user.role, roles)) {
      res.status(403).json({ error: 'ROLE_INSUFFICIENT', allowedRoles: roles });
      return;
    }

    next();
  };
}
