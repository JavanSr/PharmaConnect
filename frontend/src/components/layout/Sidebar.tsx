import React, { useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Package, Shield, Pill,
  Lock, ChevronLeft, ChevronRight, Settings, LogOut, BarChart3, FileBarChart2,
  ClipboardList, Users,
  Building2, X, Telescope, ExternalLink, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { Badge } from '@/components/ui/Badge';
import type { UserRole } from '@/types';

type RetailTier = 'ADDO' | 'BASIC' | 'STANDARD' | 'PREMIUM' | 'WHOLESALE' | 'ENTERPRISE';

// Higher number = higher tier. SUPER_ADMIN bypasses all tier checks.
const TIER_LEVEL: Record<string, number> = {
  ADDO: 0,
  BASIC: 1,
  STANDARD: 2,
  PREMIUM: 3,
  WHOLESALE: 4,
  ENTERPRISE: 5,
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  /** Whether this item is accessible during grace mode (subscription lapsed). */
  graceAllowed?: boolean;
  /** Minimum subscription tier required to see this item (retail hierarchy). SUPER_ADMIN bypasses. */
  minTier?: RetailTier;
}

const phase1Nav: NavItem[] = [
  // ── Primary daily operations ─────────────────────────────────────────────────
  { label: 'Dashboard',         path: '/dashboard',         icon: <LayoutDashboard size={18} /> },
  { label: 'Dispensing',        path: '/dispensing',        icon: <Pill size={18} />,        roles: ['OWNER','PHARMACIST_IN_CHARGE','DISPENSER','CASHIER','SUPER_ADMIN'], graceAllowed: true },
  { label: 'Inventory',         path: '/inventory',         icon: <Package size={18} />,     graceAllowed: true },
  { label: 'Compliance',        path: '/compliance',        icon: <Shield size={18} />,      roles: ['OWNER','PHARMACIST_IN_CHARGE','DISPENSER','SUPER_ADMIN'] },
  // ── Analytics & reporting ────────────────────────────────────────────────────
  { label: 'Analytics',         path: '/analytics',         icon: <BarChart3 size={18} />,      graceAllowed: true },
  { label: 'Reports',           path: '/reports',           icon: <FileBarChart2 size={18} />,  roles: ['OWNER','PHARMACIST_IN_CHARGE','CASHIER','WHOLESALE_MANAGER','SUPER_ADMIN'] },
  { label: 'Forecasting',       path: '/forecasting',       icon: <TrendingUp size={18} />,  roles: ['OWNER','PHARMACIST_IN_CHARGE','SUPER_ADMIN'], minTier: 'PREMIUM' },
  // ── Knowledge ────────────────────────────────────────────────────────────────
  { label: 'Knowledge Hub',     path: '/knowledge',         icon: <BookOpen size={18} /> },
  // ── Team ─────────────────────────────────────────────────────────────────────
  { label: 'Staff Activity',    path: '/staff-activity',    icon: <Users size={18} />,       roles: ['OWNER','PHARMACIST_IN_CHARGE'], minTier: 'BASIC' },
  // ── Wholesale (hidden from pure retail) ──────────────────────────────────────
  { label: 'Wholesale',         path: '/wholesale',         icon: <Building2 size={18} />,   roles: ['OWNER','WHOLESALE_MANAGER','WHOLESALE_COUNTER_STAFF','DELIVERY_STAFF','SUPER_ADMIN'] },
  { label: 'Orders',            path: '/wholesale/orders',  icon: <ClipboardList size={18} />, roles: ['OWNER','WHOLESALE_MANAGER','WHOLESALE_COUNTER_STAFF','DELIVERY_STAFF','SUPER_ADMIN'] },
  { label: 'Founder',           path: '/founder',           icon: <Telescope size={18} />,   roles: ['SUPER_ADMIN'] },
];

const founderNav: NavItem[] = [
  { label: 'Founder Dashboard', path: '/founder', icon: <LayoutDashboard size={18} />, roles: ['SUPER_ADMIN'] },
];

// Paths accessible during grace. Must mirror GRACE_ALLOWED_BASE_URLS in trial.ts.
const GRACE_ALLOWED_PATHS = new Set(['/dispensing', '/inventory', '/analytics']);

function isGracePath(path: string): boolean {
  return (
    GRACE_ALLOWED_PATHS.has(path) ||
    [...GRACE_ALLOWED_PATHS].some((p) => path.startsWith(`${p}/`))
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Whether the pharmacy is currently in grace mode (subscription lapsed). */
  inGrace?: boolean;
  /** Desktop-only: hide the sidebar completely (user toggled it off). */
  hiddenOnDesktop?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  inGrace = false,
  hiddenOnDesktop = false,
}) => {
  const { user, logout } = useAuthStore();
  const { pharmacy } = usePharmacyStore();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!navRef.current) return;
    const items = Array.from(
      navRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
    const current = document.activeElement as HTMLElement;
    const idx = items.indexOf(current);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  // ── Normal nav item ────────────────────────────────────────────────────────
  const NavItemEl: React.FC<{ item: NavItem }> = ({ item }) => {
    const active = checkActive(item.path);
    return (
      <Link
        to={item.path}
        className={`flex min-h-touch-target-min items-center gap-3 rounded-full px-3 py-2.5 transition-colors ${
          active
            ? 'bg-primary text-white font-semibold'
            : 'text-on-surface-variant hover:bg-[#D6F0E8] hover:text-[#0D4035]'
        }`}
        onClick={() => onClose()}
      >
        {item.icon}
        {!collapsed && (
          <>
            <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
            {active && (
              <span className="w-2 h-2 shrink-0 rounded-full bg-[#E8A020]" aria-hidden="true" />
            )}
          </>
        )}
      </Link>
    );
  };

  // ── Locked nav item — shown for non-grace features during grace mode ───────
  const LockedNavItemEl: React.FC<{ item: NavItem }> = ({ item }) => (
    <div
      title={collapsed ? `${item.label} — Renew to unlock` : undefined}
      className="group relative flex min-h-touch-target-min items-center gap-3 rounded-full px-3 py-2.5 cursor-not-allowed select-none opacity-40"
      aria-disabled="true"
      role="presentation"
    >
      <span className="shrink-0">{item.icon}</span>

      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium truncate text-on-surface-variant line-through">
            {item.label}
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
            <Lock size={9} />
            Grace
          </span>
        </>
      )}

      {/* Tooltip: collapsed sidebar */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 z-50 hidden whitespace-nowrap rounded-lg bg-surface-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant shadow-md group-hover:flex">
          {item.label} — Renew to unlock
        </div>
      )}

      {/* Tooltip: expanded sidebar */}
      {!collapsed && (
        <div className="pointer-events-none absolute left-3 right-3 top-full mt-0.5 z-50 hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-sm group-hover:block">
          <span className="font-semibold">Renew to unlock.</span>{' '}
          Settings → Subscription.
        </div>
      )}
    </div>
  );

  // ── Wholesale-only nav ────────────────────────────────────────────────────
  const WHOLESALE_ALLOWED_PATHS = new Set([
    '/dashboard', '/wholesale', '/wholesale/orders', '/inventory',
    '/analytics', '/reports', '/settings', '/notifications',
  ]);
  const isWholesalePharmacy = pharmacy?.pharmacyType === 'WHOLESALE';

  // ── Tier check helper ─────────────────────────────────────────────────────
  const currentTierLevel = TIER_LEVEL[pharmacy?.subscriptionTier ?? 'ADDO'] ?? 0;
  const tierAllowed = (item: NavItem) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (!item.minTier) return true;
    return currentTierLevel >= (TIER_LEVEL[item.minTier] ?? 0);
  };

  // ── Filter nav items ───────────────────────────────────────────────────────
  const visiblePhase1Nav = phase1Nav.filter((item) => {
    // Pure wholesale pharmacies: only wholesale-relevant nav
    if (isWholesalePharmacy && user?.role !== 'SUPER_ADMIN') {
      return WHOLESALE_ALLOWED_PATHS.has(item.path) || item.path.startsWith('/wholesale');
    }

    if (inGrace && user?.role === 'OWNER') {
      const ownerAllowed =
        !item.roles ||
        item.roles.includes('OWNER') ||
        item.roles.includes('SUPER_ADMIN') ||
        item.graceAllowed;
      return ownerAllowed;
    }

    const roleAllowed =
      !item.roles || (user?.role && item.roles.includes(user.role as UserRole));
    if (!roleAllowed) return false;

    // Wholesale nav items (path starts with /wholesale) are only for
    // wholesale or hybrid pharmacies — never shown to pure retail.
    if (
      item.path.startsWith('/wholesale') &&
      !isWholesalePharmacy &&
      !pharmacy?.isHybrid &&
      user?.role !== 'SUPER_ADMIN'
    ) return false;

    // Tier gate: hide items the current subscription doesn't include
    if (!tierAllowed(item)) return false;

    if (item.path === '/cpd') {
      return (
        pharmacy?.subscriptionTier !== 'WHOLESALE' &&
        pharmacy?.subscriptionTier !== 'ADDO'
      );
    }

    return true;
  });


  // ── Founder sidebar (SUPER_ADMIN only) ────────────────────────────────────
  const FounderSidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-[#1a3328] ${collapsed ? 'justify-center' : ''}`}>
        <img
          src="/assets/logo/apotekh-mark-dark.svg"
          alt="APOTEKH"
          className="w-9 h-9 shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">
              <span className="text-[#7ECFB4]">APOTEK</span>
              <span className="text-[#E8A020]">H</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4B7B6A]">
              Platform Admin
            </p>
          </div>
        )}
      </div>

      {/* Single CTA */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 gap-4">
        <a
          href="/superadmin"
          className="flex items-center gap-2.5 w-full rounded-xl px-4 py-3 bg-[#1A6B5C] text-white text-sm font-semibold hover:bg-[#145748] transition-colors"
        >
          <Telescope size={16} className="shrink-0" />
          {!collapsed && <span className="flex-1">Platform Admin</span>}
          {!collapsed && <ExternalLink size={13} className="opacity-60" />}
        </a>
        {!collapsed && (
          <p className="text-center text-[11px] text-[#4B7B6A] leading-relaxed px-2">
            You are logged in as APOTEKH founder. Your workspace is the Platform Admin panel.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a3328] p-3 space-y-1">
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#1A6B5C] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#7ECFB4] truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-[#4B7B6A] font-semibold uppercase tracking-wider">Founder</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-full text-[#4B7B6A] hover:text-[#7ECFB4] hover:bg-[#1a3328] transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-outline-variant/30 ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <img
          src="/assets/logo/apotekh-mark-light.svg"
          alt="APOTEKH"
          className="w-9 h-9 shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">
              <span className="text-on-surface">APOTEK</span>
              <span className="text-[#E8A020]">H</span>
            </p>
            <p className="text-label-md text-on-surface-variant truncate">
              {pharmacy?.name || 'Loading...'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        onKeyDown={handleKeyDown}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1 no-scrollbar"
      >
        {visiblePhase1Nav.map((item) => {
          // Dashboard always accessible
          if (item.path === '/dashboard') return <NavItemEl key={item.path} item={item} />;
          // In grace: lock non-grace items
          if (inGrace && !isGracePath(item.path)) {
            return <LockedNavItemEl key={item.path} item={item} />;
          }
          return <NavItemEl key={item.path} item={item} />;
        })}

        {founderNav
          .filter(
            (item) =>
              !item.roles ||
              (user?.role && item.roles.includes(user.role as UserRole)),
          )
          .map((item) => <NavItemEl key={item.path} item={item} />)}
      </nav>

      {/* User Footer */}
      <div className="border-t border-outline-variant/30 p-3 space-y-1">
        <Link
          to="/settings/profile"
          className="flex min-h-touch-target-min items-center gap-3 rounded-full px-3 py-2 hover:bg-surface-container-high transition-colors"
          onClick={onClose}
        >
          <Settings size={18} className="text-on-surface-variant shrink-0" />
          {!collapsed && <span className="text-sm text-on-surface">Settings</span>}
        </Link>

        <div
          className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <Badge variant="info" size="sm">
                {user?.role?.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 h-screen w-64 border-r transform transition-transform duration-300 lg:hidden ${
          user?.role === 'SUPER_ADMIN'
            ? 'bg-[#0f1f18] border-[#1a3328]'
            : 'bg-surface-container-lowest border-outline-variant/30'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high"
          >
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>
        {user?.role === 'SUPER_ADMIN' ? <FounderSidebarContent /> : <SidebarContent />}
      </div>

      {/* Desktop sidebar — hidden when user toggles it off */}
      {!hiddenOnDesktop && (
        <div
          className={`relative hidden lg:flex h-screen min-h-0 flex-col border-r transition-all duration-300 ${
            user?.role === 'SUPER_ADMIN'
              ? 'bg-[#0f1f18] border-[#1a3328]'
              : 'bg-surface-container-lowest border-outline-variant/30'
          } ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          {user?.role === 'SUPER_ADMIN' ? <FounderSidebarContent /> : <SidebarContent />}
          <button
            onClick={onToggleCollapse}
            className="absolute top-16 -right-3 w-6 h-6 bg-surface-container-lowest border border-outline-variant/30 rounded-full flex items-center justify-center shadow-sm hover:bg-surface-container-high z-10"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>
      )}
    </>
  );
};
