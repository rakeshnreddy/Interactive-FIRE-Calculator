import { ANALYTICS_EVENT_VERSION, validateClientEvent, type AnalyticsEventName } from './analytics';

// Browser side of B12. Sends nothing unless the signed-in user has turned analytics on; every event
// is checked against the shared allowlist before it is queued.
// 'pending' = signed in but the consent preference has not loaded yet: events are held, then
// sent if consent turns out to be on and discarded otherwise.
type Config = { enabled: boolean | 'pending'; getToken: () => Promise<string | null> };

let config: Config = { enabled: false, getToken: async () => null };
let queue: unknown[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const RELEASE = 'web';

export function configureAnalytics(next: Config): void {
  config = next;
  if (next.enabled === true && queue.length && !timer) {
    timer = setTimeout(() => void flushAnalytics(), 0);
  }
  if (next.enabled === false) {
    queue = [];
    if (timer) clearTimeout(timer);
    timer = null;
  }
}

export function track(eventName: AnalyticsEventName, props: Record<string, string>): void {
  if (config.enabled === false || typeof crypto === 'undefined' || typeof fetch === 'undefined') return;
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
  if (config.enabled === 'pending') return;
  if (queue.length >= 10) void flushAnalytics();
  else if (!timer) timer = setTimeout(() => void flushAnalytics(), 2000);
}

let flushing: Promise<void> | null = null;

// Sends the queue in batches of 20 (the API limit) until it is empty; one flush at a time.
export function flushAnalytics(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (flushing) return flushing;
  const run = (async () => {
    try {
      while (config.enabled === true && queue.length > 0) {
        const events = queue.splice(0, 20);
        const token = await config.getToken();
        if (!token) return;
        await fetch('/api/analytics/events', {
          method: 'POST',
          keepalive: true,
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ events })
        });
      }
    } catch {
      // Measurement never interrupts the product.
    }
  })();
  flushing = run;
  void run.then(() => {
    if (flushing === run) flushing = null;
  });
  return run;
}

export function pendingAnalyticsCount(): number {
  return queue.length;
}
