import { processSyncQueue as dbProcessSyncQueue } from './db'
import { useConnectivityStore } from '@/stores/connectivityStore'

let syncInProgress = false

export async function processSyncQueue(): Promise<void> {
  if (syncInProgress) return
  syncInProgress = true

  const { setOnline, setLastSynced, setPendingSyncCount } = useConnectivityStore.getState()

  try {
    const { processed, failed } = await dbProcessSyncQueue()
    if (processed > 0) {
      setLastSynced(new Date())
    }
    setPendingSyncCount(failed)
    setOnline(true)
  } catch (error) {
    console.error('[Sync] Failed to process sync queue:', error)
  } finally {
    syncInProgress = false
  }
}

export function setupOnlineListener(): () => void {
  const handler = async () => {
    const { setOnline } = useConnectivityStore.getState()
    setOnline(true)
    await processSyncQueue()
  }

  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}

export function setupOfflineListener(): () => void {
  const handler = () => {
    const { setOffline } = useConnectivityStore.getState()
    setOffline()
  }

  window.addEventListener('offline', handler)
  return () => window.removeEventListener('offline', handler)
}

export function setupSync(): () => void {
  const cleanupOnline = setupOnlineListener()
  const cleanupOffline = setupOfflineListener()

  // Initial check: process any pending items if we're online
  if (navigator.onLine) {
    processSyncQueue()
  }

  return () => {
    cleanupOnline()
    cleanupOffline()
  }
}
