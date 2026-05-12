import { create } from 'zustand';

interface ConnectivityState {
  isOnline: boolean;
  isReachable: boolean;
  pendingSyncCount: number;
  setOnline: (online: boolean) => void;
  setReachable: (reachable: boolean) => void;
  setPendingSyncCount: (count: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: navigator.onLine,
  isReachable: navigator.onLine,
  pendingSyncCount: 0,

  setOnline: (isOnline) => set({ isOnline, ...(!isOnline ? { isReachable: false } : {}) }),
  setReachable: (isReachable) => set({ isReachable }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  incrementPending: () => set((s) => ({ pendingSyncCount: s.pendingSyncCount + 1 })),
  decrementPending: () => set((s) => ({ pendingSyncCount: Math.max(0, s.pendingSyncCount - 1) })),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useConnectivityStore.getState().setOnline(true));
  window.addEventListener('offline', () => useConnectivityStore.getState().setOnline(false));
}
