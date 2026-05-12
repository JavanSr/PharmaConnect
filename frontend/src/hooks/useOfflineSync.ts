import { useCallback, useEffect, useState } from 'react';
import {
  flushOfflineWrites,
  getOfflineWriteCount,
  OFFLINE_QUEUE_EVENT,
  OFFLINE_SYNC_STATUS_EVENT,
} from '@/lib/offlineSync';
import { useConnectivityStore } from '@/stores/connectivityStore';

export function useOfflineSync(autoFlush = true) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const setConnectivityOnline = useConnectivityStore((state) => state.setOnline);
  const setPendingSyncCount = useConnectivityStore((state) => state.setPendingSyncCount);

  const refreshPendingWrites = useCallback(async () => {
    const count = await getOfflineWriteCount();
    setPendingWrites(count);
    setPendingSyncCount(count);
  }, [setPendingSyncCount]);

  const flush = useCallback(async () => {
    if (!navigator.onLine) {
      await refreshPendingWrites();
      return { synced: 0, conflicts: 0, remaining: await getOfflineWriteCount(), purgedExpired: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await flushOfflineWrites();
      setLastSyncedAt(new Date().toISOString());
      setPendingWrites(result.remaining);
      setPendingSyncCount(result.remaining);
      if (result.purgedExpired > 0) {
        setLastWarning(`${result.purgedExpired} queued offline write${result.purgedExpired === 1 ? '' : 's'} expired after 7 days and were removed.`);
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingWrites]);

  useEffect(() => {
    void refreshPendingWrites();

    const handleOnline = () => {
      setIsOnline(true);
      setConnectivityOnline(true);
      if (autoFlush) {
        void flush();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectivityOnline(false);
    };
    const handleQueueChange = () => void refreshPendingWrites();
    const handleSyncStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) {
        setLastWarning(detail.message);
      }
      void refreshPendingWrites();
    };
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PC_SYNC_STATUS') {
        window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_STATUS_EVENT, { detail: event.data }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
    window.addEventListener(OFFLINE_SYNC_STATUS_EVENT, handleSyncStatus);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    if (autoFlush && navigator.onLine) {
      void flush();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
      window.removeEventListener(OFFLINE_SYNC_STATUS_EVENT, handleSyncStatus);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [autoFlush, flush, refreshPendingWrites, setConnectivityOnline]);

  return {
    isOnline,
    canQueueWrites: true,
    backgroundSyncReady: 'serviceWorker' in navigator,
    pendingWrites,
    isSyncing,
    lastSyncedAt,
    lastWarning,
    flush,
  };
}
