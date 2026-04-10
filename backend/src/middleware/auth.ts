import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/jwt.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    pharmacyId: string | null;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccess(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireSamePharmacy(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }
  const paramPharmacyId = req.params.pharmacyId;
  if (paramPharmacyId && paramPharmacyId !== req.user.pharmacyId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  next();
}
