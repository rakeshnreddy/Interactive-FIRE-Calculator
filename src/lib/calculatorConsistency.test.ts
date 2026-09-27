import { describe, expect, it } from 'vitest';
import { buildCalculatorDetailSchedule, buildCalculatorStudioChart } from './calculatorStudios';
import { BACK_END_DEBT_SHARE, MAX_YEARS, calculateSeoCalculator, monthlyCashFlowIrr, seoCalculators } from './seoCalculators';

// Independent review (2026-09-27) found headlines, schedules and charts disagreeing after the
// calculator pass. These cases pin the corrected engines and keep every view on the same math.

const calculator = (slug: string) => {
  const found = seoCalculators.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`missing calculator ${slug}`);
  return found;
};
const defaults = (slug: string) => Object.fromEntries(calculator(slug).inputs.map((input) => [input.key, input.defaultValue]));
const metric = (result: ReturnType<typeof calculateSeoCalculator>, label: string) => result.metrics.find((entry) => entry.label.startsWith(label))?.value;
const lastRow = (slug: string, values: Record<string, number>) => {
  const schedule = buildCalculatorDetailSchedule(calculator(slug), values);
  if (!schedule || schedule.rows.length === 0) throw new Error(`no schedule for ${slug}`);
  return schedule.rows[schedule.rows.length - 1].values;
};

describe('XIRR (monthly cash-flow IRR)', () => {
  it('reports large losses instead of 0%', () => {
    // $10,000 becomes $1,000 in one year: a -90% return.
    expect(monthlyCashFlowIrr(10_000, 0, 1_000, 12)).toBeCloseTo(-0.9, 6);
    expect(calculateSeoCalculator(calculator('xirr'), { ...defaults('xirr'), initial: 10_000, monthly: 0, final: 1_000, years: 1 }).metrics[0].value).toBeCloseTo(-0.9, 6);
  });

  it('reports a total loss as -100% and clamps returns above the bracket', () => {
    expect(monthlyCashFlowIrr(10_000, 0, 0, 12)).toBe(-1);
    expect(monthlyCashFlowIrr(1, 0, 1e12, 1)).toBeCloseTo(2 ** 12 - 1, 6);
  });

  it('still solves ordinary cases', () => {
    expect(monthlyCashFlowIrr(10_000, 0, 11_000, 12)).toBeCloseTo(0.1, 6);
  });

  it('bounds the work a crafted share link can request', () => {
    const started = Date.now();
    const result = calculateSeoCalculator(calculator('xirr'), { ...defaults('xirr'), years: 1_000_000_000 });
    expect(Number.isFinite(result.metrics[0].value)).toBe(true);
    expect(Date.now() - started).toBeLessThan(2_000);
    for (const entry of seoCalculators) {
      for (const input of entry.inputs) {
        if (/year|term|tenure/i.test(input.key)) expect(input.max, `${entry.slug}.${input.key}`).toBe(MAX_YEARS);
      }
    }
  });
});

describe('rent versus buy', () => {
  it('stops loan payments at payoff and keeps ownership costs for the whole stay', () => {
    const values = { ...defaults('rent-vs-buy'), homePrice: 120_000, downPayment: 0, rate: 0, loanYears: 1, years: 2, ownershipRate: 1, rent: 1_000 };
    const result = calculateSeoCalculator(calculator('rent-vs-buy'), values);
    // Loan repaid in year 1 ($120,000, all equity); upkeep 1% a year for two years = $2,400.
    expect(metric(result, 'Net cost of buying')).toBeCloseTo(2_400, 6);
    const row = lastRow('rent-vs-buy', values);
    expect(Number(row.buyPayments) - Number(row.ownerEquity)).toBeCloseTo(2_400, 6);
    expect(Number(row.netDifference)).toBeCloseTo(2_400 - 24_000, 6);
  });
});

describe('balance transfer', () => {
  it('keeps the promotional rate for the whole promo period even when payments do not cover interest', () => {
    const values = { ...defaults('balance-transfer'), balance: 10_000, currentRate: 0, newRate: 12, feeRate: 0, payment: 50, promoMonths: 12 };
    const result = calculateSeoCalculator(calculator('balance-transfer'), values);
    expect(metric(result, 'Promo payoff months')).toBe(12);
    // 12 months at 1% a month with $50 payments: about $1,268 of promo interest.
    expect(metric(result, 'Interest with transfer')).toBeGreaterThan(1_200);
  });

  it('schedule and headline agree on the savings once the promo ends', () => {
    const values = { ...defaults('balance-transfer'), balance: 10_000, currentRate: 24, newRate: 0, feeRate: 0, payment: 300, promoMonths: 1 };
    const result = calculateSeoCalculator(calculator('balance-transfer'), values);
    const row = lastRow('balance-transfer', values);
    expect(Number(row.costSavings)).toBeCloseTo(result.metrics[0].value, 0);
  });
});

describe('Roth versus traditional', () => {
  it('schedule uses the same equal out-of-pocket basis as the headline', () => {
    const values = defaults('roth-vs-traditional-ira');
    const result = calculateSeoCalculator(calculator('roth-vs-traditional-ira'), values);
    const row = lastRow('roth-vs-traditional-ira', values);
    expect(Number(row.rothValue)).toBeCloseTo(result.metrics[0].value, 2);
    expect(Number(row.traditionalAfterTax)).toBeCloseTo(metric(result, 'Traditional after-tax value') ?? Number.NaN, 2);
  });
});

describe('gratuity', () => {
  it('schedule applies the statutory ceiling the headline applies', () => {
    const values = { ...defaults('gratuity'), salary: 200_000, years: 30 };
    const result = calculateSeoCalculator(calculator('gratuity'), values);
    expect(result.metrics[0].value).toBe(2_000_000);
    const row = lastRow('gratuity', values);
    expect(Number(row.benefit)).toBe(2_000_000);
  });
});

describe('adjustable-rate mortgage', () => {
  it('chart and schedule share the reset path', () => {
    const values = defaults('arm-mortgage');
    const chart = buildCalculatorStudioChart(calculator('arm-mortgage'), values);
    const row = lastRow('arm-mortgage', values);
    const finalEntry = chart.entries[chart.entries.length - 1];
    expect(finalEntry.secondary).toBeCloseTo(Number(row.cumulativeInterest), 0);
    // Changing the reset assumption changes the chart.
    const steeper = buildCalculatorStudioChart(calculator('arm-mortgage'), { ...values, adjustedRate: values.adjustedRate + 3 });
    expect(steeper.entries[steeper.entries.length - 1].secondary).toBeGreaterThan(finalEntry.secondary ?? 0);
  });
});

describe('mortgage affordability', () => {
  it('limits the payment by the housing share and by total debts', () => {
    const values = defaults('mortgage-affordability');
    const result = calculateSeoCalculator(calculator('mortgage-affordability'), values);
    // 28% housing = $2,520; 36% total - $800 debts = $2,440: the tighter one wins.
    expect(metric(result, 'Maximum monthly payment')).toBeCloseTo(Math.min(values.income * 0.28, values.income * BACK_END_DEBT_SHARE - values.debts), 6);
    const noDebts = calculateSeoCalculator(calculator('mortgage-affordability'), { ...values, debts: 0 });
    expect(metric(noDebts, 'Maximum monthly payment')).toBeCloseTo(values.income * 0.28, 6);
  });

  it('chart amortises the eligible loan rather than an absent principal', () => {
    const values = defaults('mortgage-affordability');
    const result = calculateSeoCalculator(calculator('mortgage-affordability'), values);
    const chart = buildCalculatorStudioChart(calculator('mortgage-affordability'), values, result);
    expect(chart.entries[0].primary).toBeCloseTo(result.metrics[0].value, 2);
    expect(chart.entries[chart.entries.length - 1].secondary).toBeGreaterThan(0);
  });
});

describe('points schedule', () => {
  it('is capped like the other monthly schedules', () => {
    const schedule = buildCalculatorDetailSchedule(calculator('mortgage-points'), { ...defaults('mortgage-points'), years: MAX_YEARS });
    expect(schedule?.rows.length).toBeLessThanOrEqual(600);
  });
});
