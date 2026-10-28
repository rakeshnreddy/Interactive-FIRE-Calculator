import { describe, expect, it } from 'vitest';
import { formatChartValue, scheduleToCsv } from './CalculatorLibrary';
import { buildCalculatorDetailSchedule } from './lib/calculatorStudios';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { calculateSavingsGoal, defaultSavingsGoalInputs } from './lib/savingsGoalCalculator';
import { formatStoredCurrency } from './lib/format';
import { formatCompactMoney } from './lib/money';
import { parseCalculatorSavePayload } from '../functions/_lib/calculatorResults';
import { toSavedCalculatorResultSnapshot } from './lib/api/calculatorResults';

const find = (slug: string) => seoCalculators.find(c => c.slug === slug)!;
function run(slug: string, extra: Record<string, number> = {}) {
  const calculator = find(slug);
  const values = { ...Object.fromEntries(calculator.inputs.map(i => [i.key, i.defaultValue])), ...extra };
  const result = calculateSeoCalculator(calculator, values);
  const schedule = buildCalculatorDetailSchedule(calculator, values, result)!;
  return { calculator, values, result, schedule, last: schedule?.rows.at(-1)! };
}

describe('B68 exact-term reconciliation', () => {
  it.each(['sip-goal', 'savings-goal'])('%s registry uses one monthly convention and stops at the entered term', slug => {
    const { result, last, schedule } = run(slug, { target: 100000, current: 10000, years: 1.5, rate: 8 });
    // Independent Decimal annuity oracle, n=18, r=.08/12.
    expect(result.metrics[0].value).toBeCloseTo(4655.960206171473, 8);
    expect(result.metrics[1].value).toBeCloseTo(11270.47936700411, 8);
    expect(result.modelVersion).toBe('savings-goal-monthly-v1');
    expect(last.values.year).toBe(1.5);
    expect(Number(last.values.balance)).toBeCloseTo(100000, 7);
    expect(Number(last.values.deposits)).toBeCloseTo(result.metrics[0].value * 6, 7);
    expect(schedule.rows).toHaveLength(2);
    expect(last.note).toMatch(/6 months/i);
  });

  it('preserves the dedicated v2 model and reconciles its default monthly convention', () => {
    const dedicated = calculateSavingsGoal({ ...defaultSavingsGoalInputs, years: 1.5 });
    expect(dedicated.requiredContribution).toBeCloseTo(4655.960206171473, 8);
    expect(dedicated.detailedSchedule.at(-1)?.closingBalance).toBeCloseTo(100000, 7);
  });

  it.each([0, 8])('keeps zero-current and already-funded goal cases honest at %s percent', rate => {
    const zero = run('sip-goal', { target: 100000, current: 0, years: 1.5, rate });
    expect(Number(zero.last.values.balance)).toBeCloseTo(100000, 7);
    const funded = run('sip-goal', { target: 80000, current: 100000, years: 1.5, rate });
    expect(funded.result.metrics[0].value).toBe(0);
    expect(Number(funded.last.values.balance)).toBeCloseTo(funded.result.metrics[1].value, 7);
    expect(funded.last.values.gap).toBe(0);
  });

  it.each([0.5, 5, 5.5, 55.5])('flat-rate loan table uses the same %s-year loan as its headline', years => {
    const { calculator, result, schedule, last } = run('flat-vs-reducing-rate', { principal: 500000, rate: 10, years });
    expect(last.values.year).toBe(years);
    expect(Number(last.values.extraCostToDate)).toBeCloseTo(result.metrics[2].value, 6);
    expect(Number(last.values.reducingBalance)).toBe(0);
    if (years === 5.5) expect(Number(last.values.extraCostToDate)).toBeCloseTo(122929.92332937747, 6);
    expect(scheduleToCsv(calculator, schedule).trim().split('\n').at(-1)).toMatch(new RegExp(`^${years},`));
  });

  it.each([0, 6.5])('interest-only comparison stops at 30.5 years at %s percent', rate => {
    const { result, schedule, last } = run('interest-only-mortgage', { principal: 300000, rate, years: 30.5 });
    expect(last.values.year).toBe(30.5);
    expect(Number(last.values.interestOnlyPaid)).toBeCloseTo(result.metrics[0].value * 6, 8);
    for (const row of schedule.rows) expect(Number(row.values.paymentGap) + result.metrics[0].value).toBeCloseTo(result.metrics[1].value, 8);
    if (rate) expect(result.metrics[1].value).toBeCloseTo(1886.1645497948086, 8);
    expect(Number(last.values.amortizingBalance)).toBeCloseTo(0, 6);
  });

  it.each([7.5, 35.5, 55.5])('rent-versus-buy cumulative table reconciles at %s years, including after payoff', years => {
    const { result, last } = run('rent-vs-buy', { rent: 2500, homePrice: 450000, downPayment: 90000, rate: 6.75, loanYears: 30, ownershipRate: 1.5, years });
    expect(last.values.year).toBe(years);
    expect(Number(last.values.netDifference)).toBeCloseTo(result.metrics.find(m => m.label === 'Buying minus renting over the stay')!.value, 6);
    if (years === 7.5) expect(Number(last.values.netDifference)).toBeCloseTo(-415.56195801564, 6);
  });

  it('retirement at its target age adds no future monthly or yearly contribution', () => {
    const { result, last } = run('retirement', { currentAge: 60, retirementAge: 60, currentSavings: 100000, monthly: 1200, annualTopUp: 12000 });
    expect(result.metrics[0].value).toBe(100000);
    expect(result.modelVersion).toBe('retirement-exact-term-v1');
    expect(last.values.balance).toBe(result.metrics[0].value);
    expect(last.values.deposits).toBe(0);
  });

  it.each([0, 12000])('retirement fractional schedule reconciles contributions with yearly top-up %s', annualTopUp => {
    const { result, schedule, last } = run('retirement', { currentAge: 38.5, retirementAge: 60, currentSavings: 100000, monthly: 1200, rate: 7, annualTopUp });
    expect(last.values.year).toBe(21.5);
    expect(last.values.age).toBe(60);
    expect(last.values.deposits).toBe(7200);
    expect(Number(last.values.balance)).toBeCloseTo(result.metrics[0].value, 6);
    expect(schedule.rows.reduce((sum, r) => sum + Number(r.values.deposits), 0)).toBe(1200 * 258 + annualTopUp * 21);
    if (!annualTopUp) expect(result.metrics[0].value).toBeCloseTo(1145114.9058702743, 6);
    expect(result.assumptions.join(' ')).toMatch(/existing savings.*annual.*contributions.*monthly/i);
  });

  it('uses whole contribution months without extending the exact annual savings horizon', () => {
    const { result, last } = run('retirement', { currentAge: 60, retirementAge: 60.125, currentSavings: 12000, monthly: 1000, rate: 0, annualTopUp: 2500 });
    expect(result.metrics[0].value).toBe(14000);
    expect(last.values.balance).toBe(14000);
    expect(last.values.deposits).toBe(2000);
    expect(last.values.age).toBe(60.125);
  });

  it('labels a capped schedule honestly instead of presenting its final row as the deadline', () => {
    const { schedule, last } = run('retirement', { currentAge: 0, retirementAge: 110 });
    expect(last.values.year).toBe(100);
    expect(schedule.summary).toMatch(/capped.*100 years/i);
  });

  it('SWP final row withdraws only the available balance and discloses its partial final month', () => {
    const { result, schedule, last } = run('swp', { corpus: 10000000, withdrawal: 60000, rate: 7 });
    for (const row of schedule.rows) expect(Number(row.values.startingBalance) + Number(row.values.growth) - Number(row.values.withdrawals)).toBeCloseTo(Number(row.values.balance), 6);
    expect(Number(last.values.withdrawals)).toBeCloseTo(246470.0526096, 5);
    expect(last.note).toMatch(/partial.*month/i);
    expect(result.metrics[0].value).toBeCloseTo(617 / 12, 9);
  });
});

describe('B68 contribution copy and negative-zero display', () => {
  it('labels Roth comparison as one contribution today without changing its input key or arithmetic', () => {
    const { calculator, result } = run('roth-vs-traditional-ira');
    const input = calculator.inputs.find(i => i.key === 'income')!;
    expect(input.label).toMatch(/one.time.*contribution/i);
    expect(input.helper).toMatch(/single|one.time/i);
    expect(input.helper).not.toMatch(/each year/i);
    expect(result.metrics[0].value).toBeCloseTo(29633.78221507098, 7);
  });

  it.each(['USD', 'INR', 'EUR'])('suppresses rounded negative zero but preserves real losses in %s', currency => {
    for (const value of [-0, -1e-12, -0.49]) {
      expect(formatStoredCurrency(value, currency)).toBe(formatStoredCurrency(0, currency));
      expect(formatChartValue(value, find('roth-vs-traditional-ira'), 'currency', currency)).toBe(formatStoredCurrency(0, currency));
      expect(formatCompactMoney(value, currency)).not.toContain('-');
    }
    expect(formatStoredCurrency(-0.5, currency)).toContain('-');
    expect(formatCompactMoney(-0.5, currency)).toContain('-');
  });

  it('removes negative-zero money from formatted schedule CSV without changing raw numbers', () => {
    const { calculator, schedule } = run('roth-vs-traditional-ira');
    const before = JSON.stringify(schedule);
    expect(scheduleToCsv(calculator, schedule)).not.toContain('-$0');
    expect(JSON.stringify(schedule)).toBe(before);
  });
});

describe('B68 additive snapshot versions', () => {
  it.each([['sip-goal', 'savings-goal-monthly-v1'], ['savings-goal', 'savings-goal-monthly-v1'], ['retirement', 'retirement-exact-term-v1']])('%s accepts its new version while preserving legacy snapshots', (slug, version) => {
    const { calculator, values, result } = run(slug);
    expect(result.modelVersion).toBe(version);
    const payload = { calculatorSlug: slug, calculatorTitle: calculator.title, calculatorCategory: calculator.category, calculatorRegion: calculator.region, conversionRoute: calculator.conversionRoute, conversionLabel: calculator.conversionLabel, currency: 'USD', inputValues: values, result };
    const parsed = parseCalculatorSavePayload(payload);
    expect(parsed.ok).toBe(true);
    expect(toSavedCalculatorResultSnapshot(result)?.modelVersion).toBe(version);
    const { modelVersion, ...legacy } = result;
    const legacyBytes = JSON.stringify(legacy);
    expect(parseCalculatorSavePayload({ ...payload, result: legacy }).ok).toBe(true);
    expect(toSavedCalculatorResultSnapshot(legacy)).not.toHaveProperty('modelVersion');
    expect(JSON.stringify(legacy)).toBe(legacyBytes);
    expect(parseCalculatorSavePayload({ ...payload, result: { ...result, modelVersion: slug === 'retirement' ? 'savings-goal-monthly-v1' : 'retirement-exact-term-v1' } }).ok).toBe(false);
  });
});
