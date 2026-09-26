import { ANALYTICS_EVENT_VERSION, validateClientEvent, type AnalyticsEventName } from './analytics';

// Browser side of B12. Sends nothing unless the signed-in user has turned analytics on; every event
// is checked against the shared allowlist before it is queued.
type Config = { enabled: boolean; getToken: () => Promise<string | null> };

let config: Config = { enabled: false, getToken: async () => null };
let queue: unknown[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const RELEASE = 'web';

export function configureAnalytics(next: Config): void {
  config = next;
  if (!next.enabled) {
    queue = [];
    if (timer) clearTimeout(timer);
    timer = null;
  }
}

export function track(eventName: AnalyticsEventName, props: Record<string, string>): void {
  if (!config.enabled || typeof crypto === 'undefined' || typeof fetch === 'undefined') return;
  const candidate = {
    eventId: crypto.randomUUID(),
    eventName,
    eventVersion: ANALYTICS_EVENT_VERSION,
    occurredDay: new Date().toISOString().slice(0, 10),
    release: RELEASE,
    props
  };
  if (!validateClientEvent(candidate).ok) return;
  queue.push(candidate);
  if (queue.length >= 10) void flushAnalytics();
  else if (!timer) timer = setTimeout(() => void flushAnalytics(), 2000);
}

export async function flushAnalytics(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!config.enabled || queue.length === 0) return;
  const events = queue.splice(0, 20);
  try {
    const token = await config.getToken();
    if (!token) return;
    await fetch('/api/analytics/events', {
      method: 'POST',
      keepalive: true,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ events })
    });
  } catch {
    // Measurement never interrupts the product.
  }
}

export function pendingAnalyticsCount(): number {
  return queue.length;
}
