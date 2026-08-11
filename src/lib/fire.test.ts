import { describe, expect, it } from 'vitest';
import {
  annualSimulation,
  calculateFirePlan,
  findMaxAnnualExpense,
  findRequiredPortfolio,
  validatePlanInput,
  type PlanInput,
  type PlanWarning,
  type RatePeriod
} from './fire';

const closeTo = (value: number, expected: number, digits = 2) => {
  expect(value).toBeCloseTo(expected, digits);
};

const warningCodes = (warnings: PlanWarning[]) => warnings.map((warning) => warning.code);

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

  it('applies recurring income and expense phases to net withdrawals', () => {
    const result = annualSimulation(
      100_000,
      10_000,
      'end',
      [{ duration: 2, r: 0, i: 0 }],
      [],
      [
        { kind: 'income', startYear: 1, endYear: 2, amount: 3_000, label: 'Pension' },
        { kind: 'expense', startYear: 2, endYear: 2, amount: 2_000, label: 'Healthcare' }
      ]
    );

    closeTo(result.rows[0].baseWithdrawal, 10_000);
    closeTo(result.rows[0].recurringIncome, 3_000);
    closeTo(result.rows[0].recurringExpense, 0);
    closeTo(result.rows[0].withdrawal, 7_000);
    closeTo(result.rows[1].withdrawal, 9_000);
    closeTo(result.finalBalance, 84_000);
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

  it('uses recurring cash flows in both inverse solvers', () => {
    const plan: PlanInput = {
      annualExpense: 50_000,
      initialPortfolio: 700_000,
      withdrawalTiming: 'end',
      desiredFinalValue: 0,
      ratePeriods: [{ duration: 20, r: 0.05, i: 0.02 }],
      oneOffEvents: [],
      recurringCashFlows: [
        { kind: 'income', startYear: 6, endYear: 20, amount: 20_000, label: 'Pension' }
      ]
    };

    const withIncome = calculateFirePlan(plan);
    const withoutIncome = calculateFirePlan({ ...plan, recurringCashFlows: [] });

    expect(withIncome.requiredPortfolio).toBeLessThan(withoutIncome.requiredPortfolio);
    expect(withIncome.maxAnnualExpense).toBeGreaterThan(withoutIncome.maxAnnualExpense);
  });
});

describe('plan warnings', () => {
  it('flags the first depleted and negative balance year', () => {
    const result = annualSimulation(100, 150, 'end', [{ duration: 2, r: 0, i: 0 }]);

    expect(warningCodes(result.warnings)).toEqual(
      expect.arrayContaining(['balance_depleted', 'negative_balance'])
    );
    expect(result.warnings.find((warning) => warning.code === 'balance_depleted')?.year).toBe(1);
    expect(result.warnings.find((warning) => warning.code === 'negative_balance')?.severity).toBe(
      'error'
    );
  });

  it('flags unusually high and low return and inflation assumptions', () => {
    const warnings = validatePlanInput({
      annualExpense: 40_000,
      initialPortfolio: 500_000,
      withdrawalTiming: 'end',
      desiredFinalValue: 0,
      ratePeriods: [
        { duration: 5, r: 0.14, i: 0.08 },
        { duration: 5, r: -0.08, i: -0.01 }
      ],
      oneOffEvents: []
    });

    expect(warningCodes(warnings)).toEqual(
      expect.arrayContaining([
        'high_return_assumption',
        'high_inflation_assumption',
        'low_return_assumption',
        'low_inflation_assumption'
      ])
    );
  });

  it('flags invalid and out-of-range one-off years and only applies valid events', () => {
    const result = annualSimulation(
      1_000,
      0,
      'end',
      [{ duration: 2, r: 0, i: 0 }],
      [
        { year: Number.NaN, amount: 100 },
        { year: 3, amount: 100 },
        { year: 1.7, amount: 50 }
      ]
    );

    expect(warningCodes(result.warnings)).toEqual(
      expect.arrayContaining(['invalid_one_off_year', 'one_off_year_out_of_range'])
    );
    expect(result.rows[0].oneOffAmount).toBe(50);
    expect(result.rows[1].oneOffAmount).toBe(0);
  });

  it('returns structured errors for unsupported timing and invalid periods in plan mode', () => {
    const plan = {
      annualExpense: 40_000,
      initialPortfolio: 500_000,
      withdrawalTiming: 'middle',
      desiredFinalValue: 0,
      ratePeriods: [
        { duration: 0, r: 0.06, i: 0.03 },
        { duration: 10, r: Number.NaN, i: 0.03 }
      ],
      oneOffEvents: [{ year: 1, amount: 10_000 }]
    } as unknown as PlanInput;

    const result = calculateFirePlan(plan);

    expect(result.requiredPortfolio).toBe(Number.POSITIVE_INFINITY);
    expect(result.expenseMode.rows).toEqual([]);
    expect(warningCodes(result.warnings)).toEqual(
      expect.arrayContaining([
        'unsupported_withdrawal_timing',
        'invalid_rate_period',
        'empty_rate_periods',
        'one_off_year_out_of_range'
      ])
    );
  });

  it('flags invalid recurring cash-flow rows', () => {
    const warnings = validatePlanInput({
      annualExpense: 40_000,
      initialPortfolio: 500_000,
      withdrawalTiming: 'end',
      desiredFinalValue: 0,
      ratePeriods: [{ duration: 10, r: 0.06, i: 0.03 }],
      oneOffEvents: [],
      recurringCashFlows: [
        { kind: 'income', startYear: 11, endYear: 12, amount: 1_000 },
        { kind: 'expense', startYear: 1, endYear: 3, amount: -1 }
      ]
    });

    expect(warningCodes(warnings)).toEqual(
      expect.arrayContaining(['recurring_cash_flow_out_of_range', 'invalid_recurring_cash_flow'])
    );
  });

  it('falls back to end-of-year timing when a runtime timing value is unsupported', () => {
    const result = annualSimulation(100_000, 4_000, 'middle' as never, [
      { duration: 1, r: 0.05, i: 0.02 }
    ]);

    closeTo(result.balances[1], 101_000);
    expect(warningCodes(result.warnings)).toContain('unsupported_withdrawal_timing');
  });
});
