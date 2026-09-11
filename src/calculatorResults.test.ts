import { describe, expect, it, vi } from 'vitest';

import {
  createSavedCalculatorResult,
  destinationTypeForRoute,
  goalPayloadFromCalculator,
  INCOMPATIBLE_GOAL_CURRENCY_CODE,
  IncompatibleGoalCurrencyError,
  parseCalculatorSavePayload,
  targetDateForYears,
  type CalculatorSavePayload
} from '../functions/_lib/calculatorResults';
import * as sessionModule from '../functions/_lib/session';
import { onRequestPost } from '../functions/api/calculator-results/index';

const validPayload = {
  calculatorCategory: 'Planning',
  calculatorRegion: 'Global',
  calculatorSlug: 'savings-goal',
  calculatorTitle: 'Savings Goal Calculator',
  conversionLabel: 'Create savings goal',
  conversionRoute: '/goals',
  currency: 'USD',
  inputValues: {
    current: 1000,
    rate: 5,
    target: 10000,
    years: 3
  },
  result: {
    assumptions: ['Monthly savings are added at month end.'],
    metrics: [
      {
        description: 'Estimated monthly contribution required to reach the target.',
        label: 'Monthly savings needed',
        value: 236.72,
        valueType: 'currency'
      },
      {
        label: 'Remaining target',
        value: 8842,
        valueType: 'currency'
      }
    ],
    narrative: 'Estimated monthly contribution required to reach the target.'
  }
} as const;

describe('calculator result save payload validation', () => {
  it('accepts a valid public calculator result save payload', () => {
    expect(parseCalculatorSavePayload(validPayload)).toEqual({
      ok: true,
      value: {
        calculatorCategory: 'Planning',
        calculatorRegion: 'Global',
        calculatorSlug: 'savings-goal',
        calculatorTitle: 'Savings Goal Calculator',
        conversionLabel: 'Create savings goal',
        conversionRoute: '/goals',
        currency: 'USD',
        inputValues: validPayload.inputValues,
        result: validPayload.result
      }
    });
  });

  it('rejects unsupported destinations and non-finite inputs', () => {
    expect(parseCalculatorSavePayload({ ...validPayload, conversionRoute: '/admin' })).toEqual({
      error: 'conversionRoute is not supported.',
      ok: false
    });

    expect(
      parseCalculatorSavePayload({
        ...validPayload,
        inputValues: { target: Number.NaN }
      })
    ).toEqual({
      error: 'target must be a finite number.',
      ok: false
    });
  });

  it('maps calculator conversion routes to saved-result destination types', () => {
    expect(destinationTypeForRoute('/goals')).toBe('goal');
    expect(destinationTypeForRoute('/accounts')).toBe('account');
    expect(destinationTypeForRoute('/plans')).toBe('plan');
    expect(destinationTypeForRoute('/transactions')).toBe('transaction');
  });

  it('preserves fractional-year goal deadlines instead of rounding to whole years', () => {
    expect(targetDateForYears(2.5, new Date('2026-08-09T00:00:00.000Z'))).toBe('2029-02-09');
    expect(targetDateForYears(0.25, new Date('2026-08-09T00:00:00.000Z'))).toBe('2026-11-09');
    expect(targetDateForYears(1 / 12, new Date('2027-01-31T18:30:00.000Z'))).toBe('2027-02-28');
    expect(targetDateForYears(1 / 12, new Date('2028-01-31T18:30:00.000Z'))).toBe('2028-02-29');
    expect(targetDateForYears(0, new Date('2026-08-09T00:00:00.000Z'))).toBeNull();
  });

  it('uses the inflation-resolved Savings Goal target at the Goal persistence boundary', () => {
    const parsed = parseCalculatorSavePayload({
      ...validPayload,
      inputValues: {
        ...validPayload.inputValues,
        resolvedTarget: 13_439.16,
        targetBasis: 1
      }
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(goalPayloadFromCalculator(parsed.value)?.targetAmountCents).toBe(1_343_916);
    }
  });

  it('accepts the versioned Compound Interest numeric save boundary', () => {
    const compoundPayload = {
      ...validPayload,
      calculatorCategory: 'Investing',
      calculatorSlug: 'compound-interest',
      calculatorTitle: 'Compound Interest Calculator',
      conversionLabel: 'Save as investment account',
      conversionRoute: '/accounts' as const,
      currency: 'EUR',
      inputValues: {
        annualContributionIncreasePercent: 3,
        annualFeePercent: 0.4,
        annualTopUp: 1000,
        compoundingFrequency: 12,
        contributionFrequency: 12,
        contributionTiming: 0,
        futureDepositAmount: 5000,
        futureDepositYear: 2.25,
        futureWithdrawalAmount: 1500,
        futureWithdrawalYear: 7.5,
        inflationPercent: 2.5,
        monthly: 500,
        principal: 10000,
        rate: 8,
        rateBasis: 0,
        recurringContribution: 500,
        target: 150000,
        targetBasis: 0,
        years: 10.5
      },
      result: {
        assumptions: ['Formula version finpath-compound-v2.'],
        metrics: [
          {
            description: 'Projected ending value.',
            label: 'Projected value',
            tone: 'accent',
            value: 140000,
            valueType: 'currency'
          },
          {
            description: 'Inflation-adjusted value.',
            label: 'Today’s buying power',
            value: 109000,
            valueType: 'currency'
          }
        ],
        narrative: 'Projection under constant assumptions.'
      }
    } as const;

    const parsed = parseCalculatorSavePayload(compoundPayload);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.calculatorSlug).toBe('compound-interest');
      expect(parsed.value.conversionRoute).toBe('/accounts');
      expect(parsed.value.currency).toBe('EUR');
      expect(parsed.value.inputValues.target).toBe(150000);
      expect(parsed.value.inputValues.contributionFrequency).toBe(12);
      expect(parsed.value.inputValues.futureDepositYear).toBe(2.25);
      expect(parsed.value.inputValues.futureWithdrawalAmount).toBe(1500);
    }
  });

  it('rejects incompatible currency conversion into goals with typed 400 error', () => {
    for (const currency of ['EUR', 'INR', 'GBP', 'CAD', 'JPY', 'AUD']) {
      const parsed = parseCalculatorSavePayload({
        ...validPayload,
        conversionRoute: '/goals',
        currency
      });

      expect(parsed).toEqual({
        code: INCOMPATIBLE_GOAL_CURRENCY_CODE,
        error: 'Goals currently support USD only. Currency conversion into goals is not supported.',
        ok: false
      });
    }
  });

  it('returns null from goalPayloadFromCalculator for non-USD payloads', () => {
    const nonUsdPayload = {
      ...validPayload,
      currency: 'EUR'
    } as unknown as CalculatorSavePayload;
    expect(goalPayloadFromCalculator(nonUsdPayload)).toBeNull();

    const inrPayload = {
      ...validPayload,
      currency: 'INR'
    } as unknown as CalculatorSavePayload;
    expect(goalPayloadFromCalculator(inrPayload)).toBeNull();
  });

  it('throws IncompatibleGoalCurrencyError and makes zero database writes on non-USD goal save', async () => {
    const spyDb = {
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn()
    } as unknown as D1Database;

    const nonUsdPayload = {
      ...validPayload,
      conversionRoute: '/goals',
      currency: 'EUR'
    } as unknown as CalculatorSavePayload;

    await expect(
      createSavedCalculatorResult(spyDb, 'user_123', nonUsdPayload)
    ).rejects.toThrow(IncompatibleGoalCurrencyError);

    expect(spyDb.prepare).not.toHaveBeenCalled();
    expect(spyDb.batch).not.toHaveBeenCalled();
    expect(spyDb.exec).not.toHaveBeenCalled();
  });

  it('accepts non-USD currency on supported account destination', () => {
    const accountPayload = {
      ...validPayload,
      conversionRoute: '/accounts' as const,
      currency: 'EUR'
    };

    const parsed = parseCalculatorSavePayload(accountPayload);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.currency).toBe('EUR');
      expect(parsed.value.conversionRoute).toBe('/accounts');
    }
  });
});

describe('calculator results API endpoint (onRequestPost)', () => {
  it('enforces auth preflight before body parse', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    });

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json'
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: {} as D1Database },
      functionPath: '/api/calculator-results',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(401);
  });

  it('rejects forged non-USD goal save request with typed 400 and zero database writes', async () => {
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

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        conversionRoute: '/goals',
        currency: 'EUR'
      })
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: spyDb },
      functionPath: '/api/calculator-results',
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

  it('rejects malformed or missing currency with status 400', async () => {
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

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        currency: 'invalid'
      })
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: spyDb },
      functionPath: '/api/calculator-results',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: 'currency must be a three-letter code.'
    });

    expect(spyDb.prepare).not.toHaveBeenCalled();
  });
});
