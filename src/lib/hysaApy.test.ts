import { describe, expect, it } from 'vitest';
import { calculateSeoCalculator, seoCalculators } from './seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios, buildCalculatorStudioChart } from './calculatorStudios';
import { buildCalculatorSummaryCsv } from './calculatorEngagement';
import { toSavedCalculatorResultSnapshot } from './api/calculatorResults';

const hysa = seoCalculators.find((c) => c.slug === 'hysa')!;
const defaults = Object.fromEntries(hysa.inputs.map((i) => [i.key, i.defaultValue]));
const method = 'APY includes compounding; this estimate converts it to an equivalent monthly rate.';
// Independent recurrence using annual-yield growth, with end-month deposits and end-year top-ups.
function reference(v: Record<string, number>) {
  let balance = v.principal;
  const growth = Math.pow(1 + v.rate / 100, 1 / 12);
  const months = Math.max(1, Math.round(v.years * 12));
  for (let m = 1; m <= months; m++) {
    balance = balance * growth + v.monthly;
    if (m % 12 === 0) balance += v.annualTopUp;
  }
  return balance;
}
describe('B48 HYSA effective APY contract', () => {
  it('makes a deposit grow by exactly the quoted annual yield over one year', () => {
    expect(calculateSeoCalculator(hysa, { ...defaults, monthly: 0, years: 1 }).metrics[0].value).toBeCloseTo(10425, 2);
  });
  it('matches the independent default golden rather than nominal APR compounding', () => {
    expect(calculateSeoCalculator(hysa, defaults).metrics[0].value).toBeCloseTo(30468.781876553145, 6);
  });
  it.each<Record<string, number>>([
    { rate: 0 }, { principal: 0 }, { annualTopUp: 1000 }, { years: 0.25 },
    { years: 0 }, { years: 1.5 }, { rate: 100, years: 1 }, { rate: 0.01, monthly: 0 }
  ])('reconciles result, actual schedule and chart for %j', (edits) => {
    const values: Record<string, number> = { ...defaults, ...edits };
    const result = calculateSeoCalculator(hysa, values);
    expect(result.metrics[0].value).toBeCloseTo(reference(values), 6);
    const schedule = buildCalculatorDetailSchedule(hysa, values, result)!;
    expect(Number(schedule.rows.at(-1)!.values.balance)).toBeCloseTo(reference(values), 6);
    const chart = buildCalculatorStudioChart(hysa, values, result);
    expect(chart.entries.at(-1)!.primary).toBe(Number(schedule.rows.at(-1)!.values.balance));
    expect(chart.entries.at(-1)!.label).toBe(`Month ${Math.max(1, Math.round(values.years * 12))}`);
  });
  it('preserves the method explanation through the existing snapshot parser and CSV export', () => {
    const result = calculateSeoCalculator(hysa, defaults);
    expect(result.assumptions).toContain(method);
    expect(toSavedCalculatorResultSnapshot(result)!.assumptions).toContain(method);
    const csv = buildCalculatorSummaryCsv(hysa, buildCalculatorScenarios(hysa, defaults), 'base', []);
    expect(csv).toContain('30468.781876');
  });
  it('uses effective APY in all scenarios, without mutating the entered values', () => {
    const before = { ...defaults };
    for (const s of buildCalculatorScenarios(hysa, defaults)) expect(s.result.metrics[0].value).toBeCloseTo(reference(s.values), 6);
    expect(defaults).toEqual(before);
  });
  it('preserves CD annual APY and existing nominal-rate goldens', () => {
    for (const [slug, expected] of [['cd', 10920.25], ['sip', 1829460.351817], ['401k', 275633.443391]] as const) {
      const calc = seoCalculators.find((c) => c.slug === slug)!;
      const values = Object.fromEntries(calc.inputs.map((i) => [i.key, i.defaultValue]));
      expect(calculateSeoCalculator(calc, values).metrics[0].value).toBeCloseTo(expected, 3);
    }
  });
});
