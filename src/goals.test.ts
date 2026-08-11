import { describe, expect, it } from 'vitest';

import {
  parseGoalCreatePayload,
  parseGoalUpdatePayload,
  summarizeGoals,
  type Goal
} from '../functions/_lib/goals';

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    currentAmountCents: 2_500,
    daysUntilTarget: 10,
    goalType: 'emergency_fund',
    id: 'goal-1',
    isOverdue: false,
    name: 'Emergency fund',
    progressPercent: 25,
    remainingAmountCents: 7_500,
    status: 'active',
    targetAmountCents: 10_000,
    targetDate: '2099-01-01',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('goal payload validation', () => {
  it('normalizes a valid create payload', () => {
    expect(
      parseGoalCreatePayload({
        currentAmountCents: 1_500,
        goalType: 'travel',
        name: '  Japan trip  ',
        targetAmountCents: 8_000,
        targetDate: '2027-04-15'
      })
    ).toEqual({
      ok: true,
      value: {
        currentAmountCents: 1_500,
        goalType: 'travel',
        name: 'Japan trip',
        targetAmountCents: 8_000,
        targetDate: '2027-04-15'
      }
    });
  });

  it('rejects invalid money and calendar dates', () => {
    expect(
      parseGoalCreatePayload({
        currentAmountCents: -1,
        goalType: 'home',
        name: 'Home',
        targetAmountCents: 0,
        targetDate: '2027-02-30'
      })
    ).toMatchObject({ ok: false });

    expect(parseGoalUpdatePayload({ targetDate: '2027-02-30' })).toEqual({
      error: 'targetDate must be a real calendar date.',
      ok: false
    });
  });

  it('rejects empty updates and archived status writes', () => {
    expect(parseGoalUpdatePayload({})).toEqual({
      error: 'At least one valid goal field is required.',
      ok: false
    });
    expect(parseGoalUpdatePayload({ status: 'archived' })).toMatchObject({ ok: false });
  });
});

describe('goal summaries', () => {
  it('caps funded progress and finds the earliest unfinished dated goal', () => {
    const summary = summarizeGoals([
      goal({
        currentAmountCents: 12_000,
        id: 'overfunded',
        progressPercent: 100,
        remainingAmountCents: 0,
        targetAmountCents: 10_000,
        targetDate: '2099-08-01'
      }),
      goal({
        currentAmountCents: 1_000,
        id: 'next',
        progressPercent: 10,
        remainingAmountCents: 9_000,
        targetDate: '2099-02-01'
      }),
      goal({
        currentAmountCents: 10_000,
        id: 'complete',
        progressPercent: 100,
        remainingAmountCents: 0,
        status: 'completed',
        targetDate: '2099-01-01'
      }),
      goal({
        id: 'paused-overdue',
        isOverdue: true,
        status: 'paused',
        targetDate: '2000-01-01'
      })
    ]);

    expect(summary).toMatchObject({
      activeGoalCount: 2,
      completedGoalCount: 1,
      fundedPercent: 58.8,
      goalCount: 4,
      overdueGoalCount: 1,
      pausedGoalCount: 1,
      totalCurrentCents: 25_500,
      totalTargetCents: 40_000
    });
    expect(summary.nextGoal?.id).toBe('paused-overdue');
  });
});
