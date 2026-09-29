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

describe('Python ported finance goldens', () => {
  it('simulates multi-period zero rates across 3 years', () => {
    const result = annualSimulation(100_000, 1_000, 'end', [
      { duration: 2, r: 0, i: 0 },
      { duration: 1, r: 0, i: 0 }
    ]);
    expect(result.balances).toEqual([100_000, 99_000, 98_000, 97_000]);
    expect(result.withdrawals).toEqual([1_000, 1_000, 1_000]);
  });

  it('simulates multiple one-off events across 4 years with end-of-year timing', () => {
    const result = annualSimulation(
      100_000,
      4_000,
      'end',
      [{ duration: 4, r: 0.05, i: 0.02 }],
      [
        { year: 1, amount: 2_000 },
        { year: 3, amount: -3_000 }
      ]
    );
    const expectedBalances = [100_000, 103_100, 104_175, 102_072.15, 102_930.93];
    const expectedWithdrawals = [4_000, 4_080, 4_161.6, 4_244.83];
    result.balances.forEach((bal, idx) => closeTo(bal, expectedBalances[idx], 2));
    result.withdrawals.forEach((wd, idx) => closeTo(wd, expectedWithdrawals[idx], 2));
  });

  it('ignores one-off events with year 0 or beyond total duration', () => {
    const baseline = annualSimulation(100_000, 4_000, 'end', [{ duration: 3, r: 0.05, i: 0.02 }]);
    const outOfBounds = annualSimulation(
      100_000,
      4_000,
      'end',
      [{ duration: 3, r: 0.05, i: 0.02 }],
      [
        { year: 0, amount: 5_000 },
        { year: 10, amount: 5_000 }
      ]
    );
    expect(outOfBounds.balances.map((b) => Math.round(b * 100) / 100)).toEqual(
      baseline.balances.map((b) => Math.round(b * 100) / 100)
    );
  });

  it('solves multi-period required portfolio with varying rates and positive DFV', () => {
    // Algebraic proof: 102080 / (1.05 * 1.06) = 91716.082659...
    const pv = findRequiredPortfolio(
      1_000,
      'end',
      [
        { duration: 1, r: 0.05, i: 0.02 },
        { duration: 1, r: 0.06, i: 0.03 }
      ],
      100_000
    );
    expect(Math.abs(pv - 91_716.08)).toBeLessThan(0.02);
  });

  it('solves multi-period max annual expense with varying rates', () => {
    // Algebraic proof: 111300 / 2.08 = 53509.61538...
    const w = findMaxAnnualExpense(
      100_000,
      'end',
      [
        { duration: 1, r: 0.05, i: 0.02 },
        { duration: 1, r: 0.06, i: 0.03 }
      ],
      0
    );
    closeTo(w, 53_509.61, 2);
  });

  it('solves single period high withdrawal scenario with start timing', () => {
    const pv = findRequiredPortfolio(
      100_000_000,
      'start',
      [{ duration: 50, r: 0.01, i: 0 }],
      0
    );
    closeTo(pv, 3_958_807_870.65, 0);
  });

  it('finds required portfolio with one-off expenses and incomes directionally correct', () => {
    const rates = [{ duration: 10, r: 0.05, i: 0.02 }];
    const base = findRequiredPortfolio(50_000, 'end', rates, 0);
    const withExpense = findRequiredPortfolio(50_000, 'end', rates, 0, [{ year: 2, amount: -100_000 }]);
    const withIncome = findRequiredPortfolio(50_000, 'end', rates, 0, [{ year: 2, amount: 100_000 }]);

    expect(withExpense).toBeGreaterThan(base);
    expect(withIncome).toBeLessThan(base);
  });

  it('finds max annual expense with one-off expenses and incomes directionally correct', () => {
    const rates = [{ duration: 10, r: 0.05, i: 0.02 }];
    const base = findMaxAnnualExpense(1_000_000, 'end', rates, 0);
    const withExpense = findMaxAnnualExpense(1_000_000, 'end', rates, 0, [{ year: 2, amount: -100_000 }]);
    const withIncome = findMaxAnnualExpense(1_000_000, 'end', rates, 0, [{ year: 2, amount: 100_000 }]);

    expect(withExpense).toBeLessThan(base);
    expect(withIncome).toBeGreaterThan(base);
  });

  it('solves zero nominal return with DFV and withdrawals exactly', () => {
    // W=5000, T=10, r=0, i=0, DFV=100k -> PV = 100k + 5000*10 = 150000
    const pv = findRequiredPortfolio(5_000, 'end', [{ duration: 10, r: 0, i: 0 }], 100_000);
    closeTo(pv, 150_000, 2);
    const sim = annualSimulation(pv, 5_000, 'end', [{ duration: 10, r: 0, i: 0 }]);
    closeTo(sim.finalBalance, 100_000, 2);
  });

  it('solves zero withdrawal with high DFV across 30 years', () => {
    // DFV = 1,000,000, r=7%, T=30 -> PV = 1M / (1.07^30) = 131367.07
    const expectedPv = 1_000_000 / Math.pow(1.07, 30);
    const pv = findRequiredPortfolio(0, 'end', [{ duration: 30, r: 0.07, i: 0.03 }], 1_000_000);
    closeTo(pv, expectedPv, 1);
    const sim = annualSimulation(pv, 0, 'end', [{ duration: 30, r: 0.07, i: 0.03 }]);
    closeTo(sim.finalBalance, 1_000_000, 0);
  });

  it('solves zero withdrawal with very high DFV (10M) across 50 years', () => {
    // DFV = 10,000,000, r=5%, T=50 -> PV = 10M / (1.05^50) = 872039.69
    const expectedPv = 10_000_000 / Math.pow(1.05, 50);
    const pv = findRequiredPortfolio(0, 'end', [{ duration: 50, r: 0.05, i: 0.02 }], 10_000_000);
    closeTo(pv, expectedPv, 0);
    const sim = annualSimulation(pv, 0, 'end', [{ duration: 50, r: 0.05, i: 0.02 }]);
    closeTo(sim.finalBalance, 10_000_000, 0);
  });

  it('matches all Python DFV matrix scenarios and reaches target final balances', () => {
    const rates = [{ duration: 30, r: 0.07, i: 0.03 }];
    const scenarios = [
      { dfv: 0, expectedPv: 1_362_275.06 },
      { dfv: 100_000, expectedPv: 1_375_411.77 },
      { dfv: 1_000_000, expectedPv: 1_493_642.18 },
      { dfv: 1_500_000, expectedPv: 1_559_325.73 }
    ];

    for (const { dfv, expectedPv } of scenarios) {
      const pv = findRequiredPortfolio(80_000, 'end', rates, dfv);
      closeTo(pv, expectedPv, 1);
      const sim = annualSimulation(pv, 80_000, 'end', rates);
      closeTo(sim.finalBalance, dfv, 0);
    }
  });

  it('proves growth sensitivity: 12% return requires strictly less portfolio than 7% return for DFV 2M and 4M', () => {
    for (const dfv of [2_000_000, 4_000_000]) {
      const pv7 = findRequiredPortfolio(80_000, 'end', [{ duration: 30, r: 0.07, i: 0.03 }], dfv);
      const pv12 = findRequiredPortfolio(80_000, 'end', [{ duration: 30, r: 0.12, i: 0.03 }], dfv);

      expect(pv12).toBeLessThan(pv7);
      const sim7 = annualSimulation(pv7, 80_000, 'end', [{ duration: 30, r: 0.07, i: 0.03 }]);
      const sim12 = annualSimulation(pv12, 80_000, 'end', [{ duration: 30, r: 0.12, i: 0.03 }]);
      closeTo(sim7.finalBalance, dfv, 0);
      closeTo(sim12.finalBalance, dfv, 0);
    }
  });

  it('solves single-period required portfolio baseline (25 years, r=7%, i=3%, DFV=0)', () => {
    // Exact Python literal from test_find_required_portfolio_scenarios: 614223.147699631
    const expectedPv = 614_223.147699631;
    const pv = findRequiredPortfolio(40_000, 'end', [{ duration: 25, r: 0.07, i: 0.03 }], 0);
    closeTo(pv, expectedPv, 2);
    const sim = annualSimulation(pv, 40_000, 'end', [{ duration: 25, r: 0.07, i: 0.03 }]);
    closeTo(sim.finalBalance, 0, 0);
  });

  it('solves single-period max annual expense baseline (30 years, r=6%, i=2.5%, DFV=0)', () => {
    // Exact Python literal from test_find_max_annual_expense_scenarios: 55136.150245186924
    const expectedW = 55_136.150245186924;
    const w = findMaxAnnualExpense(1_000_000, 'end', [{ duration: 30, r: 0.06, i: 0.025 }], 0);
    closeTo(w, expectedW, 2);
    const sim = annualSimulation(1_000_000, w, 'end', [{ duration: 30, r: 0.06, i: 0.025 }]);
    closeTo(sim.finalBalance, 0, 0);
  });

  it('simulates one-off income with start-of-year withdrawal timing', () => {
    // Exact scenario from Python test_annual_simulation_one_off_income_start_year_withdrawal:
    // PV=100k, W=4k, start timing, r=5%, i=2%, event: year 1 +5k
    const result = annualSimulation(
      100_000,
      4_000,
      'start',
      [{ duration: 3, r: 0.05, i: 0.02 }],
      [{ year: 1, amount: 5_000 }]
    );
    expect(result.balances[0]).toBe(100_000);
    closeTo(result.balances[1], 106_050.0);
    closeTo(result.balances[2], 107_068.5);
    closeTo(result.balances[3], 108_052.245, 2);
    closeTo(result.withdrawals[0], 4_000.0);
    closeTo(result.withdrawals[1], 4_080.0);
    closeTo(result.withdrawals[2], 4_161.6);
  });

  it('solves high DFV with varied return scenarios across 20 years', () => {
    // Exact scenarios from Python test_frp_high_dfv_low_withdrawal_varied_returns
    const scenarios = [
      { name: 'High Real Return', r: 0.08, i: 0.02 },
      { name: 'Moderate Real Return', r: 0.05, i: 0.02 },
      { name: 'Low/Zero Real Return', r: 0.02, i: 0.02 },
      { name: 'Negative Real Return', r: 0.01, i: 0.03 }
    ];

    for (const sc of scenarios) {
      const rates = [{ duration: 20, r: sc.r, i: sc.i }];
      const pv = findRequiredPortfolio(10_000, 'end', rates, 1_000_000);
      expect(Number.isFinite(pv)).toBe(true);
      expect(pv).toBeGreaterThan(0);
      const sim = annualSimulation(pv, 10_000, 'end', rates);
      closeTo(sim.finalBalance, 1_000_000, 0);
    }
  });

  it('solves high DFV with varied duration scenarios (10, 20, 30 years)', () => {
    // Exact scenarios from Python test_frp_high_dfv_high_withdrawal_varied_durations:
    // DFV = 500k, W = 40k, r=6%, i=3%
    for (const t of [10, 20, 30]) {
      const rates = [{ duration: t, r: 0.06, i: 0.03 }];
      const pv = findRequiredPortfolio(40_000, 'end', rates, 500_000);
      expect(Number.isFinite(pv)).toBe(true);
      expect(pv).toBeGreaterThan(0);
      const sim = annualSimulation(pv, 40_000, 'end', rates);
      closeTo(sim.finalBalance, 500_000, 0);
    }
  });

  it('matches final balance difference logic against target DFV', () => {
    // Exact scenarios from Python test_simulate_final_balance_logic:
    // Single period: diff = 101000 - 0 = 101000
    const simSingle = annualSimulation(100_000, 4_000, 'end', [{ duration: 1, r: 0.05, i: 0.02 }]);
    closeTo(simSingle.finalBalance - 0, 101_000.0, 2);

    // Multi period: diff = 109220 - 100000 = 9220
    const simMulti = annualSimulation(100_000, 1_000, 'end', [
      { duration: 1, r: 0.05, i: 0.02 },
      { duration: 1, r: 0.06, i: 0.03 }
    ]);
    closeTo(simMulti.finalBalance - 100_000, 9_220.0, 2);
  });
});
