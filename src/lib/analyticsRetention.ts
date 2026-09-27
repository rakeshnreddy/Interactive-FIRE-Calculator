// Retention policy for consented analytics (B12): raw events are kept RAW_EVENT_RETENTION_DAYS,
// cohort membership COHORT_RETENTION_DAYS after activation. The same statements run from the
// Pages ingest path and from the scheduled retention Worker so the two cannot drift.
import { COHORT_RETENTION_DAYS, RAW_EVENT_RETENTION_DAYS, addDays } from './analytics';

type Bindable = { bind: (...values: unknown[]) => unknown };
type PreparingDatabase = { prepare: (sql: string) => Bindable };

export const RAW_EVENT_PURGE_SQL = 'DELETE FROM analytics_events WHERE occurred_day < ?';
export const COHORT_PURGE_SQL = 'DELETE FROM analytics_cohorts WHERE activation_day < ?';

export function retentionCutoffs(day: string): { rawEventsBefore: string; cohortsBefore: string } {
  return { rawEventsBefore: addDays(day, -RAW_EVENT_RETENTION_DAYS), cohortsBefore: addDays(day, -COHORT_RETENTION_DAYS) };
}

export function retentionStatements<T>(db: { prepare: (sql: string) => { bind: (...values: unknown[]) => T } }, day: string): T[] {
  const cutoffs = retentionCutoffs(day);
  return [db.prepare(RAW_EVENT_PURGE_SQL).bind(cutoffs.rawEventsBefore), db.prepare(COHORT_PURGE_SQL).bind(cutoffs.cohortsBefore)];
}

export type { PreparingDatabase };
