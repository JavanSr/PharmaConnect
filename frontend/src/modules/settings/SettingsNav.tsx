import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type SettingsNavItem = {
  label: string;
  path: string;
  roles?: Array<'OWNER' | 'PHARMACIST_IN_CHARGE' | 'SUPER_ADMIN'>;
};

const ITEMS: SettingsNavItem[] = [
  { label: 'Profile', path: '/settings/profile' },
  { label: 'Team', path: '/settings/team', roles: ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'] },
  { label: 'Subscription', path: '/settings/subscription', roles: ['OWNER', 'SUPER_ADMIN'] },
  { label: 'Features', path: '/settings/features', roles: ['OWNER', 'SUPER_ADMIN'] },
  { label: 'Data Review', path: '/settings/data-review', roles: ['OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'] },
  { label: 'Source Updates', path: '/settings/source-updates', roles: ['SUPER_ADMIN'] },
];

export const SettingsNav: React.FC = () => {
  const { hasRole } = useAuth();

  const visibleItems = ITEMS.filter((item) => !item.roles || hasRole(item.roles));

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#1A6B5C] text-white'
                : 'bg-white text-[#0D4035] border border-[#D6F0E8] hover:bg-[#EDF7F3]'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
};
