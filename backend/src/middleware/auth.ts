import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { withPrismaRetry } from '../lib/prisma-retry';
import { normalizeRole, type AppRole, type KnownRole, type PharmacyAccessSnapshot } from '../types/roles';
import { resolveEffectiveScopedRole } from '../modules/auth/pharmacy-membership.service';

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
  /** Set by enforceTrialRestrictions when the pharmacy is in grace mode (subscription lapsed). */
  graceMode?: boolean;
}

const authContextCacheTtlMs = Number(
  process.env.AUTH_CONTEXT_CACHE_TTL_MS ?? (process.env.NODE_ENV === 'test' ? 0 : 30_000),
);
const authContextCache = new Map<string, { expiresAt: number; user: AuthenticatedUserContext }>();

function authCacheKey(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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

  const cacheKey = authCacheKey(token);
  if (authContextCacheTtlMs > 0) {
    const cached = authContextCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      next();
      return;
    }
    if (cached) {
      authContextCache.delete(cacheKey);
    }
  }

  try {
    const now = new Date();
    const user = await withPrismaRetry(() => prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        pharmacyId: true,
        isActive: true,
        picPinHash: true,
        memberships: {
          where: {
            active: true,
            OR: [
              { validFrom: null },
              { validFrom: { lte: now } },
            ],
            AND: [
              {
                OR: [
                  { validUntil: null },
                  { validUntil: { gte: now } },
                ],
              },
            ],
          },
          select: {
            id: true,
            pharmacyId: true,
            role: true,
            validFrom: true,
            validUntil: true,
            pharmacy: {
              select: {
                id: true,
                name: true,
                pharmacyType: true,
                subscriptionTier: true,
                billingCycle: true,
                status: true,
                trialActive: true,
                trialEndsAt: true,
                isHybrid: true,
                hybridAddonActive: true,
                isActive: true,
                graceActivatedAt: true,
              },
            },
          },
          orderBy: [
            { createdAt: 'asc' },
            { pharmacy: { name: 'asc' } },
          ],
        },
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

    const tokenPharmacyId = payload.pharmacyId ?? null;
    const lastPharmacyId = user.pharmacyId ?? null;
    const membership =
      (tokenPharmacyId
        ? user.memberships.find((entry) => entry.pharmacyId === tokenPharmacyId)
        : null) ??
      (lastPharmacyId
        ? user.memberships.find((entry) => entry.pharmacyId === lastPharmacyId)
        : null) ??
      user.memberships[0] ??
      null;

    if ((!membership || (tokenPharmacyId && membership.pharmacyId !== tokenPharmacyId)) && baseRole !== 'SUPER_ADMIN') {
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

    const authContext: AuthenticatedUserContext = {
      userId: user.id,
      role: effectiveRole,
      normalizedRole,
      pharmacyId: membership?.pharmacyId ?? user.pharmacyId,
      pharmacy: membership?.pharmacy ?? null,
      email: user.email,
      picPinHash: user.picPinHash,
    };
    req.user = authContext;

    if (authContextCacheTtlMs > 0) {
      authContextCache.set(cacheKey, {
        user: authContext,
        expiresAt: Date.now() + authContextCacheTtlMs,
      });
    }

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
