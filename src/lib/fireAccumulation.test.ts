import { describe, expect, it } from 'vitest';
import { calculateFirePlan, type PlanInput } from './fire';
import { estimateRetirementAge, fitRatePeriods, projectPortfolioAtAge, realReturn } from './fireAccumulation';

// Expected values below come from closed-form arithmetic written out in each case, not from the
// implementation's loop.
const base = { nominalReturn: 0, inflation: 0, savingsGrowth: 0 };

describe('estimateRetirementAge — independent goldens', () => {
  it('normal case: 7% nominal, 2.5% inflation, constant real target', () => {
    const g = 1.07 / 1.025 - 1;
    const balanceAfter = (t: number) => 100_000 * (1 + g) ** t + 20_000 * (((1 + g) ** t - 1) / g);
    expect(balanceAfter(22)).toBeLessThan(1_000_000);
    expect(balanceAfter(23)).toBeGreaterThanOrEqual(1_000_000);
    const result = estimateRetirementAge({
      currentAge: 30, planEndAge: 95, currentPortfolio: 100_000, annualSavings: 20_000,
      savingsGrowth: 0, nominalReturn: 0.07, inflation: 0.025, targetAtAge: () => 1_000_000
    });
    expect(result.status).toBe('reaches');
    expect(result.retireAge).toBe(53);
    expect(result.path.at(-1)?.portfolio).toBeCloseTo(balanceAfter(23), 6);
  });

  it('explicit 0% rates: target shrinks as the horizon shortens', () => {
    // 100k + 50k*(a-30) >= 40k*(90-a)  =>  a >= 55.56  =>  first whole age 56.
    const result = estimateRetirementAge({
      ...base, currentAge: 30, planEndAge: 90, currentPortfolio: 100_000, annualSavings: 50_000,
      targetAtAge: (age) => 40_000 * (90 - age)
    });
    expect(result.retireAge).toBe(56);
    expect(result.path.at(-1)).toMatchObject({ age: 56, portfolio: 1_400_000, target: 1_360_000 });
  });

  it('already financially independent at the current age', () => {
    const result = estimateRetirementAge({
      ...base, currentAge: 45, planEndAge: 90, currentPortfolio: 5_000_000, annualSavings: 0,
      targetAtAge: (age) => 40_000 * (90 - age)
    });
    expect(result).toMatchObject({ status: 'already-fi', retireAge: 45 });
  });

  it('never reaches the target before the plan end age', () => {
    const result = estimateRetirementAge({
      ...base, currentAge: 40, planEndAge: 90, currentPortfolio: 10_000, annualSavings: 0,
      targetAtAge: (age) => 40_000 * (90 - age)
    });
    expect(result).toMatchObject({ status: 'not-reached', retireAge: null });
    expect(result.path).toHaveLength(50);
  });

  it('increasing savings (10% a year) at 0% rates', () => {
    // Saved after t years: 10k*(1.1^t - 1)/0.1. Need >= 20k*(50 - t).  t=20: 572,750 < 600,000; t=21: 640,025 >= 580,000.
    const saved = (t: number) => 10_000 * ((1.1 ** t - 1) / 0.1);
    expect(saved(20)).toBeLessThan(20_000 * 30);
    expect(saved(21)).toBeGreaterThanOrEqual(20_000 * 29);
    const result = estimateRetirementAge({
      ...base, currentAge: 40, planEndAge: 90, currentPortfolio: 0, annualSavings: 10_000, savingsGrowth: 0.1,
      targetAtAge: (age) => 20_000 * (90 - age)
    });
    expect(result.retireAge).toBe(61);
    expect(result.path.at(-1)?.portfolio).toBeCloseTo(saved(21), 6);
  });

  it('rejects impossible inputs instead of guessing', () => {
    const ok = { ...base, currentAge: 40, planEndAge: 90, currentPortfolio: 0, annualSavings: 0, targetAtAge: () => 1 };
    expect(() => estimateRetirementAge({ ...ok, planEndAge: 40 })).toThrow(RangeError);
    expect(() => estimateRetirementAge({ ...ok, annualSavings: -1 })).toThrow(RangeError);
    expect(() => estimateRetirementAge({ ...ok, currentPortfolio: Number.NaN })).toThrow(RangeError);
    expect(() => estimateRetirementAge({ ...ok, inflation: -1 })).toThrow(RangeError);
  });
});

describe('helpers', () => {
  it('projectPortfolioAtAge matches the closed-form balance', () => {
    const g = 1.07 / 1.025 - 1;
    const closed = 100_000 * (1 + g) ** 22 + 20_000 * (((1 + g) ** 22 - 1) / g);
    const input = { currentAge: 30, currentPortfolio: 100_000, annualSavings: 20_000, savingsGrowth: 0, nominalReturn: 0.07, inflation: 0.025 };
    expect(projectPortfolioAtAge(input, 52)).toBeCloseTo(closed, 6);
    expect(projectPortfolioAtAge(input, 30)).toBe(100_000);
  });

  it('realReturn is the Fisher real rate', () => {
    expect(realReturn(0.07, 0.025)).toBeCloseTo(0.0439024390, 9);
    expect(realReturn(0, 0)).toBe(0);
  });

  it('fitRatePeriods trims or extends periods to an exact horizon', () => {
    const periods = [{ duration: 10, r: 0.06, i: 0.03 }, { duration: 20, r: 0.04, i: 0.02 }];
    expect(fitRatePeriods(periods, 25)).toEqual([{ duration: 10, r: 0.06, i: 0.03 }, { duration: 15, r: 0.04, i: 0.02 }]);
    expect(fitRatePeriods(periods, 8)).toEqual([{ duration: 8, r: 0.06, i: 0.03 }]);
    expect(fitRatePeriods(periods, 40)).toEqual([{ duration: 10, r: 0.06, i: 0.03 }, { duration: 30, r: 0.04, i: 0.02 }]);
  });

  it('drawdown target from the unchanged engine equals spending x years at 0% rates', () => {
    const plan: PlanInput = { annualExpense: 40_000, initialPortfolio: 0, withdrawalTiming: 'end', desiredFinalValue: 0, ratePeriods: [{ duration: 34, r: 0, i: 0 }], oneOffEvents: [], recurringCashFlows: [] };
    expect(calculateFirePlan(plan).requiredPortfolio).toBeCloseTo(1_360_000, 0);
  });
});
