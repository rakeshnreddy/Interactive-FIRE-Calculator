import { describe, expect, it } from 'vitest';

import {
  destinationTypeForRoute,
  parseCalculatorSavePayload
} from '../functions/_lib/calculatorResults';

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
});
