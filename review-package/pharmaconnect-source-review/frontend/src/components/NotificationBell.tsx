import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/notificationStore';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const notificationsQuery = useQuery({
    queryKey: ['notifications-bell'],
    queryFn: () => api.get('/notifications', { params: { limit: 20 } }).then((response) => response.data),
    refetchInterval: 300_000,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (notificationsQuery.data?.data) {
      setNotifications(notificationsQuery.data.data);
    }
  }, [notificationsQuery.data, setNotifications]);

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_response, id) => markAsRead(id),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => markAllAsRead(),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-xl p-2 text-[#64748B] transition-colors hover:bg-[#EDF7F3]"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-[#D6F0E8] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[#D6F0E8] px-4 py-3">
            <span className="text-sm font-semibold text-[#0D4035]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                className="text-xs text-[#1A6B5C] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#64748B]">No notifications</p>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <button
                  key={notification.id}
                  className={`block w-full border-b border-[#D6F0E8] px-4 py-3 text-left last:border-0 ${!notification.readStatus ? 'bg-[#EDF7F3]' : ''}`}
                  onClick={() => {
                    if (!notification.readStatus) {
                      markOneMutation.mutate(notification.id);
                    }
                  }}
                >
                  <p className="text-sm font-medium text-[#0D4035]">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-[#64748B]">{notification.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
