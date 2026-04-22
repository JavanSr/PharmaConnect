import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

// Roles that can access each feature area
const ACCESS_MAP: Record<string, UserRole[]> = {
  dispensing: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'LOCUM', 'CASHIER', 'SUPER_ADMIN'],
  compliance: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'LOCUM', 'DATA_ENTRY_CLERK', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'SUPER_ADMIN'],
  team:       ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
  analytics:  ['OWNER', 'PHARMACIST_IN_CHARGE', 'ACCOUNTANT', 'SUPER_ADMIN'],
  wholesale:  ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'SUPER_ADMIN'],
  reports:    ['OWNER', 'PHARMACIST_IN_CHARGE', 'ACCOUNTANT', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'],
};

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;

  const canAccess = (feature: string): boolean => {
    if (!role) return false;
    if (role === 'SUPER_ADMIN') return true;
    const allowed = ACCESS_MAP[feature];
    if (!allowed) return true; // no restriction defined = open to all logged-in
    return allowed.includes(role);
  };

  const hasRole = (...rolesOrGroups: Array<UserRole | UserRole[]>): boolean => {
    if (!role) return false;
    const roles = rolesOrGroups.flat();
    return roles.includes(role);
  };

  return { user, role, canAccess, hasRole };
}
