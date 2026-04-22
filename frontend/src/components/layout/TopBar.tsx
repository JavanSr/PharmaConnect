import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Plus, WifiOff, Clock } from 'lucide-react';
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
    if (pendingSyncCount > 0) return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200">
        <Clock size={13} className={`text-[#D97706] ${isOnline ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-[#D97706] font-medium">{pendingSyncCount} pending sync</span>
      </div>
    );

    if (!isOnline) return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-full border border-red-200">
        <WifiOff size={13} className="text-[#DC2626]" />
        <span className="text-xs text-[#DC2626] font-medium">Offline</span>
      </div>
    );

    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#D6F0E8] rounded-full border border-[#1A6B5C]/20">
        <div className="w-2 h-2 bg-[#1A6B5C] rounded-full" />
        <span className="text-xs text-[#1A6B5C] font-medium">Synced</span>
      </div>
    );
  };

  return (
    <header className="h-14 bg-white border-b border-[#D6F0E8] flex items-center justify-between px-4 gap-4 sticky top-0 z-30 print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-[#EDF7F3] text-[#64748B]">
          <Menu size={20} />
        </button>
        {title && <h1 className="text-base font-semibold text-[#0D4035] hidden sm:block">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {memberships.length > 1 && (
          <div className="hidden md:flex items-center gap-2 rounded-full border border-[#D6F0E8] bg-white px-3 py-1.5">
            <label htmlFor="topbar-pharmacy-select" className="text-xs font-medium text-[#64748B]">
              Outlet
            </label>
            <select
              id="topbar-pharmacy-select"
              aria-label="Active pharmacy"
              className="bg-transparent text-sm font-medium text-[#0D4035] outline-none"
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
