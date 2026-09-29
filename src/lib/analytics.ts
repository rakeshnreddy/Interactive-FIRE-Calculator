// Consented, first-party product measurement (B12), per docs/MEASUREMENT_AND_EXPERIMENT_PLAN.md.
// Pure and shared by the browser and Pages Functions: an allowlisted event contract, validation that
// rejects anything outside it, and the W1/M1/M3 cohort definitions with matured denominators.

export const ANALYTICS_CONSENT_VERSION = '2026-09-26';
export const ANALYTICS_EVENT_VERSION = 1;
export const RAW_EVENT_RETENTION_DAYS = 90;
export const COHORT_RETENTION_DAYS = 120;
export const MAX_EVENTS_PER_REQUEST = 20;
export const MAX_EVENTS_PER_PSEUDONYM_PER_DAY = 500;
export const REPORT_SUPPRESSION_THRESHOLD = 10;

type PropRule = readonly string[] | 'slug';

// Every property is an enumeration or a registry slug. No amounts, free text, URLs or identifiers.
export const EVENT_SCHEMAS = {
  calculation_completed: { slug: 'slug', engine: ['fire-ts-v1', 'registry-v1'], outcome: ['valid', 'invalid'] },
  comparison_viewed: { family: ['fire', 'calculator'] },
  decision_save_attempted: { family: ['fire', 'calculator'], destination: ['account', 'browser'] },
  review_due_opened: { source: ['in-app'] },
  decision_saved: { family: ['fire', 'calculator'] },
  review_completed: { decision: ['keep', 'revise', 'defer'] }
} as const satisfies Record<string, Record<string, PropRule>>;

export type AnalyticsEventName = keyof typeof EVENT_SCHEMAS;
export const CLIENT_EVENTS: AnalyticsEventName[] = ['calculation_completed', 'comparison_viewed', 'decision_save_attempted', 'review_due_opened'];
export const SERVER_EVENTS: AnalyticsEventName[] = ['decision_saved', 'review_completed'];

export type AnalyticsEvent = {
  eventId: string;
  eventName: AnalyticsEventName;
  eventVersion: number;
  occurredDay: string;
  release: string;
  props: Record<string, string>;
};

const EVENT_KEYS = ['eventId', 'eventName', 'eventVersion', 'occurredDay', 'release', 'props'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateClientEvent(value: unknown): { ok: true; event: AnalyticsEvent } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: 'Event must be an object.' };
  const extra = Object.keys(value).filter((key) => !EVENT_KEYS.includes(key));
  if (extra.length) return { ok: false, error: `Unknown event fields: ${extra.join(', ')}` };
  const { eventId, eventName, eventVersion, occurredDay, release, props } = value;
  if (typeof eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(eventId)) return { ok: false, error: 'eventId must be a random UUID.' };
  if (typeof eventName !== 'string' || !CLIENT_EVENTS.includes(eventName as AnalyticsEventName)) return { ok: false, error: 'eventName is not an allowed client event.' };
  if (eventVersion !== ANALYTICS_EVENT_VERSION) return { ok: false, error: 'Unsupported eventVersion.' };
  if (typeof occurredDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(occurredDay)) return { ok: false, error: 'occurredDay must be a UTC day.' };
  if (typeof release !== 'string' || !/^[a-z0-9.-]{1,40}$/.test(release)) return { ok: false, error: 'release must be a short version label.' };
  const propsCheck = validateProps(eventName as AnalyticsEventName, props);
  if (!propsCheck.ok) return propsCheck;
  return { ok: true, event: { eventId, eventName: eventName as AnalyticsEventName, eventVersion, occurredDay, release, props: propsCheck.props } };
}

export function validateProps(eventName: AnalyticsEventName, props: unknown): { ok: true; props: Record<string, string> } | { ok: false; error: string } {
  if (!isRecord(props)) return { ok: false, error: 'props must be an object.' };
  const schema = EVENT_SCHEMAS[eventName] as Record<string, PropRule>;
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    const rule = schema[key];
    if (!rule) return { ok: false, error: `Property ${key} is not allowed for ${eventName}.` };
    if (typeof value !== 'string') return { ok: false, error: `Property ${key} must be a string.` };
    const allowed = rule === 'slug' ? /^[a-z0-9-]{1,60}$/.test(value) : (rule as readonly string[]).includes(value);
    if (!allowed) return { ok: false, error: `Property ${key} has a value outside the allowed set.` };
    clean[key] = value;
  }
  for (const key of Object.keys(schema)) {
    if (!(key in clean)) return { ok: false, error: `Property ${key} is required for ${eventName}.` };
  }
  return { ok: true, props: clean };
}

// ---------------------------------------------------------------------------
// Cohorts (activation = first saved decision). Days are whole UTC days.
// ---------------------------------------------------------------------------

export type Cohort = {
  activationDay: string;
  lastReviewDay: string | null;
  w1: boolean;
  m1: boolean;
  m3: boolean;
};

export function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export type ReviewCredit = { cohort: Cohort; returningReview: boolean };

// W1: explicit follow-up on days 1-7 (early metric). A returning review needs >= 7 days since the
// baseline or the previous completed review; only returning reviews can earn M1 (days 21-45) or
// M3 (days 76-105).
export function applyReview(cohort: Cohort, reviewDay: string): ReviewCredit {
  const days = dayDiff(cohort.activationDay, reviewDay);
  const sincePrevious = dayDiff(cohort.lastReviewDay ?? cohort.activationDay, reviewDay);
  const returningReview = sincePrevious >= 7;
  return {
    returningReview,
    cohort: {
      activationDay: cohort.activationDay,
      lastReviewDay: reviewDay,
      w1: cohort.w1 || (days >= 1 && days <= 7),
      m1: cohort.m1 || (returningReview && days >= 21 && days <= 45),
      m3: cohort.m3 || (returningReview && days >= 76 && days <= 105)
    }
  };
}

type Rate = { eligible: number; completed: number; rate: number | null; suppressed: boolean };

function rate(eligible: number, completed: number): Rate {
  const suppressed = eligible < REPORT_SUPPRESSION_THRESHOLD;
  return { eligible, completed: suppressed ? 0 : completed, rate: suppressed || eligible === 0 ? null : completed / eligible, suppressed };
}

// Only cohorts whose window has closed count in a denominator; open windows are not churn.
export function buildCohortReport(cohorts: Cohort[], today: string): { w1: Rate; m1: Rate; m3: Rate } {
  const matured = (minDays: number) => cohorts.filter((c) => dayDiff(c.activationDay, today) > minDays);
  const w1 = matured(7);
  const m1 = matured(45);
  const m3 = matured(105);
  return {
    w1: rate(w1.length, w1.filter((c) => c.w1).length),
    m1: rate(m1.length, m1.filter((c) => c.m1).length),
    m3: rate(m3.length, m3.filter((c) => c.m3).length)
  };
}

export const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
