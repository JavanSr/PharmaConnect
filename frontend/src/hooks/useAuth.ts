import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

// Roles that can access each feature area
const ACCESS_MAP: Record<string, UserRole[]> = {
  cpd:        ['PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_SELLER', 'SUPER_ADMIN'],
  dispensing: ['PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_SELLER', 'SUPER_ADMIN'],
  compliance: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'SUPER_ADMIN'],
  team:       ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
  analytics:  ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'],
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

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  return { user, role, canAccess, hasRole };
}
