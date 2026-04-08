import { create } from 'zustand';
import type { AppNotification, ToastNotification } from '@/types';

let toastIdCounter = 0;

interface NotificationState {
  notifications: AppNotification[];
  toasts: ToastNotification[];
  unreadCount: number;
}

interface NotificationActions {
  addNotification: (n: Omit<AppNotification, 'id' | 'readStatus' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  addToast: (t: Omit<ToastNotification, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

export const useNotificationStore = create<NotificationState & NotificationActions>((set, get) => ({
  notifications: [],
  toasts: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: AppNotification = {
      ...n,
      id: `notif-${Date.now()}`,
      readStatus: false,
      createdAt: new Date().toISOString(),
    };
    set(s => ({ notifications: [notification, ...s.notifications], unreadCount: s.unreadCount + 1 }));
  },

  markAsRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, readStatus: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),

  markAllAsRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, readStatus: true })),
    unreadCount: 0,
  })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  addToast: (t) => {
    const toast: ToastNotification = { ...t, id: `toast-${++toastIdCounter}` };
    set(s => ({ toasts: [...s.toasts, toast] }));
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  toast: {
    success: (message, duration) => get().addToast({ type: 'success', message, duration }),
    error: (message, duration) => get().addToast({ type: 'error', message, duration }),
    warning: (message, duration) => get().addToast({ type: 'warning', message, duration }),
    info: (message, duration) => get().addToast({ type: 'info', message, duration }),
  },
}));
