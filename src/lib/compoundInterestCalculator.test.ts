import { describe, expect, it } from 'vitest';
import {
  calculateCompoundInterest,
  defaultCompoundInterestInputs,
  validateCompoundInterestInputs,
  type CompoundInterestInputs
} from './compoundInterestCalculator';

function project(overrides: Partial<CompoundInterestInputs> = {}) {
  return calculateCompoundInterest({ ...defaultCompoundInterestInputs, ...overrides });
}

describe('compound interest calculator v2', () => {
  it('preserves the locked legacy default convention and value', () => {
    const result = project();

    expect(result.validation.isValid).toBe(true);
    expect(result.endingValue).toBeCloseTo(113_669.41993630132, 8);
    expect(result.investedCapital).toBe(70_000);
    expect(result.netGrowth).toBeCloseTo(43_669.41993630132, 8);
  });

  it('matches the principal-only nominal compound formula', () => {
    const result = project({
      annualRatePercent: 6,
      principal: 10_000,
      recurringContribution: 0,
      years: 10
    });

    expect(result.endingValue).toBeCloseTo(10_000 * (1 + 0.06 / 12) ** 120, 8);
  });

  it('matches a published ordinary-annuity example', () => {
    const result = project({
      annualRatePercent: 3.75,
      principal: 0,
      recurringContribution: 250,
      years: 8
    });

    expect(result.endingValue).toBeCloseTo(27_938.20, 2);
  });

  it('uses an exact zero-rate branch through the event model', () => {
    const result = project({ annualRatePercent: 0 });

    expect(result.endingValue).toBe(70_000);
    expect(result.grossReturn).toBe(0);
    expect(result.netGrowth).toBe(0);
  });

  it('makes beginning contributions worth more at a positive rate', () => {
    const ending = project({ annualRatePercent: 6, contributionTiming: 'end' });
    const beginning = project({ annualRatePercent: 6, contributionTiming: 'beginning' });

    expect(beginning.endingValue).toBeGreaterThan(ending.endingValue);
    expect(beginning.investedCapital).toBe(ending.investedCapital);
  });

  it('includes the end contribution at the horizon and excludes the next beginning contribution', () => {
    const ending = project({
      annualRatePercent: 0,
      contributionFrequency: 4,
      contributionTiming: 'end',
      principal: 0,
      recurringContribution: 100,
      years: 1
    });
    const beginning = project({
      annualRatePercent: 0,
      contributionFrequency: 4,
      contributionTiming: 'beginning',
      principal: 0,
      recurringContribution: 100,
      years: 1
    });

    expect(ending.endingValue).toBe(400);
    expect(beginning.endingValue).toBe(400);
    expect(beginning.detailedSchedule.at(-1)?.deposits).toBe(0);
  });

  it.each([
    [52, 52],
    [26, 26],
    [24, 24],
    [12, 12],
    [4, 4],
    [2, 2],
    [1, 1]
  ] as const)('applies %i contributions per year', (frequency, count) => {
    const result = project({
      annualRatePercent: 0,
      contributionFrequency: frequency,
      principal: 0,
      recurringContribution: 10,
      years: 1
    });

    expect(result.totalDeposits).toBe(count * 10);
    expect(result.endingValue).toBe(count * 10);
  });

  it('keeps APY results independent of compounding frequency', () => {
    const monthly = project({
      annualRatePercent: 5,
      compoundingFrequency: 12,
      rateBasis: 'apy',
      recurringContribution: 0
    });
    const daily = project({
      annualRatePercent: 5,
      compoundingFrequency: 365,
      rateBasis: 'apy',
      recurringContribution: 0
    });

    expect(monthly.endingValue).toBeCloseTo(10_000 * 1.05 ** 10, 10);
    expect(daily.endingValue).toBe(monthly.endingValue);
  });

  it('changes nominal results when the compounding frequency changes', () => {
    const annual = project({ compoundingFrequency: 1, recurringContribution: 0 });
    const daily = project({ compoundingFrequency: 365, recurringContribution: 0 });

    expect(daily.endingValue).toBeGreaterThan(annual.endingValue);
  });

  it('supports fractional terms and a final partial annual row', () => {
    const result = project({
      annualRatePercent: 0,
      principal: 0,
      recurringContribution: 100,
      years: 1.5
    });

    expect(result.endingValue).toBe(1_800);
    expect(result.annualSchedule).toHaveLength(2);
    expect(result.annualSchedule[1].label).toBe('Year 2 (partial)');
    expect(result.annualSchedule.at(-1)?.closingBalance).toBe(result.endingValue);
  });

  it('increases contributions only after a completed contribution year', () => {
    const result = project({
      annualContributionIncreasePercent: 10,
      annualRatePercent: 0,
      principal: 0,
      recurringContribution: 100,
      years: 2
    });

    expect(result.totalDeposits).toBeCloseTo(12 * 100 + 12 * 110, 10);
  });

  it('adds annual top-ups on full-year anniversaries', () => {
    const result = project({
      annualRatePercent: 0,
      annualTopUp: 1_000,
      principal: 0,
      recurringContribution: 0,
      years: 2.5
    });

    expect(result.totalDeposits).toBe(2_000);
    expect(result.endingValue).toBe(2_000);
  });

  it('applies one-time deposits before same-time withdrawals', () => {
    const result = project({
      annualRatePercent: 0,
      futureDepositAmount: 1_000,
      futureDepositYear: 1,
      futureWithdrawalAmount: 1_500,
      futureWithdrawalYear: 1,
      principal: 600,
      recurringContribution: 0,
      years: 2
    });

    expect(result.withdrawals).toBe(1_500);
    expect(result.unfundedWithdrawals).toBe(0);
    expect(result.endingValue).toBe(100);
  });

  it('funds withdrawals only to the available balance', () => {
    const result = project({
      annualRatePercent: 0,
      futureWithdrawalAmount: 5_000,
      futureWithdrawalYear: 1,
      principal: 1_000,
      recurringContribution: 0,
      years: 2
    });

    expect(result.withdrawals).toBe(1_000);
    expect(result.unfundedWithdrawals).toBe(4_000);
    expect(result.endingValue).toBe(0);
    expect(result.validation.warnings.some((warning) => warning.includes('unfunded'))).toBe(true);
  });

  it('reports fees paid and ending-value fee drag', () => {
    const afterFee = project({ annualFeePercent: 0.5 });
    const noFee = project({ annualFeePercent: 0 });

    expect(afterFee.feesPaid).toBeGreaterThan(0);
    expect(afterFee.endingValue).toBeLessThan(noFee.endingValue);
    expect(afterFee.feeDrag).toBeCloseTo(noFee.endingValue - afterFee.endingValue, 8);
  });

  it('changes real purchasing power without changing nominal value', () => {
    const nominal = project({ inflationPercent: 0 });
    const inflated = project({ inflationPercent: 2.5 });

    expect(inflated.endingValue).toBe(nominal.endingValue);
    expect(inflated.realEndingValue).toBeCloseTo(inflated.endingValue / 1.025 ** 10, 8);
    expect(inflated.realEndingValue).toBeLessThan(inflated.endingValue);
  });

  it('compares targets in future money and today’s purchasing power', () => {
    const future = project({ inflationPercent: 3, targetAmount: 100_000, targetBasis: 'future' });
    const today = project({ inflationPercent: 3, targetAmount: 100_000, targetBasis: 'today' });

    expect(future.targetDifference).toBeCloseTo(future.endingValue - 100_000, 8);
    expect(today.targetDifference).toBeCloseTo(today.endingValue - 100_000 * 1.03 ** 10, 8);
    expect(today.targetDifference as number).toBeLessThan(future.targetDifference as number);
  });

  it('reports reachable target timing and target milestones', () => {
    const result = project({ targetAmount: 100_000 });

    expect(result.targetReachedAt).not.toBeNull();
    expect(result.targetReachedAt as number).toBeLessThanOrEqual(10);
    expect(result.milestones.map((milestone) => milestone.label)).toContain('100% of target');
  });

  it('can search beyond the selected term up to the disclosed horizon', () => {
    const result = project({ targetAmount: 200_000, years: 2 });

    expect(result.targetReachedAt).not.toBeNull();
    expect(result.targetReachedAt as number).toBeGreaterThan(2);
    expect(result.validation.warnings.some((warning) => warning.includes('after the selected'))).toBe(true);
  });

  it('supports valid negative returns and negative growth', () => {
    const result = project({
      annualRatePercent: -10,
      principal: 10_000,
      recurringContribution: 0,
      years: 2
    });

    expect(result.validation.isValid).toBe(true);
    expect(result.endingValue).toBeLessThan(10_000);
    expect(result.netGrowth).toBeLessThan(0);
  });

  it('reconciles every detailed row and the ending headline', () => {
    const result = project({
      annualContributionIncreasePercent: 4,
      annualFeePercent: 0.4,
      annualTopUp: 750,
      futureDepositAmount: 3_000,
      futureDepositYear: 2.25,
      futureWithdrawalAmount: 1_500,
      futureWithdrawalYear: 6.5,
      inflationPercent: 2.5,
      years: 10.75
    });

    result.detailedSchedule.forEach((row) => {
      expect(row.closingBalance).toBeCloseTo(
        row.openingBalance + row.deposits - row.withdrawals + row.grossReturn - row.fees,
        8
      );
    });
    expect(result.detailedSchedule.at(-1)?.closingBalance).toBeCloseTo(result.endingValue, 10);
    expect(result.annualSchedule.at(-1)?.closingBalance).toBeCloseTo(result.endingValue, 10);
    expect(result.endingValue).toBeCloseTo(result.netContributions + result.netGrowth, 8);
  });

  it('keeps every supported valid-frequency output finite', () => {
    for (const contributionFrequency of [52, 26, 24, 12, 4, 2, 1] as const) {
      for (const compoundingFrequency of [365, 12, 4, 2, 1] as const) {
        const result = project({ compoundingFrequency, contributionFrequency, years: 2.25 });
        expect(result.validation.isValid).toBe(true);
        expect(Number.isFinite(result.endingValue)).toBe(true);
        expect(result.detailedSchedule.every((row) => Number.isFinite(row.closingBalance))).toBe(true);
      }
    }
  });

  it.each([
    [{ years: 0 }, 'years'],
    [{ years: 101 }, 'years'],
    [{ annualFeePercent: -1 }, 'annualFeePercent'],
    [{ annualFeePercent: 100 }, 'annualFeePercent'],
    [{ inflationPercent: -100 }, 'inflationPercent'],
    [{ annualContributionIncreasePercent: -100 }, 'annualContributionIncreasePercent'],
    [{ principal: -1 }, 'principal'],
    [{ targetAmount: -1 }, 'targetAmount'],
    [{ annualRatePercent: -100, rateBasis: 'apy' as const }, 'annualRatePercent'],
    [{ futureDepositAmount: 1, futureDepositYear: 11 }, 'futureDepositYear']
  ])('identifies invalid input %j', (overrides, key) => {
    const validation = validateCompoundInterestInputs({ ...defaultCompoundInterestInputs, ...overrides });

    expect(validation.isValid).toBe(false);
    expect(validation.errors[key as keyof CompoundInterestInputs]).toBeTruthy();
  });

  it('rejects NaN and Infinity instead of silently coercing them', () => {
    expect(project({ principal: Number.NaN }).validation.errors.principal).toContain('finite');
    expect(project({ annualRatePercent: Number.POSITIVE_INFINITY }).validation.errors.annualRatePercent).toContain('finite');
  });

  it('rejects overflowed results without exposing infinity', () => {
    const result = project({
      annualContributionIncreasePercent: 1_000,
      annualRatePercent: 10_000,
      principal: 1e15,
      recurringContribution: 1e15,
      years: 100
    });

    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.result).toContain('too large');
    expect(result.endingValue).toBe(0);
  });
});
