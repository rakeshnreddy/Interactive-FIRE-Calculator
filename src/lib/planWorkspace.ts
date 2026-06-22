import type { PlanInput } from './fire';

export type SeedProfile = {
  birthYear: number | null;
  defaultCurrency: string;
  targetRetirementAge: number | null;
  updatedAt: string;
};

export type SeedAccount = {
  accountType: string;
  category: 'asset' | 'liability';
  currency: string;
  id: string;
  isActive: boolean;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
};

export type SeedGoal = {
  currentAmountCents: number;
  goalType: string;
  id: string;
  name: string;
  status: string;
  targetAmountCents: number | null;
  targetDate: string | null;
  updatedAt: string;
};

export type SeedTimeline = {
  currentAge: number;
  planEndAge: number;
  retirementAge: number;
};

export type SeedApplication = {
  appliedAt: string;
  destination: 'timeline.currentAge' | 'timeline.retirementAge' | 'plan.initialPortfolio';
  sourceId: string;
  sourceKind: 'profile' | 'account' | 'goal';
  sourceUpdatedAt: string;
  value: number;
};

export type SeedChange = {
  after: number;
  before: number;
  field: SeedApplication['destination'];
};

export type PlanSeedPreview =
  | { errors: string[]; ok: false }
  | {
      applications: SeedApplication[];
      changes: SeedChange[];
      goalBenchmarkCents: number | null;
      nextPlan: PlanInput;
      nextTimeline: SeedTimeline;
      ok: true;
      previousPlan: PlanInput;
      previousTimeline: SeedTimeline;
    };

export function previewPlanSeed(input: {
  accounts: SeedAccount[];
  appliedAt?: string;
  goal: SeedGoal | null;
  plan: PlanInput;
  portfolioSource: 'accounts' | 'goal' | 'none';
  profile: SeedProfile | null;
  selectedAccountIds: string[];
  timeline: SeedTimeline;
  todayYear?: number;
}): PlanSeedPreview {
  const errors: string[] = [];
  const appliedAt = input.appliedAt ?? new Date().toISOString();
  const todayYear = input.todayYear ?? new Date().getUTCFullYear();
  const currency = input.profile?.defaultCurrency.toUpperCase() ?? 'USD';
  const nextPlan = { ...input.plan };
  const nextTimeline = { ...input.timeline };
  const changes: SeedChange[] = [];
  const applications: SeedApplication[] = [];

  if (input.profile?.birthYear !== null && input.profile?.birthYear !== undefined) {
    const currentAge = todayYear - input.profile.birthYear;

    if (currentAge >= 18 && currentAge <= 100) {
      addChange(changes, 'timeline.currentAge', nextTimeline.currentAge, currentAge);
      nextTimeline.currentAge = currentAge;
      applications.push({
        appliedAt,
        destination: 'timeline.currentAge',
        sourceId: 'profile',
        sourceKind: 'profile',
        sourceUpdatedAt: input.profile.updatedAt,
        value: currentAge
      });
    }
  }

  if (input.profile?.targetRetirementAge !== null && input.profile?.targetRetirementAge !== undefined) {
    const retirementAge = input.profile.targetRetirementAge;

    if (retirementAge > nextTimeline.currentAge && retirementAge < nextTimeline.planEndAge) {
      addChange(changes, 'timeline.retirementAge', nextTimeline.retirementAge, retirementAge);
      nextTimeline.retirementAge = retirementAge;
      applications.push({
        appliedAt,
        destination: 'timeline.retirementAge',
        sourceId: 'profile',
        sourceKind: 'profile',
        sourceUpdatedAt: input.profile.updatedAt,
        value: retirementAge
      });
    }
  }

  if (input.portfolioSource === 'accounts') {
    const selected = input.accounts.filter((account) => input.selectedAccountIds.includes(account.id));

    if (selected.length === 0) {
      errors.push('Select at least one asset account.');
    }

    for (const account of selected) {
      if (!account.isActive || account.category !== 'asset') {
        errors.push(`${account.name} is not an active asset account.`);
      } else if (!account.latestBalanceDate) {
        errors.push(`${account.name} does not have a dated balance.`);
      } else if (account.currency.toUpperCase() !== currency) {
        errors.push(`${account.name} uses ${account.currency}, not ${currency}.`);
      }
    }

    if (errors.length === 0) {
      const initialPortfolio = selected.reduce((sum, account) => sum + account.latestBalanceCents / 100, 0);
      addChange(changes, 'plan.initialPortfolio', nextPlan.initialPortfolio, initialPortfolio);
      nextPlan.initialPortfolio = initialPortfolio;

      for (const account of selected) {
        applications.push({
          appliedAt,
          destination: 'plan.initialPortfolio',
          sourceId: account.id,
          sourceKind: 'account',
          sourceUpdatedAt: account.latestBalanceDate ?? '',
          value: account.latestBalanceCents / 100
        });
      }
    }
  }

  if (input.portfolioSource === 'goal') {
    if (!input.goal || input.goal.goalType !== 'retirement' || input.goal.status === 'archived') {
      errors.push('Select an available retirement goal.');
    } else {
      const initialPortfolio = input.goal.currentAmountCents / 100;
      addChange(changes, 'plan.initialPortfolio', nextPlan.initialPortfolio, initialPortfolio);
      nextPlan.initialPortfolio = initialPortfolio;
      applications.push({
        appliedAt,
        destination: 'plan.initialPortfolio',
        sourceId: input.goal.id,
        sourceKind: 'goal',
        sourceUpdatedAt: input.goal.updatedAt,
        value: initialPortfolio
      });

      if (input.goal.targetDate && input.profile?.birthYear) {
        const targetYear = Number(input.goal.targetDate.slice(0, 4));
        const retirementAge = targetYear - input.profile.birthYear;

        if (retirementAge > nextTimeline.currentAge && retirementAge < nextTimeline.planEndAge) {
          addChange(changes, 'timeline.retirementAge', nextTimeline.retirementAge, retirementAge);
          nextTimeline.retirementAge = retirementAge;
          applications.push({
            appliedAt,
            destination: 'timeline.retirementAge',
            sourceId: input.goal.id,
            sourceKind: 'goal',
            sourceUpdatedAt: input.goal.updatedAt,
            value: retirementAge
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  return {
    applications,
    changes,
    goalBenchmarkCents: input.goal?.goalType === 'retirement' ? input.goal.targetAmountCents : null,
    nextPlan,
    nextTimeline,
    ok: true,
    previousPlan: { ...input.plan },
    previousTimeline: { ...input.timeline }
  };
}

export function undoPlanSeed(preview: Extract<PlanSeedPreview, { ok: true }>): {
  plan: PlanInput;
  timeline: SeedTimeline;
} {
  return {
    plan: { ...preview.previousPlan },
    timeline: { ...preview.previousTimeline }
  };
}

function addChange(
  changes: SeedChange[],
  field: SeedChange['field'],
  before: number,
  after: number
): void {
  if (before !== after) {
    changes.push({ after, before, field });
  }
}
