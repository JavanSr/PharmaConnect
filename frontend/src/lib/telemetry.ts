import { api } from './api';

export function trackEvent(
  featureKey: string,
  eventType: 'ACTIVATED' | 'USED' = 'USED',
  metadata?: Record<string, unknown>,
): void {
  // Fire-and-forget — never blocks UI, never throws to caller
  api.post('/telemetry/track', { featureKey, eventType, metadata }).catch(() => {});
}
