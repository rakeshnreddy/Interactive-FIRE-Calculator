import { describe, expect, it } from 'vitest';

import { parseFirePlanPayload, parsePlanVersionNumber } from '../functions/_lib/firePlans';

const snapshot = {
  plan: { annualExpense: 80_000 },
  timeline: { currentAge: 40, planEndAge: 90, retirementAge: 55 }
};

describe('FIRE plan payload validation', () => {
  it('normalizes Phase 6 metadata and concurrency fields', () => {
    expect(
      parseFirePlanPayload({
        expectedVersionNumber: 3,
        goalId: '  goal-1  ',
        label: '  Lower spending  ',
        name: '  Retirement plan  ',
        notes: '  Tested after account update.  ',
        result: { requiredPortfolio: 2_000_000 },
        snapshot
      })
    ).toEqual({
      ok: true,
      value: {
        expectedVersionNumber: 3,
        goalId: 'goal-1',
        label: 'Lower spending',
        name: 'Retirement plan',
        notes: 'Tested after account update.',
        result: { requiredPortfolio: 2_000_000 },
        snapshot
      }
    });
  });

  it('accepts an explicit null goal and omitted version metadata', () => {
    expect(
      parseFirePlanPayload({
        goalId: null,
        name: 'Retirement plan',
        result: {},
        snapshot
      })
    ).toMatchObject({
      ok: true,
      value: {
        expectedVersionNumber: undefined,
        goalId: null,
        label: null,
        notes: null
      }
    });
  });

  it('rejects stale-version and metadata shapes at the boundary', () => {
    expect(
      parseFirePlanPayload({
        expectedVersionNumber: 0,
        name: 'Retirement plan',
        result: {},
        snapshot
      })
    ).toEqual({ error: 'expectedVersionNumber must be a positive integer.', ok: false });

    expect(
      parseFirePlanPayload({
        label: 'x'.repeat(121),
        name: 'Retirement plan',
        result: {},
        snapshot
      })
    ).toEqual({ error: 'label must be 120 characters or fewer.', ok: false });
  });
});

describe('plan version route parsing', () => {
  it('accepts only positive safe integer path values', () => {
    expect(parsePlanVersionNumber('4')).toBe(4);
    expect(parsePlanVersionNumber('0')).toBeNull();
    expect(parsePlanVersionNumber('-1')).toBeNull();
    expect(parsePlanVersionNumber('1.5')).toBeNull();
    expect(parsePlanVersionNumber('abc')).toBeNull();
    expect(parsePlanVersionNumber(undefined)).toBeNull();
  });
});
