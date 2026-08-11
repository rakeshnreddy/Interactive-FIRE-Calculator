import { describe, expect, it } from 'vitest';
import {
  calculateSavingsGoal,
  defaultSavingsGoalInputs,
  validateSavingsGoalInputs,
  type SavingsGoalInputs
} from './savingsGoalCalculator';

function project(overrides: Partial<SavingsGoalInputs> = {}) {
  return calculateSavingsGoal({ ...defaultSavingsGoalInputs, ...overrides });
}

describe('savings goal calculator v2', () => {
  it('uses one nominal-monthly convention for the default headline and schedule', () => {
    const result = project();

    expect(result.validation.isValid).toBe(true);
    expect(result.requiredContribution).toBeCloseTo(425.28168253155314, 9);
    expect(result.currentSavingsAtDeadline).toBeCloseTo(22_196.40234544711, 8);
    expect(result.requiredPlanEnding).toBeCloseTo(100_000, 7);
    expect(result.detailedSchedule.at(-1)?.closingBalance).toBeCloseTo(100_000, 7);
  });

  it('matches the zero-rate savings-goal formula exactly', () => {
    const result = project({ annualRatePercent: 0 });

    expect(result.requiredContribution).toBe(750);
    expect(result.requiredPlanEnding).toBe(100_000);
    expect(result.grossReturn).toBe(0);
  });

  it('makes beginning contributions lower than end contributions at a positive rate', () => {
    const ending = project({ contributionTiming: 'end' });
    const beginning = project({ contributionTiming: 'beginning' });

    expect(beginning.requiredContribution).toBeCloseTo(422.4652475479005, 8);
    expect(beginning.requiredContribution!).toBeLessThan(ending.requiredContribution!);
  });

  it('uses APY independently of the stored compounding frequency', () => {
    const monthly = project({ compoundingFrequency: 12, rateBasis: 'apy' });
    const daily = project({ compoundingFrequency: 365, rateBasis: 'apy' });

    expect(monthly.requiredContribution).toBeCloseTo(435.3147337494834, 8);
    expect(daily.requiredContribution).toBe(monthly.requiredContribution);
  });

  it('solves annual contribution step-ups linearly', () => {
    const result = project({ annualContributionIncreasePercent: 5 });

    expect(result.requiredContribution).toBeCloseTo(349.09196786601234, 8);
    expect(result.requiredPlanEnding).toBeCloseTo(100_000, 7);
  });

  it('inflates a today-money target at the deadline', () => {
    const result = project({ inflationPercent: 3, targetBasis: 'today' });

    expect(result.resolvedTarget).toBeCloseTo(134_391.63793441223, 8);
    expect(result.requiredContribution).toBeCloseTo(613.2695659544021, 8);
    expect(result.requiredPlanEnding).toBeCloseTo(result.resolvedTarget, 7);
  });

  it('compares a current plan without adding it to the required plan', () => {
    const result = project({ currentContribution: 300 });

    expect(result.requiredContribution).toBeCloseTo(425.28168253155314, 8);
    expect(result.currentPlanEnding).toBeCloseTo(77_080.21289995963, 7);
    expect(result.periodicDifference).toBeCloseTo(125.28168253155314, 8);
    expect(result.catchUpNow).toBeCloseTo(10_325.901803064791, 7);
    expect(result.currentPlanReachAt).toBeCloseTo(146 / 12, 10);
  });

  it('models an annual balance fee without hiding it in the rate', () => {
    const result = project({ annualFeePercent: 1 });

    expect(result.requiredContribution).toBeCloseTo(462.06095154990214, 8);
    expect(result.feesPaid).toBeGreaterThan(0);
    expect(result.requiredPlanEnding).toBeCloseTo(100_000, 7);
  });

  it('supports valid negative nominal rates', () => {
    const result = project({
      annualRatePercent: -2,
      currentSavings: 5_000,
      targetAmount: 20_000,
      years: 5
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.requiredContribution).toBeCloseTo(270.83341441804373, 8);
    expect(result.validation.warnings.join(' ')).toContain('negative rate');
  });

  it('preserves exact fractional terms and ends with a partial annual row', () => {
    const result = project({ annualRatePercent: 0, years: 2.5 });

    expect(result.requiredContribution).toBe(3_000);
    expect(result.detailedSchedule.at(-1)?.time).toBe(2.5);
    expect(result.annualSchedule.at(-1)?.label).toBe('Through 2y 6m');
    expect(result.requiredPlanEnding).toBe(100_000);
  });

  it('reports a recurring solve as impossible when no end contribution occurs before the deadline', () => {
    const result = project({
      contributionFrequency: 1,
      contributionTiming: 'end',
      currentSavings: 0,
      years: 0.5
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.requiredContribution).toBeNull();
    expect(result.validation.warnings.join(' ')).toContain('No recurring contribution');
  });

  it('distinguishes funded today, funded by growth, and on-track statuses', () => {
    expect(project({ currentSavings: 120_000 }).status).toBe('funded-now');
    expect(project({ currentSavings: 50_000 }).status).toBe('funded-by-growth');
    expect(project({ currentContribution: 500 }).status).toBe('on-track');
    expect(project({ currentContribution: 100 }).status).toBe('funding-gap');
  });

  it('does not clamp signed deadline surplus', () => {
    const result = project({ currentContribution: 500 });

    expect(result.currentPlanDifference).toBeGreaterThan(0);
    expect(result.currentPlanEnding - result.resolvedTarget).toBe(result.currentPlanDifference);
  });

  it('reconciles every detailed and annual schedule row', () => {
    const result = project({
      annualContributionIncreasePercent: 3,
      annualFeePercent: 0.4,
      annualTopUp: 750,
      years: 10.5
    });

    for (const row of [...result.detailedSchedule, ...result.annualSchedule]) {
      expect(row.openingBalance + row.deposits + row.grossReturn - row.fees).toBeCloseTo(row.closingBalance, 8);
    }
    expect(result.annualSchedule.at(-1)?.closingBalance).toBeCloseTo(result.requiredPlanEnding, 8);
  });

  it('keeps sensitivity monotonic for deadline, target, and rate changes', () => {
    const shorter = project({ years: 8 });
    const base = project();
    const longer = project({ years: 12 });
    const higherTarget = project({ targetAmount: 120_000 });
    const higherRate = project({ annualRatePercent: 10 });

    expect(shorter.requiredContribution!).toBeGreaterThan(base.requiredContribution!);
    expect(longer.requiredContribution!).toBeLessThan(base.requiredContribution!);
    expect(higherTarget.requiredContribution!).toBeGreaterThan(base.requiredContribution!);
    expect(higherRate.requiredContribution!).toBeLessThan(base.requiredContribution!);
  });

  it('rejects invalid deadlines, targets, rate domains, and non-finite values', () => {
    expect(validateSavingsGoalInputs({ ...defaultSavingsGoalInputs, years: 0 }).errors.years).toBeTruthy();
    expect(validateSavingsGoalInputs({ ...defaultSavingsGoalInputs, targetAmount: 0 }).errors.targetAmount).toBeTruthy();
    expect(validateSavingsGoalInputs({ ...defaultSavingsGoalInputs, rateBasis: 'apy', annualRatePercent: -100 }).errors.annualRatePercent).toBeTruthy();
    expect(validateSavingsGoalInputs({ ...defaultSavingsGoalInputs, currentSavings: Number.NaN }).errors.currentSavings).toBeTruthy();
  });

  it('turns numeric overflow into a safe invalid projection', () => {
    const result = project({
      annualContributionIncreasePercent: 1_000,
      annualRatePercent: 10_000,
      currentContribution: 999_999_999_999,
      targetAmount: 999_999_999_999,
      years: 100
    });

    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.result).toContain('safe numeric range');
    expect(Object.values(result).some((value) => typeof value === 'number' && !Number.isFinite(value))).toBe(false);
  });

  it('rejects an inflation-resolved target above the persistence-safe amount', () => {
    const result = project({
      inflationPercent: 10,
      targetAmount: 500_000_000_000,
      targetBasis: 'today',
      years: 10
    });

    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.result).toContain('inflation-adjusted deadline target');
  });
});
