import { useCallback, useEffect, useState } from 'react';
import {
  flushOfflineWrites,
  getOfflineWriteCount,
  OFFLINE_QUEUE_EVENT,
} from '@/lib/offlineSync';

export function useOfflineSync(autoFlush = true) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refreshPendingWrites = useCallback(async () => {
    const count = await getOfflineWriteCount();
    setPendingWrites(count);
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) {
      await refreshPendingWrites();
      return { synced: 0, conflicts: 0, remaining: await getOfflineWriteCount() };
    }

    setIsSyncing(true);
    try {
      const result = await flushOfflineWrites();
      setLastSyncedAt(new Date().toISOString());
      setPendingWrites(result.remaining);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingWrites]);

  useEffect(() => {
    void refreshPendingWrites();

    const handleOnline = () => {
      setIsOnline(true);
      if (autoFlush) {
        void flush();
      }
    };

    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => void refreshPendingWrites();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);

    if (autoFlush && navigator.onLine) {
      void flush();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChange);
    };
  }, [autoFlush, flush, refreshPendingWrites]);

  return {
    isOnline,
    canQueueWrites: true,
    backgroundSyncReady: 'serviceWorker' in navigator,
    pendingWrites,
    isSyncing,
    lastSyncedAt,
    flush,
  };
}
