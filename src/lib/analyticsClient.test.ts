// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAnalytics, flushAnalytics, pendingAnalyticsCount, track } from './analyticsClient';

afterEach(() => {
  configureAnalytics({ enabled: false, getToken: async () => null });
  vi.restoreAllMocks();
});

describe('analytics client (B12)', () => {
  it('opted out: records and sends nothing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    configureAnalytics({ enabled: false, getToken: async () => 't' });
    track('comparison_viewed', { family: 'fire' });
    await flushAnalytics();
    expect(pendingAnalyticsCount()).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('opted in: sends allowlisted events and drops anything outside the contract', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    configureAnalytics({ enabled: true, getToken: async () => 'token' });
    track('comparison_viewed', { family: 'fire' });
    track('comparison_viewed', { family: 'fire', amount: '80000' });
    track('decision_saved' as never, { family: 'fire' });
    await flushAnalytics();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ eventName: 'comparison_viewed', props: { family: 'fire' } });
  });

  it('holds events while consent is loading, then sends or discards them', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    configureAnalytics({ enabled: 'pending', getToken: async () => 'token' });
    track('comparison_viewed', { family: 'fire' });
    await flushAnalytics();
    expect(fetchSpy).not.toHaveBeenCalled();
    configureAnalytics({ enabled: true, getToken: async () => 'token' });
    await flushAnalytics();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    configureAnalytics({ enabled: 'pending', getToken: async () => 'token' });
    track('comparison_viewed', { family: 'fire' });
    configureAnalytics({ enabled: false, getToken: async () => 'token' });
    await flushAnalytics();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(pendingAnalyticsCount()).toBe(0);
  });

  it('turning analytics off discards anything queued', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    configureAnalytics({ enabled: true, getToken: async () => 'token' });
    track('comparison_viewed', { family: 'fire' });
    configureAnalytics({ enabled: false, getToken: async () => 'token' });
    await flushAnalytics();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
