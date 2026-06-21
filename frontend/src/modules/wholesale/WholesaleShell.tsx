import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, ClipboardCheck, ClipboardList, CreditCard, FileText, PackagePlus, Percent, RotateCcw, Settings, ShoppingCart, RefreshCw, Tag, Truck, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';

const ALLOWED_ROLES = ['OWNER', 'WHOLESALE_MANAGER', 'WHOLESALE_COUNTER_STAFF', 'DELIVERY_STAFF', 'SUPER_ADMIN'];
const BUYER_ROLES = ['OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'];

const SELLER_NAV = [
  { label: 'Dashboard', path: '/wholesale', icon: <Building2 size={16} /> },
  { label: 'Orders', path: '/wholesale/orders', icon: <ClipboardList size={16} /> },
  { label: 'Manual order', path: '/wholesale/manual-order', icon: <UserPlus size={16} /> },
  { label: 'Invoices', path: '/wholesale/invoices', icon: <FileText size={16} /> },
  { label: 'Manifests', path: '/wholesale/manifests', icon: <Truck size={16} /> },
  { label: 'Returns', path: '/wholesale/returns', icon: <RotateCcw size={16} /> },
  { label: 'Purchase orders', path: '/wholesale/purchase-orders', icon: <PackagePlus size={16} /> },
  { label: 'Client pricing', path: '/wholesale/client-pricing', icon: <Tag size={16} /> },
  { label: 'Schemes', path: '/wholesale/schemes', icon: <Percent size={16} /> },
  { label: 'Collections', path: '/wholesale/collections', icon: <CreditCard size={16} /> },
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
      {/* Hero banner */}
      <div className="overflow-hidden rounded-xl bg-primary text-white shadow-md">
        <div className={`gap-5 px-5 py-5 ${(isHybrid || (canSell && canBuy)) ? 'grid lg:grid-cols-[1.6fr_1fr]' : 'flex flex-col'}`}>
          <div className="space-y-2">
            <p className="text-label-md uppercase tracking-[0.3em] text-white/70">
              {mode === 'seller' ? 'Wholesale Operations' : 'Buy from Suppliers'}
            </p>
            <h1 className="text-title-lg font-semibold leading-snug text-white">
              {mode === 'seller'
                ? 'Wholesale distribution — orders, invoices, credit, and delivery.'
                : 'Order from wholesale pharmacies on APOTEKH.'}
            </h1>
            <p className="max-w-2xl text-body-md text-white/80">
              {mode === 'seller'
                ? 'Manage every buyer order from submission to delivery. Track credit exposure, issue VAT invoices, and monitor demand — all in one workspace.'
                : 'Browse supplier catalogues, check your tier pricing, and submit orders. Confirmation and dispatch updates arrive in your notifications.'}
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
                    className={`min-h-touch-target-min flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${mode === 'buyer' ? 'bg-white text-active-fill' : 'bg-white/20 text-white hover:bg-white/30'}`}
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
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/wholesale'}
            className={({ isActive }) =>
              `inline-flex min-h-touch-target-min shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[#E8A020] bg-primary text-white'
                  : 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-[#D6F0E8] hover:text-[#0D4035]'
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
