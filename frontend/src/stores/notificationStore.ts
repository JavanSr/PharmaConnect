import { create } from 'zustand';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  readStatus: boolean;
  createdAt: string;
}

interface NotificationState {
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;

  // Toast API — used as toast.success(...), toast.error(...) etc.
  toast: {
    success: (message: string, duration?: number) => void;
    error:   (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info:    (message: string, duration?: number) => void;
  };

  removeToast: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'readStatus' | 'createdAt'>) => void;
  markAllAsRead: () => void;
}

let toastId = 0;
let notifId = 0;

export const useNotificationStore = create<NotificationState>((set) => {
  const addToast = (type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${++toastId}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
  };

  return {
    toasts: [],
    notifications: [],
    unreadCount: 0,

    toast: {
      success: (msg, dur) => addToast('success', msg, dur),
      error:   (msg, dur) => addToast('error',   msg, dur),
      warning: (msg, dur) => addToast('warning', msg, dur),
      info:    (msg, dur) => addToast('info',    msg, dur),
    },

    removeToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    addNotification: (n) =>
      set((s) => ({
        notifications: [
          {
            ...n,
            id: `notif-${++notifId}`,
            readStatus: false,
            createdAt: new Date().toISOString(),
          },
          ...s.notifications,
        ],
        unreadCount: s.unreadCount + 1,
      })),

    markAllAsRead: () =>
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, readStatus: true })),
        unreadCount: 0,
      })),
  };
});
