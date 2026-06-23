import { describe, expect, it } from 'vitest';
import { calculateFirePlan, type PlanInput } from './fire';
import {
  buildFinancialInsights,
  topFinancialInsights,
  type FinancialInsightInput,
  type InsightAccount,
  type InsightGoal
} from './insights';

const basePlan: PlanInput = {
  annualExpense: 40_000,
  desiredFinalValue: 0,
  initialPortfolio: 1_000_000,
  oneOffEvents: [],
  ratePeriods: [{ duration: 30, i: 0.025, r: 0.06 }],
  recurringCashFlows: [],
  withdrawalTiming: 'end'
};

const account: InsightAccount = {
  balanceHistory: [
    { balanceCents: 125_000_00, balanceDate: '2026-06-01' },
    { balanceCents: 100_000_00, balanceDate: '2026-05-01' }
  ],
  category: 'asset',
  currency: 'USD',
  id: 'asset-1',
  latestBalanceCents: 125_000_00,
  latestBalanceDate: '2026-06-01',
  name: 'Brokerage'
};

const goal: InsightGoal = {
  currentAmountCents: 2_000_00,
  daysUntilTarget: 20,
  goalType: 'travel',
  id: 'goal-1',
  isOverdue: false,
  name: 'Family trip',
  progressPercent: 20,
  remainingAmountCents: 8_000_00,
  status: 'active',
  targetAmountCents: 10_000_00,
  targetDate: '2026-07-13'
};

function input(overrides: Partial<FinancialInsightInput> = {}): FinancialInsightInput {
  const plan = {
    name: 'Base retirement',
    plan: basePlan,
    result: calculateFirePlan(basePlan),
    versionNumber: 2
  };

  return {
    accounts: [account],
    goals: [goal],
    goalSummary: {
      activeGoalCount: 1,
      fundedPercent: 20,
      goalCount: 1,
      overdueGoalCount: 0,
      pausedGoalCount: 0,
      totalCurrentCents: 2_000_00,
      totalTargetCents: 10_000_00
    },
    plan,
    today: '2026-06-23',
    ...overrides
  };
}

describe('buildFinancialInsights', () => {
  it('prioritizes deterministic plan actions when the current plan is at risk', () => {
    const riskyPlan = { ...basePlan, annualExpense: 90_000, initialPortfolio: 200_000 };
    const insights = buildFinancialInsights(
      input({
        plan: {
          name: 'Lean test',
          plan: riskyPlan,
          result: calculateFirePlan(riskyPlan)
        }
      })
    );

    expect(insights[0]).toMatchObject({
      area: 'plan',
      priority: 'high',
      title: 'Close the modeled portfolio gap'
    });
    expect(insights[0].evidence.some((item) => item.label === 'Required portfolio')).toBe(true);
    expect(insights.every((item) => item.uncertainty.length > 0)).toBe(true);
  });

  it('uses only dated balance history for account trends', () => {
    const liability: InsightAccount = {
      balanceHistory: [
        { balanceCents: 4_000_00, balanceDate: '2026-06-01' },
        { balanceCents: 5_000_00, balanceDate: '2026-05-01' }
      ],
      category: 'liability',
      currency: 'USD',
      id: 'card-1',
      latestBalanceCents: 4_000_00,
      latestBalanceDate: '2026-06-01',
      name: 'Credit card'
    };

    const insights = buildFinancialInsights(input({ accounts: [account, liability] }));
    const trend = insights.find((item) => item.id === 'accounts-net-worth-trend');

    expect(trend).toMatchObject({
      area: 'accounts',
      category: 'observation'
    });
    expect(trend?.evidence.find((item) => item.label === 'Net movement')?.value).toBe('+$26,000');
  });

  it('does not invent a trend from one balance date', () => {
    const insights = buildFinancialInsights(
      input({
        accounts: [
          {
            ...account,
            balanceHistory: [{ balanceCents: 125_000_00, balanceDate: '2026-06-01' }]
          }
        ]
      })
    );

    expect(insights.find((item) => item.id === 'accounts-net-worth-trend')).toBeUndefined();
    expect(insights.find((item) => item.id === 'accounts-setup-second-balance')).toMatchObject({
      category: 'setup'
    });
  });

  it('surfaces overdue and near-term goal pressure with evidence', () => {
    const overdueGoal = {
      ...goal,
      daysUntilTarget: -5,
      id: 'overdue',
      isOverdue: true,
      name: 'Emergency reserve',
      targetDate: '2026-06-18'
    };
    const insights = buildFinancialInsights(
      input({
        goals: [overdueGoal, goal],
        goalSummary: {
          activeGoalCount: 2,
          fundedPercent: 20,
          goalCount: 2,
          overdueGoalCount: 1,
          pausedGoalCount: 0,
          totalCurrentCents: 4_000_00,
          totalTargetCents: 20_000_00
        }
      })
    );

    expect(insights.find((item) => item.id === 'goals-review-overdue')).toMatchObject({
      priority: 'high',
      title: 'Review overdue goals'
    });
    expect(insights.find((item) => item.id === 'goal-pace-goal-1')?.evidence).toContainEqual({
      label: 'Monthly pace',
      value: '$8,000'
    });
  });

  it('keeps rule-based privacy context in the insight set', () => {
    const insights = topFinancialInsights(input(), 20);

    expect(insights.find((item) => item.id === 'privacy-rule-based-guidance')).toMatchObject({
      area: 'privacy',
      category: 'observation'
    });
  });
});
