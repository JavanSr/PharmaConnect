import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Bell, Plus, WifiOff, Clock } from 'lucide-react';
import { useConnectivityStore } from '@/stores/connectivityStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/Button';

interface TopBarProps {
  onMenuClick: () => void;
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, title }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const isOnline = useConnectivityStore(state => state.isOnline);
  const pendingSyncCount = useConnectivityStore(state => state.pendingSyncCount);
  const { notifications, unreadCount, markAllAsRead } = useNotificationStore();
  const navigate = useNavigate();

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
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl hover:bg-[#EDF7F3] text-[#64748B] transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#DC2626] text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#D6F0E8] shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#D6F0E8]">
                <span className="text-sm font-semibold text-[#0D4035]">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-[#1A6B5C] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-[#64748B] text-center py-8">No notifications</p>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-[#D6F0E8] last:border-0 ${!n.readStatus ? 'bg-[#EDF7F3]' : ''}`}>
                      <p className="text-sm font-medium text-[#0D4035]">{n.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
