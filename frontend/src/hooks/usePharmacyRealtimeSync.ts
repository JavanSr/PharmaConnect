import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { API_BASE_URL } from '@/lib/api';

const SSE_URL = `${API_BASE_URL}/realtime/events`;

// Invalidation targets for each event type
const INVALIDATION_MAP: Record<string, string[][]> = {
  STOCK_UPDATED: [
    ['products-offline-cache'],
    ['stock-snapshot'],
    ['stock-on-hand'],
    ['expiry-30'],
    ['low-stock'],
    ['inventory-dashboard-summary'],
  ],
  DISPENSING_UPDATED: [
    ['dispensing-events'],
    ['daily-close'],
  ],
};

export function usePharmacyRealtimeSync(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const pharmacy = usePharmacyStore((s) => s.pharmacy);
  const queryClient = useQueryClient();

  // Track the abort controller so we can tear down on token/pharmacy change
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!accessToken || !pharmacy?.id) return;

    const controller = new AbortController();
    abortRef.current = controller;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    async function connect(): Promise<void> {
      try {
        const response = await fetch(SSE_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // Non-2xx or no body — back off and retry
          scheduleReconnect();
          return;
        }

        attempt = 0; // reset backoff on successful connection
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (double-newline separated)
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventType = 'message';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              }
            }
            const targets = INVALIDATION_MAP[eventType];
            if (targets) {
              for (const queryKey of targets) {
                queryClient.invalidateQueries({ queryKey });
              }
            }
          }
        }
        // Stream ended cleanly — reconnect
        scheduleReconnect();
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return; // intentional teardown
        scheduleReconnect();
      }
    }

    function scheduleReconnect(): void {
      if (controller.signal.aborted) return;
      // Exponential backoff: 1s, 2s, 4s, 8s, cap at 30s
      const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
      attempt++;
      reconnectTimer = setTimeout(connect, delay);
    }

    connect();

    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [accessToken, pharmacy?.id, queryClient]);
}
