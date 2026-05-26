import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, ClipboardList, Settings, ShoppingCart, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';

const ALLOWED_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'SUPER_ADMIN'];
const BUYER_ROLES = ['OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'];

const SELLER_NAV = [
  { label: 'Dashboard', path: '/wholesale', icon: <Building2 size={16} /> },
  { label: 'Orders', path: '/wholesale/orders', icon: <ClipboardList size={16} /> },
  { label: 'Settings', path: '/wholesale/settings', icon: <Settings size={16} /> },
];

const BUYER_NAV = [
  { label: 'Buy', path: '/wholesale/buy', icon: <ShoppingCart size={16} /> },
  { label: 'My orders', path: '/wholesale/orders', icon: <ClipboardList size={16} /> },
];

export const canAccessWholesaleShell = (role: string | null | undefined) => Boolean(role && ALLOWED_ROLES.includes(role));

type WholesaleMode = 'seller' | 'buyer';

export const WholesaleShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const pharmacy = usePharmacyStore((state) => state.pharmacy);

  const isWholesaleOutlet =
    pharmacy?.pharmacyType === 'WHOLESALE' ||
    Boolean(pharmacy?.isHybrid || pharmacy?.hybridAddonActive) ||
    user?.role === 'SUPER_ADMIN';

  const isHybrid = Boolean(pharmacy?.isHybrid || pharmacy?.hybridAddonActive);
  const isSellerRole = ALLOWED_ROLES.includes(user?.role ?? '');
  const isBuyerRole = BUYER_ROLES.includes(user?.role ?? '');
  const canSell = isSellerRole && isWholesaleOutlet;
  const canBuy = isBuyerRole;

  const defaultMode: WholesaleMode = canSell ? 'seller' : 'buyer';
  const [mode, setMode] = React.useState<WholesaleMode>(defaultMode);

  if (!canSell && !canBuy) {
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

  const navItems = mode === 'seller' ? SELLER_NAV : BUYER_NAV;

  return (
    <div className="space-y-stack-lg">
      <Card className="overflow-hidden bg-primary text-on-primary" padding={false} shadow="md">
        <div className={`gap-5 px-5 py-5 ${(isHybrid || (canSell && canBuy)) ? 'grid lg:grid-cols-[1.6fr_1fr]' : 'flex flex-col'}`}>
          <div className="space-y-2">
            <p className="text-label-md uppercase tracking-[0.3em] text-on-primary/70">
              {mode === 'seller' ? 'Wholesale Operations' : 'Buy from Suppliers'}
            </p>
            <h1 className="text-title-lg font-semibold leading-snug">
              {mode === 'seller'
                ? 'Wholesale workspace — shared platform backbone.'
                : 'Order from wholesale pharmacies on APOTEKH.'}
            </h1>
            <p className="max-w-2xl text-body-md text-on-primary/80">
              {mode === 'seller'
                ? 'Orders, credit, delivery, invoicing, and demand signals in one place.'
                : 'Browse supplier catalogues, check your tier pricing, and submit orders. Confirmation and dispatch updates arrive by email.'}
            </p>
          </div>
          {(isHybrid || (canSell && canBuy)) && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Switch mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('seller')}
                    className={`min-h-touch-target-min flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${mode === 'seller' ? 'bg-white text-primary' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    Sell
                  </button>
                  <button
                    onClick={() => setMode('buyer')}
                    className={`min-h-touch-target-min flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${mode === 'buyer' ? 'bg-white text-primary' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  >
                    Buy
                  </button>
                </div>
                <p className="text-xs text-white/60">
                  {mode === 'seller' ? 'Managing outgoing wholesale orders' : 'Placing orders with suppliers'}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/wholesale'}
            className={({ isActive }) =>
              `inline-flex min-h-touch-target-min shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-secondary-container text-on-secondary-container'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        {(isHybrid || (canSell && canBuy)) && (
          <button
            onClick={() => setMode(mode === 'seller' ? 'buyer' : 'seller')}
            className="inline-flex min-h-touch-target-min shrink-0 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
          >
            <RefreshCw size={14} />
            Switch to {mode === 'seller' ? 'Buy' : 'Sell'} mode
          </button>
        )}
      </div>

      {children}
    </div>
  );
};
