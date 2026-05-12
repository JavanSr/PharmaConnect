import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useConnectivityStore } from '@/stores/connectivityStore';

const HEARTBEAT_INTERVAL_MS = 30_000;

export function useHeartbeat() {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const setReachable = useConnectivityStore((s) => s.setReachable);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!isOnline) {
      setReachable(false);
      return;
    }

    const check = async () => {
      try {
        await api.get('/health', { timeout: 5000 } as any);
        if (!cancelledRef.current) setReachable(true);
      } catch {
        if (!cancelledRef.current) setReachable(false);
      }
    };

    void check();
    const id = setInterval(check, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [isOnline, setReachable]);
}
