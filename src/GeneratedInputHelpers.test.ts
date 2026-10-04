import { describe, expect, it } from 'vitest';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';

const all = seoCalculators.flatMap((c) => c.inputs.map((input) => ({ slug: c.slug, ...input })));
const helper = (slug: string, key: string) => seoCalculators.find((c) => c.slug === slug)!.inputs.find((i) => i.key === key)!.helper ?? '';
const byLabel = (label: string) => all.find((i) => i.label === label)!;

describe('B66 truthful generated input helpers', () => {
  it('never emits the defective generic phrasings', () => {
    for (const input of all) {
      expect(input.helper, `${input.slug}.${input.key}`).toBeTruthy();
      expect(input.helper, `${input.slug}.${input.key}`).not.toMatch(/unless the label says otherwise|recurring amount|years in years|in years in years|per year in years/i);
    }
  });

  it('does not call shares, fees or taxes yearly rates', () => {
    for (const label of ['Down payment percent', 'GST rate', 'TDS rate', 'Stamp duty rate', 'Transfer fee', 'Salary exemption cap', 'Max EMI-to-income', 'Closing cost rate', 'Estimated withholding rate']) {
      expect(byLabel(label).helper, label).toBe('Enter as a percentage, for example 18 for 18%.');
    }
    for (const label of ['Interest rate', 'APR', 'Annual return', 'Inflation rate', 'Mortgage rate']) {
      expect(byLabel(label).helper, label).toBe('Yearly rate as a percentage, for example 7.5 for 7.5% a year.');
    }
  });

  it('says how often a money amount applies only when the label says so', () => {
    expect(byLabel('Monthly rent').helper).toBe('Amount each month in the calculator currency.');
    expect(byLabel('Annual CTC').helper).toBe('Amount each year in the calculator currency.');
    expect(byLabel('Foreclosure payment').helper).toBe('Enter the foreclosure payment in the calculator currency.');
    expect(byLabel('Recast principal payment').helper).toBe('Enter the recast principal payment in the calculator currency.');
  });

  it('describes years and pay periods without tautology', () => {
    expect(byLabel('Years').helper).toBe('Number of years; 1.5 means 18 months.');
    expect(byLabel('Tenure').helper).toBe('In years; 1.5 means 18 months.');
    expect(byLabel('Promo period').helper).toBe('Number of months, for example 6 or 18.');
    expect(byLabel('Months of coverage').helper).toBe('Number of months, for example 6 or 18.');
    expect(byLabel('Fixed period').helper).toBe('In years; 1.5 means 18 months.');
    expect(byLabel('Repayment years').helper).toBe('Number of years; 1.5 means 18 months.');
    expect(byLabel('Pay periods per year').helper).toBe('Number of pay periods in a year; for example, 26 for biweekly pay.');
  });

  it('leaves explicit helpers, defaults and results unchanged', () => {
    expect(helper('fd', 'principal')).toBe('One-time amount placed in the deposit at the start; no later deposits are added.');
    expect(helper('rd', 'monthly')).toBe('Same amount every month, added at the end of each month.');
    expect(helper('ppf', 'years')).toBe('Whole financial years. The account can be closed after 15 years or extended in 5-year blocks.');
    const rd = seoCalculators.find((c) => c.slug === 'rd')!;
    expect(calculateSeoCalculator(rd, Object.fromEntries(rd.inputs.map((i) => [i.key, i.defaultValue]))).metrics[0].value).toBeCloseTo(1829460.3518170852, 6);
  });
});
