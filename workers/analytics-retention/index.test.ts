/// <reference types="@cloudflare/workers-types" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { runRetention } from './src/index';
import { createD1TestHarness } from '../../src/test/d1TestHarness';
import { grantConsent, purgeExpiredAnalytics, readConsent, recordServerEvent, revokeConsent } from '../../functions/_lib/analytics';
import { COHORT_RETENTION_DAYS, RAW_EVENT_RETENTION_DAYS, addDays } from '../../src/lib/analytics';
import { retentionCutoffs } from '../../src/lib/analyticsRetention';

// B12 retention is time-driven: aged rows disappear when the scheduled Worker runs, with no client
// request involved. These tests drive the Worker entry points against the migrated schema.

const DAY = '2026-12-01';
const at = (day: string) => new Date(`${day}T03:17:00.000Z`);

async function seed(db: D1Database, userId: string) {
  await grantConsent(db, userId);
  const { pseudonym } = (await readConsent(db, userId))!;
  const insertEvent = (id: string, day: string) =>
    db.prepare(`INSERT INTO analytics_events (event_id, pseudonym, event_name, event_version, occurred_day, release, consent_version, props_json, received_at)
      VALUES (?, ?, 'calculation_completed', 1, ?, 'test', 'v1', '{}', ?)`).bind(id, pseudonym, day, `${day}T00:00:00.000Z`).run();
  const insertCohort = (p: string, day: string) =>
    db.prepare("INSERT INTO analytics_cohorts (pseudonym, activation_day, consent_version, created_at) VALUES (?, ?, 'v1', ?)").bind(p, day, `${day}T00:00:00.000Z`).run();
  return { pseudonym, insertEvent, insertCohort };
}

const count = async (db: D1Database, sql: string, ...params: unknown[]) => (await db.prepare(sql).bind(...params).first<{ cnt: number }>())?.cnt ?? 0;

async function fakeScheduledRun(env: { DB?: D1Database }, when: Date) {
  const waited: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => waited.push(p), passThroughOnException: () => {} } as unknown as ExecutionContext;
  const controller = { scheduledTime: when.getTime(), cron: '17 3 * * *', noRetry: () => {} } as unknown as ScheduledController;
  await worker.scheduled(controller, env, ctx);
  await Promise.all(waited);
}

afterEach(() => vi.useRealTimers());

describe('analytics retention Worker (B12)', () => {
  it('removes only aged rows on a quiet site, with no analytics request involved', async () => {
    const { db } = createD1TestHarness();
    const { pseudonym, insertEvent, insertCohort } = await seed(db, 'user_quiet');
    const { rawEventsBefore, cohortsBefore } = retentionCutoffs(DAY);
    await insertEvent('old-event', addDays(rawEventsBefore, -1));
    await insertEvent('boundary-event', rawEventsBefore); // exactly at the cutoff day is kept (strict <)
    await insertEvent('recent-event', addDays(DAY, -1));
    await insertCohort(pseudonym, addDays(cohortsBefore, -1)); // aged cohort
    await insertCohort('other-recent', addDays(cohortsBefore, 1));

    const result = await runRetention({ DB: db }, at(DAY));

    expect(result).toMatchObject({ day: DAY, rawEventsBefore: addDays(DAY, -RAW_EVENT_RETENTION_DAYS), cohortsBefore: addDays(DAY, -COHORT_RETENTION_DAYS), eventsDeleted: 1, cohortsDeleted: 1 });
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_events')).toBe(2);
    expect(await count(db, "SELECT count(*) AS cnt FROM analytics_events WHERE event_id = 'old-event'")).toBe(0);
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_cohorts')).toBe(1);
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_consent')).toBe(1);
    // Re-running the same day is idempotent.
    expect(await runRetention({ DB: db }, at(DAY))).toMatchObject({ eventsDeleted: 0, cohortsDeleted: 0 });
  });

  it('purges aged rows that have no consent row any more and leaves every non-analytics table alone', async () => {
    const harness = createD1TestHarness();
    const { db } = harness;
    const { insertEvent } = await seed(db, 'user_a');
    await db.prepare("INSERT INTO analytics_events (event_id, pseudonym, event_name, event_version, occurred_day, release, consent_version, props_json, received_at) VALUES ('orphan', 'no-consent-pseudonym', 'comparison_viewed', 1, ?, 'test', 'v1', '{}', ?)").bind(addDays(DAY, -200), `${DAY}T00:00:00.000Z`).run();
    await insertEvent('fresh', DAY);
    const before = harness.getTableCounts();
    await fakeScheduledRun({ DB: db }, at(DAY));
    expect(await count(db, "SELECT count(*) AS cnt FROM analytics_events WHERE event_id = 'orphan'")).toBe(0);
    expect(await count(db, "SELECT count(*) AS cnt FROM analytics_events WHERE event_id = 'fresh'")).toBe(1);
    const after = harness.getTableCounts();
    for (const table of Object.keys(before) as Array<keyof typeof before>) {
      if (table !== 'analytics_consent') expect(after[table], table).toBe(before[table]);
    }
    expect(after.analytics_consent).toBe(before.analytics_consent);
  });

  it('fails the run when the DB binding is missing or D1 errors, instead of reporting success', async () => {
    await expect(runRetention({}, at(DAY))).rejects.toThrow(/DB binding is missing/);
    await expect(runRetention({ DB: {} as unknown as D1Database }, at(DAY))).rejects.toThrow(/DB binding is missing/);
    const failing = { prepare: () => ({ bind: () => ({}) }), batch: async () => { throw new Error('D1_ERROR: storage unavailable'); } } as unknown as D1Database;
    await expect(runRetention({ DB: failing }, at(DAY))).rejects.toThrow(/D1_ERROR/);
    await expect(fakeScheduledRun({ DB: failing }, at(DAY))).rejects.toThrow(/D1_ERROR/);
  });

  it('keeps the day-104 M3 credit after day-90 raw cleanup, and revocation still purges immediately', async () => {
    const { db } = createD1TestHarness();
    const userId = 'user_m3';
    await grantConsent(db, userId);
    const { pseudonym } = (await readConsent(db, userId))!;
    const activation = '2026-01-01';
    await db.prepare("INSERT INTO analytics_cohorts (pseudonym, activation_day, consent_version, created_at) VALUES (?, ?, 'v1', ?)").bind(pseudonym, activation, `${activation}T00:00:00.000Z`).run();
    await db.prepare(`INSERT INTO analytics_events (event_id, pseudonym, event_name, event_version, occurred_day, release, consent_version, props_json, received_at)
      VALUES ('activation-event', ?, 'decision_saved', 1, ?, 'server', 'v1', '{}', ?)`).bind(pseudonym, activation, `${activation}T00:00:00.000Z`).run();
    // Day 91: the scheduled run removes the raw activation event but the cohort (120-day policy) stays.
    await runRetention({ DB: db }, at(addDays(activation, 91)));
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_events WHERE pseudonym = ?', pseudonym)).toBe(0);
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_cohorts WHERE pseudonym = ?', pseudonym)).toBe(1);
    // Day 104: a review still credits M3 on the surviving cohort row.
    const day104 = addDays(activation, 104);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${day104}T10:00:00.000Z`));
    try {
      await recordServerEvent(db, userId, 'review_completed', { family: 'fire' });
    } finally {
      vi.useRealTimers();
    }
    const cohort = await db.prepare('SELECT m3 FROM analytics_cohorts WHERE pseudonym = ?').bind(pseudonym).first<{ m3: number }>();
    expect(cohort?.m3).toBe(1);
    // Day 121: the scheduled run retires the cohort.
    await runRetention({ DB: db }, at(addDays(activation, 121)));
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_cohorts WHERE pseudonym = ?', pseudonym)).toBe(0);
    // Revocation is immediate regardless of age.
    await grantConsent(db, 'user_revoke');
    const revoked = (await readConsent(db, 'user_revoke'))!;
    await db.prepare(`INSERT INTO analytics_events (event_id, pseudonym, event_name, event_version, occurred_day, release, consent_version, props_json, received_at) VALUES ('today', ?, 'comparison_viewed', 1, ?, 'test', 'v1', '{}', ?)`).bind(revoked.pseudonym, DAY, `${DAY}T00:00:00.000Z`).run();
    await revokeConsent(db, 'user_revoke');
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_events WHERE pseudonym = ?', revoked.pseudonym)).toBe(0);
  });

  it('ingest and the Worker apply identical cutoffs', async () => {
    const { db } = createD1TestHarness();
    const { insertEvent } = await seed(db, 'user_same');
    await insertEvent('aged', addDays(DAY, -(RAW_EVENT_RETENTION_DAYS + 1)));
    await purgeExpiredAnalytics(db, DAY);
    expect(await count(db, 'SELECT count(*) AS cnt FROM analytics_events')).toBe(0);
  });

  it('deployable config targets only the preview database, has a daily cron and no HTTP purge route', async () => {
    const config = readFileSync(resolve(__dirname, 'wrangler.toml'), 'utf8');
    expect(config).toContain('database_id = "0dbad68e-7493-452f-8504-98d4c61ee5da"');
    expect(config).not.toMatch(/a5860350-0a50-4ebe-9f5f-1d9916a908e6/);
    expect(config).toMatch(/crons = \["17 3 \* \* \*"\]/);
    expect(config).toContain('workers_dev = false');
    const response = await worker.fetch();
    expect(response.status).toBe(404);
  });
});
