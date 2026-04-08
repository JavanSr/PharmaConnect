import { useEffect } from 'react';
import { useConnectivityStore } from '@/stores/connectivityStore';

export function useConnectivity() {
  const store = useConnectivityStore();

  useEffect(() => {
    const handleOnline = () => store.setOnline(true);
    const handleOffline = () => store.setOffline();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline: store.isOnline,
    pendingSyncCount: store.pendingSyncCount,
    lastSyncedAt: store.lastSyncedAt,
  };
}
