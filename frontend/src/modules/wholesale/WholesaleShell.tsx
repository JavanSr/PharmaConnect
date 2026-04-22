import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, ClipboardList, Settings } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

const ALLOWED_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'SUPER_ADMIN'];

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/wholesale', icon: <Building2 size={16} /> },
  { label: 'Orders', path: '/wholesale/orders', icon: <ClipboardList size={16} /> },
  { label: 'Settings', path: '/wholesale/settings', icon: <Settings size={16} /> },
];

export const canAccessWholesaleShell = (role: string | null | undefined) => Boolean(role && ALLOWED_ROLES.includes(role));

export const WholesaleShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const allowed = canAccessWholesaleShell(user?.role);

  if (!allowed) {
    return (
      <Card className="max-w-3xl">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B45309]">403</p>
          <h1 className="text-2xl font-semibold text-[#0D4035]">Wholesale access is restricted</h1>
          <p className="text-sm text-[#4B5563]">
            This area is reserved for wholesale operations roles. Retail workflows stay available, but wholesale pages stay protected.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#0D4035_0%,#176B56_55%,#CDEDE3_180%)] text-white" padding={false} shadow="md">
        <div className="grid gap-5 px-5 py-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Wholesale Operations</p>
            <h1 className="text-3xl font-semibold leading-tight">Separate wholesale workspace, shared platform backbone.</h1>
            <p className="max-w-2xl text-sm text-white/80">
              Orders, credit, delivery, invoicing, and demand signals now live under one wholesale workspace while still sharing the same auth, users, marketplace catalogue, and outlet data.
            </p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-semibold text-white">Shared with retail</p>
            <div className="mt-3 grid gap-2 text-sm text-white/80">
              <span>Authentication and outlet access</span>
              <span>Team and user records</span>
              <span>Marketplace and product data</span>
              <span>Audit trails and subscriptions</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/wholesale'}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[#1A6B5C] bg-[#1A6B5C] text-white'
                  : 'border-[#CDE7DE] bg-white text-[#0D4035] hover:bg-[#EDF7F3]'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>

      {children}
    </div>
  );
};
