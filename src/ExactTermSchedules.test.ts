import { describe, expect, it } from 'vitest';
import { scheduleToCsv } from './CalculatorLibrary';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { buildCalculatorDetailSchedule } from './lib/calculatorStudios';

const find = (slug: string) => seoCalculators.find((c) => c.slug === slug)!;
const defaults = (slug: string) => Object.fromEntries(find(slug).inputs.map((i) => [i.key, i.defaultValue])) as Record<string, number>;
const run = (slug: string, extra: Record<string, number>) => {
  const values = { ...defaults(slug), ...extra };
  const result = calculateSeoCalculator(find(slug), values);
  return { result, schedule: buildCalculatorDetailSchedule(find(slug), values, result)! };
};

describe('B63 exact-term schedules', () => {
  it.each(['investment-return', 'cagr'])('%s table uses the entered term and the headline rate', (slug) => {
    const { result, schedule } = run(slug, { years: 5.5 });
    // Decimal oracle: 1.8^(1/5.5) − 1.
    expect(result.metrics[0].value).toBeCloseTo(0.1127899192821328, 12);
    for (const row of schedule.rows) expect(Number(row.values.annualized)).toBeCloseTo(result.metrics[0].value, 12);
    const last = schedule.rows.at(-1)!;
    expect(last.values.year).toBe(5.5);
    expect(Number(last.values.value)).toBe(18000);
    expect(last.note).toMatch(/part year/i);
    expect(schedule.rows.map((r) => r.values.year)).toEqual(['Start', 1, 2, 3, 4, 5, 5.5]);
  });

  it.each([
    ['inflation', 10.5, 'futureCost', 15095.588987365667],
    ['roth-vs-traditional-ira', 25.5, 'rothValue', 30653.42267604345]
  ] as const)('%s final row equals the headline at a part-year term', (slug, years, key, oracle) => {
    const { result, schedule } = run(slug, { years });
    const last = schedule.rows.at(-1)!;
    expect(last.values.year).toBe(years);
    expect(Number(last.values[key])).toBeCloseTo(oracle, 6);
    expect(Number(last.values[key])).toBeCloseTo(result.metrics[0].value, 9);
    expect(last.note).toMatch(/part year/i);
    expect(scheduleToCsv(find(slug), schedule).trim().split('\n').at(-1)).toMatch(new RegExp(`^"?${years}"?,`));
  });

  it('runs EPF for exactly the engine months', () => {
    const { result, schedule } = run('epf', { years: 10.5 });
    const last = schedule.rows.at(-1)!;
    expect(schedule.rows).toHaveLength(11);
    expect(last.values.year).toBe(10.5);
    expect(Number(last.values.balance)).toBeCloseTo(4715707.764417067, 6);
    expect(Number(last.values.balance)).toBeCloseTo(result.metrics[0].value, 6);
    expect(Number(last.values.employee)).toBe(72000);
    expect(last.note).toMatch(/6 months/);
  });

  it('keeps whole-year rows identical to baseline', () => {
    const inflation = run('inflation', { years: 2 }).schedule.rows;
    expect(inflation.map((r) => [r.values.year, r.note])).toEqual([[1, undefined], [2, undefined]]);
    expect(Number(inflation.at(-1)!.values.futureCost)).toBeCloseTo(10816, 9);
    const cagr = run('cagr', { years: 2 }).schedule.rows;
    expect(cagr.map((r) => r.values.year)).toEqual(['Start', 1, 2]);
    expect(Number(cagr.at(-1)!.values.value)).toBe(18000);
    expect(run('roth-vs-traditional-ira', { years: 2 }).schedule.rows).toHaveLength(2);
    const epf = run('epf', { years: 2 }).schedule.rows;
    expect(epf.map((r) => r.values.year)).toEqual([1, 2]);
    expect(epf.some((r) => r.note)).toBe(false);
  });
});
