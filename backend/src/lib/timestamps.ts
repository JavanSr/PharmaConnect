const MAX_FUTURE_MS = 5 * 60 * 1000;          // 5 minutes — no legitimate future timestamps
const MAX_PAST_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days — matches offline write TTL

/**
 * Parses a device-supplied localTimestamp and returns a trusted Date.
 *
 * Falls back to server time when the value is absent, unparseable, more than
 * 5 minutes in the future (device clock ahead), or older than 7 days (outside
 * the offline write TTL). This prevents corrupted audit-trail timestamps from
 * devices with misconfigured clocks while still preserving accurate timestamps
 * for legitimate offline writes synced within the TTL window.
 */
export function clampLocalTimestamp(value: string | null | undefined): Date {
  if (!value) return new Date();

  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return new Date();

  const now = Date.now();
  if (ts.getTime() > now + MAX_FUTURE_MS) return new Date();
  if (ts.getTime() < now - MAX_PAST_MS)   return new Date();

  return ts;
}
