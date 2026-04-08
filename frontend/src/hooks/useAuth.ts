import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  OWNER: 60,
  PHARMACIST_IN_CHARGE: 80,
  DISPENSER: 40,
  DATA_ENTRY_CLERK: 20,
  WHOLESALE_ADMIN: 30,
  WHOLESALE_SELLER: 25,
};

export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const canAccess = (resource: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;

    const permissions: Record<string, UserRole[]> = {
      inventory: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_ADMIN', 'WHOLESALE_SELLER'],
      analytics: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_ADMIN', 'WHOLESALE_SELLER'],
      compliance: ['OWNER', 'PHARMACIST_IN_CHARGE'],
      dispensing: ['PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_SELLER'],
      nhif: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER'],
      cpd: ['PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_SELLER'],
      knowledge: ['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER', 'DATA_ENTRY_CLERK', 'WHOLESALE_SELLER'],
      team: ['OWNER', 'PHARMACIST_IN_CHARGE'],
    };

    return permissions[resource]?.includes(user.role) ?? false;
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'PHARMACIST_IN_CHARGE' || user?.role === 'OWNER';

  return { user, isAuthenticated, isLoading, hasRole, canAccess, isAdmin };
}
