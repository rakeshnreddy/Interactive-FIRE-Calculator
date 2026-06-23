import { describe, expect, it } from 'vitest';
import { calculateFirePlan, type PlanInput } from './fire';
import { derivePlanHealth, derivePlanHealthActions } from './planHealth';

const basePlan: PlanInput = {
  annualExpense: 40_000,
  desiredFinalValue: 0,
  initialPortfolio: 1_000_000,
  oneOffEvents: [],
  ratePeriods: [{ duration: 30, i: 0.025, r: 0.06 }],
  recurringCashFlows: [],
  withdrawalTiming: 'end'
};

describe('derivePlanHealth', () => {
  it('marks a fully funded version healthy with deterministic evidence', () => {
    const result = calculateFirePlan(basePlan);
    const health = derivePlanHealth(basePlan, result);

    expect(health.status).toBe('healthy');
    expect(health.checks.map((check) => check.code)).toEqual([
      'portfolio_gap',
      'spending_coverage',
      'ending_balance',
      'engine_warnings'
    ]);
    expect(health.checks[0].evidence.portfolioGap).toBeGreaterThan(0);
    expect(health.checks.every((check) => check.explanation.length > 0)).toBe(true);
  });

  it('marks a materially underfunded version at risk', () => {
    const plan = { ...basePlan, annualExpense: 90_000, initialPortfolio: 200_000 };
    const health = derivePlanHealth(plan, calculateFirePlan(plan));

    expect(health.status).toBe('at-risk');
    expect(health.checks.find((check) => check.code === 'portfolio_gap')?.severity).toBe(
      'critical'
    );
    expect(health.checks.find((check) => check.code === 'spending_coverage')?.severity).toBe(
      'critical'
    );
  });

  it('surfaces assumption warnings without inventing recommendations', () => {
    const plan = {
      ...basePlan,
      ratePeriods: [{ duration: 30, i: 0.08, r: 0.14 }]
    };
    const health = derivePlanHealth(plan, calculateFirePlan(plan));

    expect(health.status).toBe('watch');
    expect(health.checks.find((check) => check.code === 'engine_warnings')).toMatchObject({
      severity: 'warning',
      title: 'Model checks'
    });
  });

  it('turns at-risk checks into prioritized traceable actions', () => {
    const plan = { ...basePlan, annualExpense: 90_000, initialPortfolio: 200_000 };
    const actions = derivePlanHealthActions(plan, calculateFirePlan(plan));

    expect(actions[0]).toMatchObject({
      code: 'close_portfolio_gap',
      priority: 'high'
    });
    expect(actions.map((action) => action.code)).toContain('test_spending_adjustment');
    expect(actions.every((action) => action.assumptions.length > 0)).toBe(true);
    expect(actions.every((action) => action.uncertainty.length > 0)).toBe(true);
  });

  it('preserves a healthy version without overstating certainty', () => {
    const actions = derivePlanHealthActions(basePlan, calculateFirePlan(basePlan));

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      code: 'preserve_healthy_version',
      priority: 'low'
    });
    expect(actions[0].uncertainty).toContain('not a guarantee');
  });
});
