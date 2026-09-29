import { describe, expect, it } from 'vitest';
import {
  averageRate,
  engineWarnings,
  firstNegativeYear,
  humanizeWarningTitle,
  normalizeWarning,
  planWarnings,
  shouldSuppressHorizonDepletion,
  stressTestCurrentPortfolio
} from './warnings';
import type { FirePlanResult, PlanInput, YearResult } from './fire';

describe('warnings.ts', () => {
  describe('humanizeWarningTitle', () => {
    it('maps known engine codes to readable titles', () => {
      expect(humanizeWarningTitle('balance_depleted')).toBe('Portfolio depleted');
      expect(humanizeWarningTitle('high_inflation_assumption')).toBe('High inflation assumption');
      expect(humanizeWarningTitle('empty_rate_periods')).toBe('Missing rate periods');
    });

    it('transforms unknown snake_case strings to capitalized words', () => {
      expect(humanizeWarningTitle('custom_unknown_warning')).toBe('Custom Unknown Warning');
      expect(humanizeWarningTitle('PlainTitle')).toBe('PlainTitle');
    });
  });

  describe('normalizeWarning', () => {
    it('handles string input with warning severity', () => {
      const res = normalizeWarning('Simple warning text', 0);
      expect(res).toEqual({
        message: 'Simple warning text',
        severity: 'warning',
        title: 'Model check 1'
      });
    });

    it('returns null for non-record values', () => {
      expect(normalizeWarning(null, 0)).toBeNull();
      expect(normalizeWarning(123, 0)).toBeNull();
    });

    it('extracts severity, mode context, title, and description', () => {
      const res = normalizeWarning(
        {
          code: 'high_return_assumption',
          description: 'Return rate is too high',
          mode: 'expense',
          severity: 'critical'
        },
        1
      );
      expect(res).toEqual({
        message: 'Return rate is too high',
        severity: 'critical',
        title: 'High return assumption (Target spend)'
      });
    });
  });

  describe('shouldSuppressHorizonDepletion', () => {
    it('suppresses balance_depleted at exact duration when ending balance is <= $1 tolerance and desiredFinalValue is 0', () => {
      const warning = {
        code: 'balance_depleted',
        value: 0.5,
        year: 30
      };
      expect(shouldSuppressHorizonDepletion(warning, 30, 0)).toBe(true);
    });

    it('does not suppress if ending balance exceeds tolerance', () => {
      const warning = {
        code: 'balance_depleted',
        value: -500,
        year: 30
      };
      expect(shouldSuppressHorizonDepletion(warning, 30, 0)).toBe(false);
    });

    it('does not suppress if year does not match duration', () => {
      const warning = {
        code: 'balance_depleted',
        value: 0,
        year: 15
      };
      expect(shouldSuppressHorizonDepletion(warning, 30, 0)).toBe(false);
    });

    it('does not suppress if desiredFinalValue is non-zero', () => {
      const warning = {
        code: 'balance_depleted',
        value: 0,
        year: 30
      };
      expect(shouldSuppressHorizonDepletion(warning, 30, 100000)).toBe(false);
    });
  });

  describe('firstNegativeYear', () => {
    it('identifies the first year where ending balance is negative', () => {
      const rows: YearResult[] = [
        { year: 1, endingBalance: 10000 } as any,
        { year: 2, endingBalance: 5000 } as any,
        { year: 3, endingBalance: -100 } as any,
        { year: 4, endingBalance: -5000 } as any
      ];
      expect(firstNegativeYear(rows)).toBe(3);
    });

    it('returns null if no balances are negative', () => {
      const rows: YearResult[] = [
        { year: 1, endingBalance: 10000 } as any,
        { year: 2, endingBalance: 5000 } as any
      ];
      expect(firstNegativeYear(rows)).toBeNull();
    });
  });

  describe('averageRate', () => {
    it('computes duration-weighted average rate', () => {
      const periods = [
        { duration: 10, i: 0.02, r: 0.06 },
        { duration: 20, i: 0.03, r: 0.09 }
      ];
      // Total duration = 30
      // r: (10 * 0.06 + 20 * 0.09) / 30 = (0.6 + 1.8) / 30 = 2.4 / 30 = 0.08
      expect(averageRate(periods, 'r')).toBeCloseTo(0.08);
      // i: (10 * 0.02 + 20 * 0.03) / 30 = (0.2 + 0.6) / 30 = 0.8 / 30 = 0.02666...
      expect(averageRate(periods, 'i')).toBeCloseTo(0.8 / 30);
    });
  });

  describe('planWarnings and engineWarnings', () => {
    const mockPlan: PlanInput = {
      annualExpense: 60000,
      desiredFinalValue: 0,
      initialPortfolio: 500000,
      oneOffEvents: [{ amount: -10000, label: 'Car', year: 35 }],
      ratePeriods: [{ duration: 30, i: 0.03, r: 0.02 }],
      recurringCashFlows: [],
      withdrawalTiming: 'end'
    };

    const mockResult: FirePlanResult = {
      expenseMode: { balances: [], finalBalance: 0, rows: [], warnings: [], withdrawals: [], years: [] },
      maxAnnualExpense: 60000,
      portfolioMode: { balances: [], finalBalance: 0, rows: [], warnings: [], withdrawals: [], years: [] },
      requiredPortfolio: 1500000,
      warnings: []
    };

    it('generates drawdown, funding gap, high withdrawal, outside events, and inflation pressure notices', () => {
      const currentRows: YearResult[] = [
        { year: 1, endingBalance: 400000 } as any,
        { year: 2, endingBalance: -50000 } as any
      ];

      const notices = planWarnings(mockPlan, mockResult, currentRows, 30);

      // Drawdown: year 2
      expect(notices.some((n) => n.title === 'If withdrawals started now')).toBe(true);
      // Gap: 1,500,000 - 500,000 = 1,000,000
      expect(notices.some((n) => n.title === 'Funding gap')).toBe(true);
      // High withdrawal: 60,000 / 500,000 = 12% (> 6%)
      expect(notices.some((n) => n.title === 'High starting withdrawal')).toBe(true);
      // Cash flow outside timeline: year 35 > duration 30
      expect(notices.some((n) => n.title === 'Cash flow outside timeline')).toBe(true);
      // Inflation pressure: inflation (3%) >= return (2%)
      expect(notices.some((n) => n.title === 'Inflation pressure')).toBe(true);
    });

    it('deduplicates identical notices', () => {
      const resultWithDuplicate: FirePlanResult = {
        ...mockResult,
        warnings: [
          { code: 'invalid_money_value', message: 'Invalid value', severity: 'warning' },
          { code: 'invalid_money_value', message: 'Invalid value', severity: 'warning' }
        ]
      };
      const notices = planWarnings(mockPlan, resultWithDuplicate, [], 30);
      const duplicateNotices = notices.filter((n) => n.title === 'Invalid financial value');
      expect(duplicateNotices.length).toBe(1);
    });
  });

  describe('stressTestCurrentPortfolio', () => {
    it('simulates portfolio trajectory without throwing', () => {
      const plan: PlanInput = {
        annualExpense: 40000,
        desiredFinalValue: 0,
        initialPortfolio: 800000,
        oneOffEvents: [],
        ratePeriods: [{ duration: 10, i: 0.02, r: 0.05 }],
        recurringCashFlows: [],
        withdrawalTiming: 'end'
      };
      const result = stressTestCurrentPortfolio(plan);
      expect(result.rows.length).toBe(10);
      expect(result.finalBalance).toBeGreaterThan(0);
    });
  });
});
