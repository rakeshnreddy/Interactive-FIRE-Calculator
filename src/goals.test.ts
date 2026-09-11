import { describe, expect, it, vi } from 'vitest';

import {
  parseGoalCreatePayload,
  parseGoalUpdatePayload,
  summarizeGoals,
  type Goal
} from '../functions/_lib/goals';
import * as sessionModule from '../functions/_lib/session';
import { onRequestPost } from '../functions/api/goals/index';

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

  it('rejects explicit non-USD currency in create and update payloads', () => {
    expect(
      parseGoalCreatePayload({
        currency: 'EUR',
        currentAmountCents: 1_500,
        goalType: 'travel',
        name: 'Japan trip',
        targetAmountCents: 8_000,
        targetDate: '2027-04-15'
      })
    ).toEqual({
      code: 'INCOMPATIBLE_GOAL_CURRENCY',
      error: 'Goals currently support USD only. Currency conversion into goals is not supported.',
      ok: false
    });

    expect(
      parseGoalUpdatePayload({
        currency: 'INR',
        name: 'Updated trip'
      })
    ).toEqual({
      code: 'INCOMPATIBLE_GOAL_CURRENCY',
      error: 'Goals currently support USD only. Currency conversion into goals is not supported.',
      ok: false
    });
  });

  it('accepts explicit USD currency in create and update payloads', () => {
    expect(
      parseGoalCreatePayload({
        currency: 'USD',
        currentAmountCents: 1_500,
        goalType: 'travel',
        name: 'Japan trip',
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

    expect(
      parseGoalUpdatePayload({
        currency: 'USD',
        name: 'Updated trip'
      })
    ).toEqual({
      ok: true,
      value: {
        name: 'Updated trip'
      }
    });
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

describe('goals API endpoint (onRequestPost)', () => {
  it('enforces auth preflight before body parse', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    });

    const request = new Request('https://finpath.app/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json'
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: {} as D1Database },
      functionPath: '/api/goals',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(401);
  });

  it('rejects forged non-USD goal creation with typed 400 and zero database writes', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      auth: { userId: 'user_test_123' } as any,
      ok: true
    });

    const spyDb = {
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn()
    } as unknown as D1Database;

    const request = new Request('https://finpath.app/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency: 'EUR',
        currentAmountCents: 1_000,
        goalType: 'travel',
        name: 'Europe tour',
        targetAmountCents: 5_000,
        targetDate: '2027-06-01'
      })
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: spyDb },
      functionPath: '/api/goals',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      code: 'INCOMPATIBLE_GOAL_CURRENCY',
      error: 'Goals currently support USD only. Currency conversion into goals is not supported.'
    });

    expect(spyDb.prepare).not.toHaveBeenCalled();
    expect(spyDb.batch).not.toHaveBeenCalled();
    expect(spyDb.exec).not.toHaveBeenCalled();
  });
});
