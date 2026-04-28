import type { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';
import {
  type AppRole,
  type PharmacyAccessSnapshot,
  type SupportedTier,
  WCS,
  WM,
  isHybrid,
  isWholesaleContext,
  normalizeRole,
} from '../types/roles';

type PermissionRoleToken = AppRole | 'WCS' | 'WM';

function resolvePermissionRole(token: PermissionRoleToken): AppRole {
  if (token === 'WCS') {
    return WCS;
  }

  if (token === 'WM') {
    return WM;
  }

  return token;
}

export const PERMISSIONS = {
  'inventory.view_products': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'CASHIER', 'WM', 'WCS', 'SUPER_ADMIN'],
  'inventory.manage_products': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DATA_ENTRY_CLERK', 'WM', 'SUPER_ADMIN'],
  'inventory.manage_stock': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WM', 'WCS', 'SUPER_ADMIN'],
  'inventory.view_reports': ['OWNER', 'PHARMACIST_IN_CHARGE', 'WM', 'SUPER_ADMIN'],
  'dispensing.access': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'CASHIER', 'SUPER_ADMIN'],
  'dispensing.apply_discount': ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
  'dispensing.void_sale': ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
  'dispensing.override_major_alert': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'SUPER_ADMIN'],
  'compliance.view': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WM', 'WCS', 'SUPER_ADMIN'],
  'compliance.manage': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DATA_ENTRY_CLERK', 'WM', 'WCS', 'SUPER_ADMIN'],
  'knowledge.view': ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'CASHIER', 'WM', 'WCS', 'DELIVERY_STAFF', 'SUPER_ADMIN'],
  'knowledge.manage': ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
  'analytics.view_dashboard': ['OWNER', 'PHARMACIST_IN_CHARGE', 'ACCOUNTANT', 'DISPENSER', 'WM', 'SUPER_ADMIN'],
  'analytics.view_financial_reports': ['OWNER', 'ACCOUNTANT', 'WM', 'SUPER_ADMIN'],
  'settings.manage_subscription': ['OWNER', 'SUPER_ADMIN'],
  'settings.manage_team': ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
  'wholesale.view_dashboard': ['OWNER', 'WM', 'SUPER_ADMIN'],
  'wholesale.view_catalogue_read_only': ['WCS'],
  'wholesale.manage_catalogue': ['OWNER', 'WM'],
  'wholesale.pick_order': ['WCS', 'WM'],
  'wholesale.confirm_delivery': ['WCS', 'WM', 'DELIVERY_STAFF'],
  'wholesale.set_credit_limits': ['OWNER', 'WM'],
  'wholesale.view_financial_reports': ['OWNER', 'WM'],
} as const satisfies Record<string, readonly PermissionRoleToken[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

function isWholesalePermission(permission: PermissionKey): boolean {
  return permission.startsWith('wholesale.');
}

export function hasPermission(
  role: string | null | undefined,
  permission: PermissionKey,
  pharmacy: PharmacyAccessSnapshot | null | undefined,
): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return false;
  }

  if (normalizedRole === 'SUPER_ADMIN') {
    return true;
  }

  if (isWholesalePermission(permission) && !isWholesaleContext(pharmacy)) {
    return false;
  }

  return PERMISSIONS[permission].some((token) => resolvePermissionRole(token) === normalizedRole);
}

export function requirePermission(permission: PermissionKey) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!hasPermission(req.user.role, permission, req.user.pharmacy)) {
      res.status(403).json({ error: 'ROLE_INSUFFICIENT', permission });
      return;
    }

    next();
  };
}

export function requireWholesaleContext(permission: PermissionKey) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!isWholesalePermission(permission)) {
      next();
      return;
    }

    if (!isWholesaleContext(req.user.pharmacy)) {
      res.status(403).json({ error: 'WHOLESALE_SCOPE_REQUIRED' });
      return;
    }

    next();
  };
}

export function applyWholesaleCounterStaffOrderFilter(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (req.user && normalizeRole(req.user.role) === WCS) {
    req.orderScope = { assignedPickerUserId: req.user.userId };
  }

  next();
}

export function canAccessHybridDashboards(
  role: string | null | undefined,
  pharmacy: PharmacyAccessSnapshot | null | undefined,
): { retail: boolean; wholesale: boolean } {
  const normalizedRole = normalizeRole(role);
  const retail = Boolean(normalizedRole);
  const wholesale =
    Boolean(normalizedRole) &&
    isHybrid(pharmacy) &&
    hasPermission(role, 'wholesale.view_dashboard', pharmacy);

  return { retail, wholesale };
}

export type MinimumTierPermission = {
  permission: PermissionKey;
  tier: SupportedTier;
};
