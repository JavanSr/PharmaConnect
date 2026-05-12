import { create } from 'zustand';

interface ConnectivityState {
  isOnline: boolean;
  pendingSyncCount: number;
  setOnline: (online: boolean) => void;
  setPendingSyncCount: (count: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: navigator.onLine,
  pendingSyncCount: 0,

  setOnline: (isOnline) => set({ isOnline }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  incrementPending: () => set((s) => ({ pendingSyncCount: s.pendingSyncCount + 1 })),
  decrementPending: () => set((s) => ({ pendingSyncCount: Math.max(0, s.pendingSyncCount - 1) })),
}));

// Wire up browser events once at module load
if (typeof window !== 'undefined') {
  window.addEventListener('online',  () => useConnectivityStore.getState().setOnline(true));
  window.addEventListener('offline', () => useConnectivityStore.getState().setOnline(false));
}
