import crypto from 'crypto';
import { type PharmacyMembershipRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { withPrismaRetry } from '../../lib/prisma-retry';
import { signAccess, signRefresh, type JwtPayload } from '../../lib/jwt';
import { isMembershipScopedRole, normalizeRole, type KnownRole, type PharmacyAccessSnapshot } from '../../types/roles';

const activeMembershipWhere = (userId: string) => ({
  userId,
  active: true,
  OR: [
    { validFrom: null },
    { validFrom: { lte: new Date() } },
  ],
  AND: [
    {
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ],
    },
  ],
});

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export type ActiveMembershipRecord = {
  id: string;
  pharmacyId: string;
  role: PharmacyMembershipRole;
  validFrom: Date | null;
  validUntil: Date | null;
  pharmacy: (PharmacyAccessSnapshot & { id: string; name: string }) | null;
};

export function mapUserRoleToMembershipRole(role: string): PharmacyMembershipRole {
  switch (role) {
    case 'OWNER':
      return 'OWNER';
    case 'PHARMACIST_IN_CHARGE':
      return 'PHARMACIST_IN_CHARGE';
    case 'DISPENSER':
      return 'DISPENSER';
    case 'WHOLESALE_MANAGER':
    case 'WHOLESALE_SELLER':
      return 'OWNER';
    case 'WHOLESALE_COUNTER_STAFF':
    case 'DELIVERY_STAFF':
    default:
      return 'DISPENSER';
  }
}

export async function listAccessiblePharmacies(userId: string) {
  return withPrismaRetry(() => prisma.pharmacyMembership.findMany({
    where: activeMembershipWhere(userId),
    orderBy: [
      { pharmacy: { name: 'asc' } },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      pharmacyId: true,
      role: true,
      active: true,
      validFrom: true,
      validUntil: true,
      pharmacy: {
        select: {
          id: true,
          name: true,
          licenceNumber: true,
          address: true,
          region: true,
          pharmacyType: true,
          subscriptionTier: true,
          billingCycle: true,
          status: true,
          trialActive: true,
          trialStartsAt: true,
          trialEndsAt: true,
          isHybrid: true,
          hybridAddonActive: true,
          vfdEnabled: true,
          userLimit: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  }));
}

export async function resolveActiveMembership(
  userId: string,
  preferredPharmacyId?: string | null,
  strictPreferred = false,
): Promise<ActiveMembershipRecord | null> {
  const memberships = await withPrismaRetry(() => prisma.pharmacyMembership.findMany({
    where: activeMembershipWhere(userId),
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
        },
      },
    },
    orderBy: [
      { createdAt: 'asc' },
      { pharmacy: { name: 'asc' } },
    ],
  }));

  if (!memberships.length) {
    return null;
  }

  if (preferredPharmacyId) {
    const preferred = memberships.find((membership) => membership.pharmacyId === preferredPharmacyId);
    if (preferred || strictPreferred) {
      return preferred ?? null;
    }
  }

  return memberships[0];
}

export function resolveEffectiveScopedRole(userRole: KnownRole, membershipRole: PharmacyMembershipRole): KnownRole {
  if (normalizeRole(userRole) === 'SUPER_ADMIN') {
    return userRole;
  }

  if (!isMembershipScopedRole(userRole)) {
    return userRole;
  }

  return membershipRole as KnownRole;
}

export async function issueAuthTokens(payload: JwtPayload) {
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh(payload);

  await withPrismaRetry(() => prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  }));

  return { accessToken, refreshToken };
}
