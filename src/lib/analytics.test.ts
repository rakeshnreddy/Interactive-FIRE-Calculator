import { describe, expect, it } from 'vitest';
import { addDays, applyReview, buildCohortReport, validateClientEvent, type Cohort } from './analytics';

const base = { eventId: '3f2b8a1c-5d6e-4f70-8a9b-0c1d2e3f4a5b', eventVersion: 1, occurredDay: '2026-09-26', release: 'b12' };
const start = '2026-01-01';
const fresh = (): Cohort => ({ activationDay: start, lastReviewDay: null, w1: false, m1: false, m3: false });

describe('event contract', () => {
  it('accepts an allowlisted client event', () => {
    const result = validateClientEvent({ ...base, eventName: 'calculation_completed', props: { slug: 'fire', engine: 'fire-ts-v1', outcome: 'valid' } });
    expect(result.ok).toBe(true);
  });

  it('rejects financial fields, raw URLs, identifiers, unknown props and server-only events', () => {
    const bad = [
      { ...base, eventName: 'calculation_completed', props: { slug: 'fire', engine: 'fire-ts-v1', outcome: 'valid', amount: '80000' } },
      { ...base, eventName: 'calculation_completed', props: { slug: 'https://x.test/?q=1', engine: 'fire-ts-v1', outcome: 'valid' } },
      { ...base, eventName: 'comparison_viewed', props: { family: 'fire' }, userId: 'user_123' },
      { ...base, eventName: 'comparison_viewed', props: { family: 'fire', note: 'free text' } },
      { ...base, eventName: 'decision_saved', props: { family: 'fire' } },
      { ...base, eventName: 'comparison_viewed', props: { family: 'fire' }, eventId: 'not-random' },
      { ...base, eventName: 'comparison_viewed', props: {} },
      { ...base, eventName: 'calculation_completed', props: { slug: 'fire', engine: 'fire-ts-v1', outcome: 12 } }
    ];
    for (const event of bad) expect(validateClientEvent(event).ok).toBe(false);
  });
});

describe('cohort definition fixtures (MEASUREMENT_AND_EXPERIMENT_PLAN)', () => {
  it('activation without return earns nothing', () => {
    expect(fresh()).toMatchObject({ w1: false, m1: false, m3: false });
  });

  it('day-3 follow-up is W1 only and not a returning review', () => {
    const { cohort, returningReview } = applyReview(fresh(), addDays(start, 3));
    expect(cohort).toMatchObject({ w1: true, m1: false, m3: false });
    expect(returningReview).toBe(false);
  });

  it('day-7 follow-up earns W1 and first returning-review credit', () => {
    const { cohort, returningReview } = applyReview(fresh(), addDays(start, 7));
    expect(cohort.w1).toBe(true);
    expect(returningReview).toBe(true);
  });

  it('day-30 review is M1; a second review needs 7 more days to qualify again', () => {
    const first = applyReview(fresh(), addDays(start, 30));
    expect(first.cohort.m1).toBe(true);
    expect(applyReview(first.cohort, addDays(start, 33)).returningReview).toBe(false);
    expect(applyReview(first.cohort, addDays(start, 37)).returningReview).toBe(true);
  });

  it('a day-104 return still earns M3 from cohort membership after day-90 raw cleanup', () => {
    let cohort = applyReview(fresh(), addDays(start, 30)).cohort;
    cohort = applyReview(cohort, addDays(start, 104)).cohort;
    expect(cohort.m3).toBe(true);
  });

  it('reports only matured denominators and suppresses cells under 10', () => {
    const cohorts = Array.from({ length: 12 }, (_, i) => ({ ...fresh(), m1: i < 4 }));
    const atDay40 = buildCohortReport(cohorts, addDays(start, 40));
    expect(atDay40.m1.eligible).toBe(0);
    const atDay50 = buildCohortReport(cohorts, addDays(start, 50));
    expect(atDay50.m1).toMatchObject({ eligible: 12, completed: 4, suppressed: false });
    expect(atDay50.m1.rate).toBeCloseTo(1 / 3);
    const small = buildCohortReport(cohorts.slice(0, 5), addDays(start, 50));
    expect(small.m1).toMatchObject({ suppressed: true, rate: null, completed: 0 });
  });
});
