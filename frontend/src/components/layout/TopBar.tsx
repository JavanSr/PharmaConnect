import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Menu, Plus, WifiOff, Clock, Wifi, RefreshCw } from 'lucide-react';
import { useConnectivityStore } from '@/stores/connectivityStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/NotificationBell';
import { selectMembershipPharmacy } from '@/lib/pharmacySelection';
import { flushOfflineWrites, clearAllOfflineWrites } from '@/lib/offlineSync';

interface TopBarProps {
  onMenuClick: () => void;
  onDesktopToggle: () => void;
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, onDesktopToggle, title }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === 'sw' ? 'sw' : 'en';
  const toggleLang = () => {
    const next = currentLang === 'en' ? 'sw' : 'en';
    void i18n.changeLanguage(next);
    try { localStorage.setItem('apotekh_lang', next); } catch { /* storage unavailable */ }
  };
  const pharmacy = usePharmacyStore(state => state.pharmacy);
  const isWholesalePharmacy = pharmacy?.pharmacyType === 'WHOLESALE';
  const isOnline = useConnectivityStore(state => state.isOnline);
  const isReachable = useConnectivityStore(state => state.isReachable);
  const pendingSyncCount = useConnectivityStore(state => state.pendingSyncCount);
  const setPendingSyncCount = useConnectivityStore(state => state.setPendingSyncCount);
  const memberships = usePharmacyStore(state => state.memberships);
  const toast = useNotificationStore(state => state.toast);
  const [syncing, setSyncing] = React.useState(false);
  const [syncStuck, setSyncStuck] = React.useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncStuck(false);
    try {
      const result = await flushOfflineWrites();
      setPendingSyncCount(result.remaining);
      if (result.synced > 0) {
        toast.success(`${result.synced} update${result.synced === 1 ? '' : 's'} synced.`);
        setSyncStuck(false);
      } else if (result.remaining > 0) {
        toast.error(`Could not sync — tap × to clear if stuck.`);
        setSyncStuck(true);
      }
    } catch {
      toast.error('Sync failed — try again when connected.');
      setSyncStuck(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleForceClear = async () => {
    await clearAllOfflineWrites();
    setPendingSyncCount(0);
    setSyncStuck(false);
    toast.info('Cleared stuck sync items.');
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const switchMutation = useMutation({
    mutationFn: (pharmacyId: string) => selectMembershipPharmacy(pharmacyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Could not switch pharmacy');
    },
  });

  const ConnectivityDot = () => {
    if (!isOnline) return (
      <div className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-tertiary-container/30 bg-tertiary-container/10 px-3 py-1">
        <WifiOff size={13} className="text-tertiary" />
        <span className="text-label-md text-tertiary font-medium">Offline</span>
      </div>
    );

    if (!isReachable) return (
      <div className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-tertiary-container/30 bg-tertiary-container/10 px-3 py-1">
        <Wifi size={13} className="text-tertiary animate-pulse" />
        <span className="text-label-md text-tertiary font-medium">Weak connection</span>
      </div>
    );

    if (pendingSyncCount > 0) return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleManualSync}
          disabled={syncing}
          title="Tap to retry sync"
          className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-tertiary-container/30 bg-tertiary-container/10 px-3 py-1 hover:bg-tertiary-container/20 transition-colors"
        >
          {syncing
            ? <RefreshCw size={13} className="text-tertiary animate-spin" />
            : <Clock size={13} className="text-tertiary animate-pulse" />}
          <span className="text-label-md text-tertiary font-medium">
            {syncing ? 'Syncing…' : `${pendingSyncCount} pending sync`}
          </span>
        </button>
        {syncStuck && !syncing && (
          <button
            type="button"
            onClick={handleForceClear}
            title="Clear stuck sync items"
            className="flex size-[28px] items-center justify-center rounded-full text-tertiary hover:bg-tertiary-container/20 transition-colors text-sm font-bold"
          >
            ×
          </button>
        )}
      </div>
    );

    return (
      <div className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-primary/20 bg-secondary-container px-3 py-1">
        <div className="w-2 h-2 bg-primary rounded-full" />
        <span className="text-label-md text-on-secondary-container font-medium">Connected</span>
      </div>
    );
  };

  return (
    <header className="min-h-[56px] bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between px-margin-mobile gap-4 sticky top-0 z-30 print:hidden">
      <div className="flex items-center gap-3">
        {/* Mobile: opens overlay sidebar */}
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant" aria-label="Open menu">
          <Menu size={20} />
        </button>
        {/* Desktop: toggles sidebar visibility */}
        <button onClick={onDesktopToggle} className="hidden lg:flex p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant" aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/dashboard');
            }
          }}
          className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant"
          aria-label="Go back"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        {title && <h1 className="text-title-md text-on-surface hidden sm:block">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {memberships.filter(m => m.active && m.pharmacy.isActive).length > 1 && (
          <div className="hidden md:flex min-h-[40px] items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5">
            <label htmlFor="topbar-pharmacy-select" className="text-label-md text-on-surface-variant">
              Outlet
            </label>
            <select
              id="topbar-pharmacy-select"
              aria-label="Active pharmacy"
              className="bg-transparent text-label-lg text-on-surface outline-none"
              disabled={switchMutation.isPending}
              value={pharmacy?.id ?? ''}
              onChange={(event) => {
                const nextId = event.target.value;
                if (!nextId || nextId === pharmacy?.id) {
                  return;
                }
                switchMutation.mutate(nextId);
              }}
            >
              {memberships.filter(m => m.active && m.pharmacy.isActive).map((membership) => (
                <option key={membership.id} value={membership.pharmacyId}>
                  {membership.pharmacy.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <ConnectivityDot />

        {/* Quick actions */}
        <div className="hidden sm:flex items-center gap-2">
          {isWholesalePharmacy ? (
            <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => navigate('/wholesale/manual-order')}>
              New Order
            </Button>
          ) : (
            <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => navigate('/dispensing')}>
              Dispense
            </Button>
          )}
          <Button size="sm" variant="ghost" leftIcon={<Plus size={14} />} onClick={() => navigate('/inventory/receive')}>
            Receive
          </Button>
        </div>

        {/* Language toggle */}
        <button
          type="button"
          onClick={toggleLang}
          title={currentLang === 'en' ? 'Switch to Swahili' : 'Switch to English'}
          aria-label={currentLang === 'en' ? 'Switch to Swahili' : 'Switch to English'}
          className="hidden sm:flex items-center px-2 py-1 rounded text-label-md text-on-surface-variant hover:bg-surface-container-high transition-colors font-medium tracking-wide"
        >
          {currentLang === 'en' ? 'EN' : 'SW'}
          <span className="mx-0.5 text-outline-variant">|</span>
          {currentLang === 'en' ? 'SW' : 'EN'}
        </button>

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
};
