// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createD1TestHarness, invokeApi, seedTestUser, type D1TestHarness } from './test/d1TestHarness';
import * as sessionModule from '../functions/_lib/session';
import { onRequestGet as getConsent, onRequestPut as putConsent } from '../functions/api/analytics/consent';
import { onRequestPost as postEvents } from '../functions/api/analytics/events';
import { onRequestPost as createPlan } from '../functions/api/plans/index';
import { onRequestDelete as deleteAccountData } from '../functions/api/account-data/index';
import { purgeExpiredAnalytics, recordServerEvent } from '../functions/_lib/analytics';
import { addDays } from './lib/analytics';

const USER_A = 'user_analytics_a';
const USER_B = 'user_analytics_b';
let harness: D1TestHarness;

const asUser = (userId: string) =>
  vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({ ok: true, auth: { userId, sessionId: `s_${userId}`, sessionClaims: { sub: userId } } as never });
const req = (path: string, method: string, body?: unknown) =>
  new Request(`http://localhost${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const rows = async (sql: string, ...params: unknown[]) => (await harness.db.prepare(sql).bind(...params).all()).results as Array<Record<string, unknown>>;
const event = (overrides: Record<string, unknown> = {}) => ({
  eventId: crypto.randomUUID(), eventName: 'comparison_viewed', eventVersion: 1, occurredDay: '2026-09-26', release: 'test', props: { family: 'fire' }, ...overrides
});
const env = () => ({ DB: harness.db });

async function grant(userId: string) {
  asUser(userId);
  return invokeApi(putConsent, req('/api/analytics/consent', 'PUT', { granted: true }), env());
}

beforeEach(async () => {
  harness = createD1TestHarness();
  await seedTestUser(harness, USER_A, { displayName: 'A', defaultCurrency: 'USD' });
  await seedTestUser(harness, USER_B, { displayName: 'B', defaultCurrency: 'USD' });
});

describe('consented analytics API (B12)', () => {
  it('is off by default: no consent means no collection', async () => {
    asUser(USER_A);
    expect((await invokeApi(getConsent, req('/api/analytics/consent', 'GET'), env())).body).toMatchObject({ granted: false });
    const res = await invokeApi(postEvents, req('/api/analytics/events', 'POST', { events: [event()] }), env());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CONSENT_REQUIRED');
    expect(await rows('SELECT * FROM analytics_events')).toHaveLength(0);
  });

  it('stores allowlisted events under a pseudonym, never the user id, and dedupes by event id', async () => {
    await grant(USER_A);
    const first = event();
    const res = await invokeApi(postEvents, req('/api/analytics/events', 'POST', { events: [first, event({ eventName: 'review_due_opened', props: { source: 'in-app' } })] }), env());
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: 2, duplicates: 0 });
    const replay = await invokeApi(postEvents, req('/api/analytics/events', 'POST', { events: [first] }), env());
    expect(replay.body).toEqual({ accepted: 0, duplicates: 1 });
    const stored = await rows('SELECT * FROM analytics_events');
    expect(stored).toHaveLength(2);
    expect(JSON.stringify(stored)).not.toContain(USER_A);
  });

  it('rejects invalid batches without storing anything', async () => {
    await grant(USER_A);
    for (const body of [{ events: [event({ props: { family: 'fire', amount: '100' } })] }, { events: [] }, { events: Array.from({ length: 21 }, () => event()) }, { nope: true }]) {
      const res = await invokeApi(postEvents, req('/api/analytics/events', 'POST', body), env());
      expect(res.status).toBe(400);
    }
    expect(await rows('SELECT * FROM analytics_events')).toHaveLength(0);
  });

  it('caps events per pseudonym per day', async () => {
    await grant(USER_A);
    const [{ pseudonym }] = await rows('SELECT pseudonym FROM analytics_consent WHERE user_id = ?', USER_A);
    const day = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 500; i += 1) {
      await harness.db.prepare("INSERT INTO analytics_events VALUES (?, ?, 'comparison_viewed', 1, ?, 't', 'v', '{}', 'now')").bind(`seed-${i}`, pseudonym, day).run();
    }
    const res = await invokeApi(postEvents, req('/api/analytics/events', 'POST', { events: [event()] }), env());
    expect(res.status).toBe(429);
  });

  it('server events and cohorts appear only with consent; activation starts a cohort', async () => {
    const plan = { name: 'P', snapshot: { plan: {}, timeline: {} }, result: {} };
    asUser(USER_B);
    await invokeApi(createPlan, req('/api/plans', 'POST', plan), env());
    expect(await rows('SELECT * FROM analytics_events')).toHaveLength(0);
    await grant(USER_A);
    asUser(USER_A);
    const created = await invokeApi(createPlan, req('/api/plans', 'POST', plan), env());
    expect(created.status).toBe(201);
    expect(await rows("SELECT * FROM analytics_events WHERE event_name = 'decision_saved'")).toHaveLength(1);
    expect(await rows('SELECT * FROM analytics_cohorts')).toHaveLength(1);
    await recordServerEvent(harness.db, USER_A, 'review_completed', { decision: 'keep' });
    const [cohort] = await rows('SELECT * FROM analytics_cohorts');
    expect(cohort.last_review_day).toBe(new Date().toISOString().slice(0, 10));
  });

  it('revocation removes consent, events and cohort immediately', async () => {
    await grant(USER_A);
    asUser(USER_A);
    await invokeApi(postEvents, req('/api/analytics/events', 'POST', { events: [event()] }), env());
    await recordServerEvent(harness.db, USER_A, 'decision_saved', { family: 'fire' });
    const res = await invokeApi(putConsent, req('/api/analytics/consent', 'PUT', { granted: false }), env());
    expect(res.body).toEqual({ granted: false, consentVersion: null });
    for (const table of ['analytics_consent', 'analytics_events', 'analytics_cohorts']) expect(await rows(`SELECT * FROM ${table}`)).toHaveLength(0);
  });

  it('account deletion purges analytics and the tombstone blocks re-consent', async () => {
    await grant(USER_A);
    await grant(USER_B);
    asUser(USER_A);
    await invokeApi(postEvents, req('/api/analytics/events', 'POST', { events: [event()] }), env());
    const del = await invokeApi(deleteAccountData, req('/api/account-data', 'DELETE', { confirmation: 'DELETE MY FINPATH DATA' }), env());
    expect(del.body.deletion.deletedRows).toMatchObject({ analyticsConsent: 1, analyticsEvents: 1 });
    expect(await rows('SELECT * FROM analytics_consent WHERE user_id = ?', USER_A)).toHaveLength(0);
    expect(await rows('SELECT * FROM analytics_consent WHERE user_id = ?', USER_B)).toHaveLength(1);
    expect((await grant(USER_A)).status).toBe(410);
  });

  it('retention: raw events after 90 days and cohorts after 120 days are purged', async () => {
    await grant(USER_A);
    const [{ pseudonym }] = await rows('SELECT pseudonym FROM analytics_consent WHERE user_id = ?', USER_A);
    const day = '2026-09-26';
    await harness.db.prepare("INSERT INTO analytics_events VALUES ('old', ?, 'comparison_viewed', 1, ?, 't', 'v', '{}', 'x')").bind(pseudonym, addDays(day, -91)).run();
    await harness.db.prepare("INSERT INTO analytics_events VALUES ('recent', ?, 'comparison_viewed', 1, ?, 't', 'v', '{}', 'x')").bind(pseudonym, addDays(day, -89)).run();
    await harness.db.prepare("INSERT INTO analytics_cohorts (pseudonym, activation_day, consent_version, created_at) VALUES ('p-old', ?, 'v', 'x'), ('p-new', ?, 'v', 'x')").bind(addDays(day, -121), addDays(day, -104)).run();
    await purgeExpiredAnalytics(harness.db, day);
    expect((await rows('SELECT event_id FROM analytics_events')).map((r) => r.event_id)).toEqual(['recent']);
    expect((await rows('SELECT pseudonym FROM analytics_cohorts')).map((r) => r.pseudonym)).toEqual(['p-new']);
  });
});
