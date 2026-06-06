import { describe, expect, it } from 'vitest';
import {
  annualSimulation,
  findMaxAnnualExpense,
  findRequiredPortfolio,
  type RatePeriod
} from './fire';

const closeTo = (value: number, expected: number, digits = 2) => {
  expect(value).toBeCloseTo(expected, digits);
};

describe('annualSimulation', () => {
  it('matches the Python end-of-year timing baseline', () => {
    const result = annualSimulation(100_000, 4_000, 'end', [{ duration: 1, r: 0.05, i: 0.02 }]);
    expect(result.balances).toHaveLength(2);
    closeTo(result.balances[0], 100_000);
    closeTo(result.balances[1], 101_000);
    closeTo(result.withdrawals[0], 4_000);
  });

  it('matches the Python start-of-year timing baseline', () => {
    const result = annualSimulation(100_000, 4_000, 'start', [{ duration: 1, r: 0.05, i: 0.02 }]);
    closeTo(result.balances[0], 100_000);
    closeTo(result.balances[1], 100_800);
  });

  it('inflates withdrawals across multiple periods', () => {
    const periods: RatePeriod[] = [
      { duration: 1, r: 0.05, i: 0.02 },
      { duration: 1, r: 0.06, i: 0.03 }
    ];
    const result = annualSimulation(100_000, 1_000, 'end', periods);
    closeTo(result.balances[1], 104_000);
    closeTo(result.balances[2], 109_220);
    closeTo(result.withdrawals[0], 1_000);
    closeTo(result.withdrawals[1], 1_020);
  });

  it('applies one-off events as signed relative-year cash flows', () => {
    const result = annualSimulation(
      100_000,
      4_000,
      'end',
      [{ duration: 3, r: 0.05, i: 0.02 }],
      [{ year: 2, amount: -10_000 }]
    );
    closeTo(result.balances[1], 101_000);
    closeTo(result.balances[2], 91_470);
    closeTo(result.balances[3], 91_881.9);
  });
});

describe('solvers', () => {
  it('matches the Python required portfolio regression', () => {
    const portfolio = findRequiredPortfolio(40_000, 'end', [{ duration: 25, r: 0.07, i: 0.03 }]);
    closeTo(portfolio, 614_223.1477, 1);
  });

  it('matches the Python max annual expense regression', () => {
    const withdrawal = findMaxAnnualExpense(1_000_000, 'end', [
      { duration: 30, r: 0.06, i: 0.025 }
    ]);
    closeTo(withdrawal, 55_136.1502, 1);
  });

  it('supports desired final value targets', () => {
    const portfolio = findRequiredPortfolio(
      80_000,
      'end',
      [{ duration: 30, r: 0.07, i: 0.03 }],
      1_000_000
    );
    closeTo(portfolio, 1_493_642.18, 1);
  });
});
