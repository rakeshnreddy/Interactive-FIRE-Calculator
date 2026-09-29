/// <reference types="@cloudflare/workers-types" />
// Scheduled retention for consented analytics (B12). Pages Functions have no Cron Triggers, so this
// tiny Worker runs once a day and applies the same purge statements as the ingest path, whether or
// not any visitor sends an event. It has no HTTP purge route and never logs user data.
import { retentionCutoffs, retentionStatements } from '../../../src/lib/analyticsRetention';

export type RetentionEnv = { DB?: D1Database };

export type RetentionRunResult = { day: string; rawEventsBefore: string; cohortsBefore: string; eventsDeleted: number; cohortsDeleted: number };

export async function runRetention(env: RetentionEnv, now: Date = new Date()): Promise<RetentionRunResult> {
  if (!env.DB || typeof env.DB.prepare !== 'function') throw new Error('Analytics retention: DB binding is missing');
  const day = now.toISOString().slice(0, 10);
  const cutoffs = retentionCutoffs(day);
  // A D1 failure must fail the scheduled run (visible in the Worker's cron logs), not report success.
  const results = await env.DB.batch(retentionStatements(env.DB, day));
  return {
    day,
    ...cutoffs,
    eventsDeleted: results[0]?.meta?.changes ?? 0,
    cohortsDeleted: results[1]?.meta?.changes ?? 0
  };
}

export default {
  async scheduled(controller: ScheduledController, env: RetentionEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runRetention(env, new Date(controller.scheduledTime)).then((result) => {
        // Counts only: no identifiers, pseudonyms or properties are ever logged.
        console.log(`analytics-retention ${result.day}: events<${result.rawEventsBefore} deleted=${result.eventsDeleted}, cohorts<${result.cohortsBefore} deleted=${result.cohortsDeleted}`);
      })
    );
  },
  // No HTTP surface: retention is time-driven only.
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  }
};
