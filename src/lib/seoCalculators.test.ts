import { describe, expect, it } from 'vitest';

import { calculateSeoCalculator, findSeoCalculator, seoCalculators } from './seoCalculators';

describe('seo calculator registry', () => {
  it('includes stable public routes for global, India, US, and long-tail calculators', () => {
    expect(findSeoCalculator('/calculators/compound-interest')?.region).toBe('Global');
    expect(findSeoCalculator('/calculators/sip')?.region).toBe('India');
    expect(findSeoCalculator('/calculators/mortgage')?.region).toBe('US');
    expect(findSeoCalculator('/calculators/rule-of-72')?.region).toBe('Global');
    expect(seoCalculators.length).toBeGreaterThanOrEqual(55);
  });
});

describe('calculateSeoCalculator', () => {
  it('projects compound interest with monthly contributions', () => {
    const calculator = findSeoCalculator('/calculators/compound-interest');
    expect(calculator).not.toBeNull();

    const result = calculateSeoCalculator(calculator!, {
      monthly: 500,
      principal: 10000,
      rate: 6,
      years: 10
    });

    expect(result.metrics[0].label).toBe('Projected value');
    expect(result.metrics[0].value).toBeGreaterThan(80_000);
  });

  it('computes EMI-style loan payments', () => {
    const calculator = findSeoCalculator('/calculators/emi');
    expect(calculator).not.toBeNull();

    const result = calculateSeoCalculator(calculator!, {
      principal: 1_000_000,
      rate: 9,
      years: 5
    });

    expect(result.metrics[0]).toMatchObject({
      label: 'Monthly payment',
      valueType: 'currency'
    });
    expect(result.metrics[0].value).toBeGreaterThan(20_000);
  });

  it('estimates debt payoff duration and interest', () => {
    const calculator = findSeoCalculator('/calculators/credit-card-payoff');
    expect(calculator).not.toBeNull();

    const result = calculateSeoCalculator(calculator!, {
      balance: 8_000,
      payment: 350,
      rate: 22
    });

    expect(result.metrics[0].label).toBe('Payoff time');
    expect(result.metrics[0].value).toBeGreaterThan(1);
    expect(result.metrics[1].label).toBe('Months to payoff');
  });

  it('keeps tax calculators as explicit rate-based estimates', () => {
    const calculator = findSeoCalculator('/calculators/income-tax-india');
    expect(calculator).not.toBeNull();

    const result = calculateSeoCalculator(calculator!, {
      deductions: 150_000,
      effectiveRate: 18,
      income: 1_500_000
    });

    expect(result.assumptions.join(' ')).toContain('planning estimates');
    expect(result.metrics.find((metric) => metric.label === 'Estimated tax')?.value).toBe(243_000);
  });
});
