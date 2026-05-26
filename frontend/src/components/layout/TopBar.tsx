import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Menu, Plus, WifiOff, Clock, Wifi } from 'lucide-react';
import { useConnectivityStore } from '@/stores/connectivityStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/NotificationBell';
import { selectMembershipPharmacy } from '@/lib/pharmacySelection';

interface TopBarProps {
  onMenuClick: () => void;
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, title }) => {
  const isOnline = useConnectivityStore(state => state.isOnline);
  const isReachable = useConnectivityStore(state => state.isReachable);
  const pendingSyncCount = useConnectivityStore(state => state.pendingSyncCount);
  const memberships = usePharmacyStore(state => state.memberships);
  const pharmacy = usePharmacyStore(state => state.pharmacy);
  const toast = useNotificationStore(state => state.toast);
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
      <div className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-tertiary-container/30 bg-tertiary-container/10 px-3 py-1">
        <Clock size={13} className="text-tertiary animate-pulse" />
        <span className="text-label-md text-tertiary font-medium">{pendingSyncCount} pending sync</span>
      </div>
    );

    return (
      <div className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-primary/20 bg-secondary-container px-3 py-1">
        <div className="w-2 h-2 bg-primary rounded-full" />
        <span className="text-label-md text-on-secondary-container font-medium">Online - syncing</span>
      </div>
    );
  };

  return (
    <header className="min-h-[56px] bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between px-margin-mobile gap-4 sticky top-0 z-30 print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant">
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
        {memberships.length > 1 && (
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
              {memberships.map((membership) => (
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
          <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => navigate('/dispensing')}>
            Dispense
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<Plus size={14} />} onClick={() => navigate('/inventory/receive')}>
            Receive
          </Button>
        </div>

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
};
