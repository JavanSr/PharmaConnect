import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/api';

// Same fetch-based SSE pattern as usePharmacyRealtimeSync — native
// EventSource can't send a custom Authorization header, so this streams the
// response body manually with exponential-backoff reconnect.
export function useChatRoomEvents(roomId: string | null): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!accessToken || !roomId) return;

    const controller = new AbortController();
    abortRef.current = controller;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    async function connect(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/events`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          scheduleReconnect();
          return;
        }

        attempt = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

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
            if (eventType === 'chat-message' || eventType === 'chat-message-removed') {
              queryClient.invalidateQueries({ queryKey: ['chat-messages', roomId] });
              queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
            }
          }
        }
        scheduleReconnect();
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        scheduleReconnect();
      }
    }

    function scheduleReconnect(): void {
      if (controller.signal.aborted) return;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
      attempt++;
      reconnectTimer = setTimeout(connect, delay);
    }

    connect();

    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [accessToken, roomId, queryClient]);
}
