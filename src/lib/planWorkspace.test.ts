import { describe, expect, it } from 'vitest';
import type { PlanInput } from './fire';
import { previewPlanSeed, undoPlanSeed } from './planWorkspace';

const plan: PlanInput = {
  annualExpense: 45_000,
  desiredFinalValue: 100_000,
  initialPortfolio: 250_000,
  oneOffEvents: [],
  ratePeriods: [{ duration: 35, i: 0.03, r: 0.06 }],
  recurringCashFlows: [],
  withdrawalTiming: 'end'
};

const timeline = { currentAge: 35, planEndAge: 90, retirementAge: 55 };
const profile = {
  birthYear: 1986,
  defaultCurrency: 'USD',
  targetRetirementAge: 58,
  updatedAt: '2026-06-01T00:00:00.000Z'
};

describe('previewPlanSeed', () => {
  it('previews selected same-currency dated asset accounts and profile ages', () => {
    const preview = previewPlanSeed({
      accounts: [
        {
          accountType: 'investment',
          category: 'asset',
          currency: 'USD',
          id: 'brokerage',
          isActive: true,
          latestBalanceCents: 32_500_000,
          latestBalanceDate: '2026-06-20',
          name: 'Brokerage'
        },
        {
          accountType: 'retirement',
          category: 'asset',
          currency: 'USD',
          id: 'retirement',
          isActive: true,
          latestBalanceCents: 47_500_000,
          latestBalanceDate: '2026-06-20',
          name: 'Retirement'
        }
      ],
      appliedAt: '2026-06-22T00:00:00.000Z',
      goal: null,
      plan,
      portfolioSource: 'accounts',
      profile,
      selectedAccountIds: ['brokerage', 'retirement'],
      timeline,
      todayYear: 2026
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    expect(preview.nextPlan.initialPortfolio).toBe(800_000);
    expect(preview.nextTimeline).toMatchObject({ currentAge: 40, retirementAge: 58 });
    expect(preview.applications).toHaveLength(4);
    expect(undoPlanSeed(preview)).toEqual({ plan, timeline });
  });

  it('rejects undated, inactive, liability, and mismatched-currency account sources', () => {
    const preview = previewPlanSeed({
      accounts: [
        {
          accountType: 'investment',
          category: 'asset',
          currency: 'EUR',
          id: 'invalid',
          isActive: true,
          latestBalanceCents: 10_000,
          latestBalanceDate: null,
          name: 'Invalid source'
        }
      ],
      goal: null,
      plan,
      portfolioSource: 'accounts',
      profile,
      selectedAccountIds: ['invalid'],
      timeline,
      todayYear: 2026
    });

    expect(preview).toEqual({
      errors: ['Invalid source does not have a dated balance.'],
      ok: false
    });
  });

  it('maps a retirement goal current amount and target date but keeps its target as a benchmark', () => {
    const preview = previewPlanSeed({
      accounts: [],
      goal: {
        currentAmountCents: 61_000_000,
        goalType: 'retirement',
        id: 'goal-1',
        name: 'Retire well',
        status: 'active',
        targetAmountCents: 175_000_000,
        targetDate: '2048-01-01',
        updatedAt: '2026-06-15T00:00:00.000Z'
      },
      plan,
      portfolioSource: 'goal',
      profile,
      selectedAccountIds: [],
      timeline,
      todayYear: 2026
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    expect(preview.nextPlan.initialPortfolio).toBe(610_000);
    expect(preview.nextPlan.desiredFinalValue).toBe(plan.desiredFinalValue);
    expect(preview.nextTimeline.retirementAge).toBe(62);
    expect(preview.goalBenchmarkCents).toBe(175_000_000);
  });

  it('allows profile-only seeding when no portfolio source is selected', () => {
    const preview = previewPlanSeed({
      accounts: [],
      goal: null,
      plan,
      portfolioSource: 'none',
      profile,
      selectedAccountIds: [],
      timeline,
      todayYear: 2026
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    expect(preview.nextPlan.initialPortfolio).toBe(plan.initialPortfolio);
    expect(preview.nextTimeline).toMatchObject({ currentAge: 40, retirementAge: 58 });
  });
});
