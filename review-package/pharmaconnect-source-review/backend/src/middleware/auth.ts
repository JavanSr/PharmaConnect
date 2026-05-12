import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { withPrismaRetry } from '../lib/prisma-retry';
import { normalizeRole, type AppRole, type KnownRole, type PharmacyAccessSnapshot } from '../types/roles';
import { resolveActiveMembership, resolveEffectiveScopedRole } from '../modules/auth/pharmacy-membership.service';

export interface VerifiedPicUser {
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedUserContext {
  userId: string;
  role: KnownRole;
  normalizedRole: AppRole;
  pharmacyId: string | null;
  pharmacy: (PharmacyAccessSnapshot & { id: string; name: string }) | null;
  email: string;
  picPinHash: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUserContext;
  orderScope?: {
    assignedPickerUserId?: string;
  };
  picVerifiedUser?: VerifiedPicUser;
}

export function hasRoleAccess(role: string | null | undefined, allowedRoles: string[]): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  if (normalizedRole === 'SUPER_ADMIN') {
    return true;
  }

  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  let payload: ReturnType<typeof verifyAccess>;

  try {
    payload = verifyAccess(token);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await withPrismaRetry(() => prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        pharmacyId: true,
        isActive: true,
        picPinHash: true,
      },
    }));

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const userRole = user.role as KnownRole;
    const baseRole = normalizeRole(userRole);
    if (!baseRole) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const membership = baseRole === 'SUPER_ADMIN'
      ? null
      : await resolveActiveMembership(user.id, payload.pharmacyId ?? user.pharmacyId, Boolean(payload.pharmacyId));

    if (!membership && baseRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'PHARMACY_MEMBERSHIP_REQUIRED' });
      return;
    }

    const effectiveRole = membership
      ? resolveEffectiveScopedRole(userRole, membership.role)
      : userRole;
    const normalizedRole = normalizeRole(effectiveRole);
    if (!normalizedRole) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = {
      userId: user.id,
      role: effectiveRole,
      normalizedRole,
      pharmacyId: membership?.pharmacyId ?? user.pharmacyId,
      pharmacy: membership?.pharmacy ?? null,
      email: user.email,
      picPinHash: user.picPinHash,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasRoleAccess(req.user.role, roles)) {
      res.status(403).json({ error: 'ROLE_INSUFFICIENT', allowedRoles: roles });
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
  if (req.user.normalizedRole === 'SUPER_ADMIN') {
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
