import { describe, expect, it } from 'vitest';
import { buildCalculatorDetailSchedule, buildCalculatorStudioChart } from './calculatorStudios';
import { calculateSeoCalculator, seoCalculators } from './seoCalculators';

function fixture(slug: string, edits: Record<string, number> = {}) {
  const calculator = seoCalculators.find((item) => item.slug === slug)!;
  const values = { ...Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue])), ...edits };
  const result = calculateSeoCalculator(calculator, values);
  return { calculator, values, result, chart: buildCalculatorStudioChart(calculator, values, result) };
}

describe('B47 financial visual truth', () => {
  it('shows cash-to-close pieces, without inventing a loan', () => {
    const { chart } = fixture('closing-costs');
    expect(chart.type).toBe('waterfall');
    expect(chart.entries.map((entry) => entry.primary)).toEqual([90000, 13500, 103500]);
    expect(chart.entries.every((entry) => !/Month|Year/.test(entry.label))).toBe(true);
  });
  it('shows statutory purchase charges, without treating their rate as interest', () => {
    const { chart } = fixture('stamp-duty-registration');
    expect(chart.type).toBe('waterfall');
    expect(chart.entries.map((entry) => entry.primary)).toEqual([480000, 80000, 560000]);
  });
  it('keeps the interest-only principal owed, with a separately labelled amortizing comparator', () => {
    const { chart } = fixture('interest-only-mortgage', { principal: 300000, rate: 6.5, years: 30 });
    expect(chart.entries.every((entry) => entry.primary === 300000)).toBe(true);
    expect(chart.legend.secondary).toMatch(/amortizing.*balance/i);
    expect(chart.entries.at(-1)!.secondary).toBeLessThan(0.005);
  });
  it('starts the recast path after the principal payment', () => {
    const { chart } = fixture('mortgage-recast');
    expect(chart.entries[0].primary).toBe(250000);
    expect(chart.legend.primary).toMatch(/recast/i);
  });
  it('ends the selected prepayment path at its actual payoff month', () => {
    const { chart, result } = fixture('home-loan-prepayment');
    expect(result.metrics.find((m) => m.label === 'New payoff months')!.value).toBe(153);
    expect(chart.entries.at(-1)!.label).toBe('Month 153');
    expect(chart.entries[0].primary).toBe(5500000);
    expect(chart.entries.at(-1)!.primary).toBe(0);
  });
  it('shows full foreclosure as an immediate payoff, without future selected payments', () => {
    const { chart } = fixture('home-loan-foreclosure');
    expect(chart.entries).toHaveLength(1);
    expect(chart.entries[0].label).toBe('Start');
    expect(chart.entries[0].primary).toBe(0);
  });
  it('uses the disclosed annual-extra approximation in the biweekly chart AND table', () => {
    const { calculator, values, result, chart } = fixture('biweekly-mortgage-payment');
    const payoff = result.metrics.find((m) => m.label === 'Payoff months')!.value;
    expect(payoff).toBe(292);
    const schedule = buildCalculatorDetailSchedule(calculator, values)!;
    expect(schedule.rows).toHaveLength(292);
    expect(schedule.description).toMatch(/approximation|approximate/i);
    expect(chart.entries.at(-1)!.label).toBe('Month 292');
    expect(chart.entries.at(-1)!.primary).toBe(0);
    expect(chart.entries.at(-1)!.secondary).toBeCloseTo(Number(schedule.rows.at(-1)!.values.cumulativeInterest), 6);
  });
  it.each(['fha-loan', 'va-loan'])('%s includes financed upfront fees in its opening balance', (slug) => {
    const { chart } = fixture(slug, { homePrice: 400000, downPayment: 80000, feeRate: 1.75 });
    expect(chart.entries[0].primary).toBe(325600);
  });
  it('stops at the balloon date with the debt still due', () => {
    const { chart, result } = fixture('balloon-loan');
    expect(chart.entries.at(-1)!.primary).toBeCloseTo(result.metrics[0].value, 2);
    expect(chart.entries.at(-1)!.primary).toBeGreaterThan(0);
  });
  it('uses the refinanced principal and labels the original comparison separately', () => {
    const { chart } = fixture('mortgage-refinance');
    expect(chart.entries[0].primary).toBe(306000);
    expect(chart.entries[0].secondary).toBe(300000);
    expect(chart.legend.primary).toMatch(/refinanc|new/i);
  });
  it('shows DTI as ratios and escrow as monthly cost components', () => {
    const dti = fixture('debt-to-income');
    expect(dti.chart.type).toBe('waterfall');
    expect(dti.chart.valueType).toBe('percent');
    expect(dti.chart.entries.at(-1)!.primary).toBe(dti.result.metrics[0].value);
    const escrow = fixture('escrow');
    expect(escrow.chart.type).toBe('waterfall');
    expect(escrow.chart.entries.at(-1)!.primary).toBe(escrow.result.metrics[0].value);
  });
  it.each(['mortgage-points', 'apr', 'fha-vs-conventional', 'flat-vs-reducing-rate'])('%s compares real model outputs rather than an invented ordinary loan', (slug) => {
    const { chart, result } = fixture(slug);
    expect(chart.type).toBe('comparison');
    expect(chart.entries.find((entry) => entry.label === 'Base')!.primary).toBe(result.metrics[0].value);
  });
  it.each(['years', 'rate', 'principal'])('suppresses a loan timeline when %s is missing or nonfinite', (key) => {
    const { calculator, values, result } = fixture('mortgage');
    for (const invalid of [undefined, Number.NaN]) {
      expect(buildCalculatorStudioChart(calculator, { ...values, [key]: invalid } as Record<string, number>, result).entries).toEqual([]);
    }
  });
  it('keeps the affordability table on the same capacity as the headline', () => {
    const { calculator, values, result } = fixture('mortgage-affordability');
    const schedule = buildCalculatorDetailSchedule(calculator, values, result)!;
    expect(Number(schedule.rows.find((r) => r.id === 'eligible-loan')!.values.amount)).toBeCloseTo(result.metrics[0].value, 6);
    expect(Number(schedule.rows.find((r) => r.id === 'max-emi')!.values.amount)).toBe(2440); // min(9000 * .28, 9000 * .36 - 800)
  });
  it('reconciles ordinary selected-loan charts with their actual detail rows, including zero interest and extras', () => {
    for (const edits of [{}, { rate: 0 }, { extraMonthlyPayment: 1000, extraAnnualPayment: 5000 }]) {
      const { calculator, values, chart } = fixture('mortgage', edits as Record<string, number>);
      const schedule = buildCalculatorDetailSchedule(calculator, values)!;
      const last = schedule.rows.at(-1)!;
      expect(chart.entries.at(-1)!.primary).toBe(Number(last.values.endingBalance));
      expect(chart.entries.at(-1)!.secondary).toBe(Number(last.values.cumulativeInterest));
      expect(chart.entries.at(-1)!.label).toBe(`Month ${last.values.period}`);
    }
  });
});
