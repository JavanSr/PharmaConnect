import type {
  BillingCycle,
  PharmacyMembershipRole,
  PharmacyAccountStatus,
  PharmacyType,
  SubscriptionTier,
  UserRole,
} from '@prisma/client';

export const APP_ROLES = [
  'SUPER_ADMIN',
  'OWNER',
  'PHARMACIST_IN_CHARGE',
  'DISPENSER',
  'CASHIER',
  'WHOLESALE_MANAGER',
  'WHOLESALE_COUNTER_STAFF',
  'DELIVERY_STAFF',
] as const satisfies readonly UserRole[];

export type AppRole = (typeof APP_ROLES)[number];
export type LegacyRole = 'WHOLESALE_SELLER';
export type KnownRole = AppRole | LegacyRole;

export const MEMBERSHIP_ROLES = [
  'OWNER',
  'PHARMACIST_IN_CHARGE',
  'DISPENSER',
] as const satisfies readonly PharmacyMembershipRole[];

export type ScopedMembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const WCS: AppRole = 'WHOLESALE_COUNTER_STAFF';
export const WM: AppRole = 'WHOLESALE_MANAGER';

export const ROLE_NORMALIZATION: Record<KnownRole, AppRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  PHARMACIST_IN_CHARGE: 'PHARMACIST_IN_CHARGE',
  DISPENSER: 'DISPENSER',
  CASHIER: 'CASHIER',
  WHOLESALE_MANAGER: 'WHOLESALE_MANAGER',
  WHOLESALE_COUNTER_STAFF: 'WHOLESALE_COUNTER_STAFF',
  DELIVERY_STAFF: 'DELIVERY_STAFF',
  WHOLESALE_SELLER: 'WHOLESALE_MANAGER',
};

export const SUPPORTED_TIERS = [
  'ADDO',
  'STANDARD',
  'PREMIUM',
  'WHOLESALE',
  'ENTERPRISE',
] as const;

export type SupportedTier = (typeof SUPPORTED_TIERS)[number];
export type KnownTier = SubscriptionTier | 'FREE' | 'ADDO_PLUS';

const TIER_RANK: Record<SupportedTier, number> = {
  ADDO: 1,
  STANDARD: 2,
  PREMIUM: 3,
  WHOLESALE: 4,
  ENTERPRISE: 5,
};

export type PharmacyAccessSnapshot = {
  pharmacyType?: PharmacyType | null;
  subscriptionTier?: SubscriptionTier | null;
  billingCycle?: BillingCycle | null;
  status?: PharmacyAccountStatus | null;
  trialActive?: boolean | null;
  trialEndsAt?: Date | string | null;
  isHybrid?: boolean | null;
  isActive?: boolean | null;
};

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) {
    return null;
  }

  return ROLE_NORMALIZATION[role as KnownRole] ?? null;
}

export function isMembershipScopedRole(role: string | null | undefined): role is ScopedMembershipRole {
  return Boolean(role && MEMBERSHIP_ROLES.includes(role as ScopedMembershipRole));
}

export function normalizeTier(tier: string | null | undefined): SupportedTier | null {
  switch (tier) {
    case 'FREE':
    case 'ADDO':
    case 'ADDO_PLUS':
      return 'ADDO';
    case 'STANDARD':
    case 'PREMIUM':
    case 'WHOLESALE':
    case 'ENTERPRISE':
      return tier;
    default:
      return null;
  }
}

export function hasTierAccess(current: string | null | undefined, required: SupportedTier): boolean {
  const normalizedCurrent = normalizeTier(current);
  if (!normalizedCurrent) {
    return false;
  }

  return TIER_RANK[normalizedCurrent] >= TIER_RANK[required];
}

export function isHybrid(pharmacy: PharmacyAccessSnapshot | null | undefined): boolean {
  return Boolean(pharmacy?.isHybrid);
}

export function isWholesaleContext(pharmacy: PharmacyAccessSnapshot | null | undefined): boolean {
  if (!pharmacy) {
    return false;
  }

  return pharmacy.pharmacyType === 'WHOLESALE' || isHybrid(pharmacy);
}
