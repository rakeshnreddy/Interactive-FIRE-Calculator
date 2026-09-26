/// <reference types="@cloudflare/workers-types" />
import {
  ANALYTICS_CONSENT_VERSION,
  ANALYTICS_EVENT_VERSION,
  COHORT_RETENTION_DAYS,
  MAX_EVENTS_PER_PSEUDONYM_PER_DAY,
  MAX_EVENTS_PER_REQUEST,
  RAW_EVENT_RETENTION_DAYS,
  addDays,
  applyReview,
  validateClientEvent,
  validateProps,
  type AnalyticsEvent,
  type AnalyticsEventName
} from '../../src/lib/analytics';
import { ensureUserProfile } from './persistence';

// Server side of B12. Collection only exists for users with a consent row; everything is keyed by a
// random pseudonym, never the Clerk ID.

const today = () => new Date().toISOString().slice(0, 10);

export async function readConsent(db: D1Database, userId: string): Promise<{ pseudonym: string; consentVersion: string } | null> {
  const row = await db.prepare('SELECT pseudonym, consent_version FROM analytics_consent WHERE user_id = ?').bind(userId).first<{ pseudonym: string; consent_version: string }>();
  return row ? { pseudonym: row.pseudonym, consentVersion: row.consent_version } : null;
}

export async function grantConsent(db: D1Database, userId: string): Promise<void> {
  await ensureUserProfile(db, userId);
  const now = new Date().toISOString();
  await db
    .prepare(`INSERT INTO analytics_consent (user_id, pseudonym, consent_version, granted_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET consent_version = excluded.consent_version, updated_at = excluded.updated_at`)
    .bind(userId, crypto.randomUUID(), ANALYTICS_CONSENT_VERSION, now, now)
    .run();
}

// Revocation stops collection and removes the user's identifiable analytics immediately.
export function analyticsDeletionStatements(db: D1Database, userId: string): D1PreparedStatement[] {
  const byPseudonym = 'SELECT pseudonym FROM analytics_consent WHERE user_id = ?';
  return [
    db.prepare(`DELETE FROM analytics_events WHERE pseudonym IN (${byPseudonym})`).bind(userId),
    db.prepare(`DELETE FROM analytics_cohorts WHERE pseudonym IN (${byPseudonym})`).bind(userId),
    db.prepare('DELETE FROM analytics_consent WHERE user_id = ?').bind(userId)
  ];
}

export async function revokeConsent(db: D1Database, userId: string): Promise<void> {
  await db.batch(analyticsDeletionStatements(db, userId));
}

// Bounded retention: raw events 90 days, cohort membership 120 days after activation.
export async function purgeExpiredAnalytics(db: D1Database, day = today()): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM analytics_events WHERE occurred_day < ?').bind(addDays(day, -RAW_EVENT_RETENTION_DAYS)),
    db.prepare('DELETE FROM analytics_cohorts WHERE activation_day < ?').bind(addDays(day, -COHORT_RETENTION_DAYS))
  ]);
}

export type IngestResult = { status: 202; accepted: number; duplicates: number } | { status: 400 | 403 | 429; code: string; error: string };

export async function ingestClientEvents(db: D1Database, userId: string, body: unknown, release: string): Promise<IngestResult> {
  const consent = await readConsent(db, userId);
  if (!consent) return { status: 403, code: 'CONSENT_REQUIRED', error: 'Product analytics is off for this account.' };
  const events = typeof body === 'object' && body !== null && Array.isArray((body as { events?: unknown }).events) ? (body as { events: unknown[] }).events : null;
  if (!events || events.length === 0 || events.length > MAX_EVENTS_PER_REQUEST) {
    return { status: 400, code: 'INVALID_EVENTS', error: `Send between 1 and ${MAX_EVENTS_PER_REQUEST} events.` };
  }
  const valid: AnalyticsEvent[] = [];
  for (const raw of events) {
    const result = validateClientEvent(raw);
    if (!result.ok) return { status: 400, code: 'INVALID_EVENT', error: result.error };
    valid.push(result.event);
  }
  const day = today();
  const count = await db.prepare('SELECT count(*) AS cnt FROM analytics_events WHERE pseudonym = ? AND occurred_day = ?').bind(consent.pseudonym, day).first<{ cnt: number }>();
  if ((count?.cnt ?? 0) + valid.length > MAX_EVENTS_PER_PSEUDONYM_PER_DAY) {
    return { status: 429, code: 'RATE_LIMITED', error: 'Daily analytics limit reached.' };
  }
  const receivedAt = new Date().toISOString();
  // The server assigns the day it received the event; client clocks are not trusted.
  const results = await db.batch(
    valid.map((event) =>
      db
        .prepare(`INSERT OR IGNORE INTO analytics_events (event_id, pseudonym, event_name, event_version, occurred_day, release, consent_version, props_json, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(event.eventId, consent.pseudonym, event.eventName, event.eventVersion, day, release, consent.consentVersion, JSON.stringify(event.props), receivedAt)
    )
  );
  const accepted = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
  await purgeExpiredAnalytics(db, day);
  return { status: 202, accepted, duplicates: valid.length - accepted };
}

// Server-observed events. Silently a no-op without consent; never throws into the product flow.
export async function recordServerEvent(db: D1Database, userId: string, eventName: AnalyticsEventName, props: Record<string, string>): Promise<void> {
  try {
    const consent = await readConsent(db, userId);
    if (!consent) return;
    const checked = validateProps(eventName, props);
    if (!checked.ok) return;
    const day = today();
    const statements: D1PreparedStatement[] = [
      db
        .prepare(`INSERT OR IGNORE INTO analytics_events (event_id, pseudonym, event_name, event_version, occurred_day, release, consent_version, props_json, received_at)
          VALUES (?, ?, ?, ?, ?, 'server', ?, ?, ?)`)
        .bind(crypto.randomUUID(), consent.pseudonym, eventName, ANALYTICS_EVENT_VERSION, day, consent.consentVersion, JSON.stringify(checked.props), new Date().toISOString())
    ];
    if (eventName === 'decision_saved') {
      statements.push(
        db.prepare('INSERT OR IGNORE INTO analytics_cohorts (pseudonym, activation_day, consent_version, created_at) VALUES (?, ?, ?, ?)').bind(consent.pseudonym, day, consent.consentVersion, new Date().toISOString())
      );
    }
    await db.batch(statements);
    if (eventName === 'review_completed') {
      const row = await db.prepare('SELECT activation_day, last_review_day, w1, m1, m3 FROM analytics_cohorts WHERE pseudonym = ?').bind(consent.pseudonym).first<{ activation_day: string; last_review_day: string | null; w1: number; m1: number; m3: number }>();
      if (row) {
        const { cohort } = applyReview({ activationDay: row.activation_day, lastReviewDay: row.last_review_day, w1: !!row.w1, m1: !!row.m1, m3: !!row.m3 }, day);
        await db
          .prepare('UPDATE analytics_cohorts SET last_review_day = ?, w1 = ?, m1 = ?, m3 = ? WHERE pseudonym = ?')
          .bind(cohort.lastReviewDay, cohort.w1 ? 1 : 0, cohort.m1 ? 1 : 0, cohort.m3 ? 1 : 0, consent.pseudonym)
          .run();
      }
    }
  } catch {
    // Measurement must never break a save or review.
  }
}
