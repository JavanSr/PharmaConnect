import { create } from 'zustand'

interface ConnectivityState {
  isOnline: boolean
  pendingSyncCount: number
  lastSyncedAt: Date | null
}

interface ConnectivityActions {
  setOnline: (online: boolean) => void
  setOffline: () => void
  incrementPendingSync: () => void
  decrementPendingSync: () => void
  setPendingSyncCount: (count: number) => void
  setLastSynced: (date: Date) => void
}

type ConnectivityStore = ConnectivityState & ConnectivityActions

export const useConnectivityStore = create<ConnectivityStore>((set) => ({
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
  lastSyncedAt: null,

  setOnline: (online) => set({ isOnline: online }),

  setOffline: () => set({ isOnline: false }),

  incrementPendingSync: () =>
    set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),

  decrementPendingSync: () =>
    set((state) => ({ pendingSyncCount: Math.max(0, state.pendingSyncCount - 1) })),

  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

  setLastSynced: (date) => set({ lastSyncedAt: date })
}))
