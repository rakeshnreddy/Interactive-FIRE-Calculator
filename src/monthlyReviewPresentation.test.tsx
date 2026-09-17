// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanningWorkspace, type PlanningSavedPlan } from './PlanningWorkspace';
import { DashboardPanel, GoalsPanel } from './App';
import { calculateFirePlan } from './lib/fire';
import {
  calculatePlanReviewDueStatus,
  type DueStatusResult,
  type StoredPlanReview
} from './lib/planReviews';
import {
  emptyAccountSummary,
  emptyCashflow,
  emptyGoalSummary,
  populatedGoals,
  populatedSavedPlans,
  staleGoals
} from './fixtures/syntheticData';
import type { AuthState } from './auth';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const cleanupFns: (() => void)[] = [];

function renderComponent(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  const unmount = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  cleanupFns.push(unmount);
  return { container, unmount };
}

describe('B11 & B28: Monthly Plan Review & Goals Presentation UI', () => {
  const syntheticAuth: Extract<AuthState, { status: 'signed-in' }> = {
    provider: 'clerk',
    status: 'signed-in',
    isConfigured: true,
    isSignedIn: true,
    getToken: async () => 'test_token',
    user: {
      id: 'usr_test_b11',
      displayName: 'Test User',
      email: 'test@example.com'
    }
  };

  const samplePlan: PlanningSavedPlan = {
    id: 'plan_b11_01',
    name: 'Retirement Independence Roadmap',
    label: 'Baseline 2026',
    notes: 'Conservative 3.5% SWR',
    versionNumber: 1,
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    goalId: 'goal_01',
    snapshot: {
      calculatorMode: 'fire-number',
      plan: {
        initialPortfolio: 500000,
        annualExpense: 40000,
        withdrawalTiming: 'start',
        desiredFinalValue: 0,
        ratePeriods: [{ duration: 35, r: 0.07, i: 0.025 }],
        oneOffEvents: []
      },
      timeline: { currentAge: 35, retirementAge: 55, planEndAge: 90 },
      scenarios: []
    }
  };

  const sampleResult = calculateFirePlan(samplePlan.snapshot.plan);

  afterEach(() => {
    while (cleanupFns.length > 0) {
      cleanupFns.pop()!();
    }
    vi.restoreAllMocks();
  });

  describe('PlanningWorkspace Review Panel Presentation (B11)', () => {
    it('renders "too-early" status banner when less than 7 days from baseline', () => {
      const dueStatus: DueStatusResult = {
        daysSinceBaseline: 3,
        daysUntilEligible: 4,
        deferredUntil: null,
        eligibleForReview: false,
        evidenceAgeDays: 3,
        evidenceDate: '2026-06-01',
        isEvidenceStale: false,
        nextReviewDue: '2026-07-01',
        status: 'too-early'
      };

      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={samplePlan.id}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={samplePlan.snapshot.plan}
          currentResult={sampleResult}
          currentSnapshot={samplePlan.snapshot}
          currentTimeline={samplePlan.snapshot.timeline}
          goals={[]}
          initialDueStatus={dueStatus}
          initialReviews={[]}
          isLoading={false}
          isSaving={false}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onLoadPlan={() => {}}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan]}
          profile={null}
        />
      );

      const reviewPanel = container.querySelector('.planning-review-panel');
      expect(reviewPanel).not.toBeNull();
      expect(reviewPanel?.textContent).toContain('Monthly plan review');
      expect(reviewPanel?.textContent).toContain('First returning review available in 4 days');
      expect(reviewPanel?.querySelector('.review-badge-too-early')).not.toBeNull();
      // Choice radios should NOT be present when too early
      expect(container.querySelector('.review-action-container')).toBeNull();
    });

    it('renders "due" status banner with keep/revise/defer choices and submit button', () => {
      const dueStatus: DueStatusResult = {
        daysSinceBaseline: 32,
        daysUntilEligible: 0,
        deferredUntil: null,
        eligibleForReview: true,
        evidenceAgeDays: 32,
        evidenceDate: '2026-06-01',
        isEvidenceStale: true,
        nextReviewDue: '2026-07-01',
        status: 'due'
      };

      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={samplePlan.id}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={samplePlan.snapshot.plan}
          currentResult={sampleResult}
          currentSnapshot={samplePlan.snapshot}
          currentTimeline={samplePlan.snapshot.timeline}
          goals={[]}
          initialDueStatus={dueStatus}
          initialReviews={[]}
          isLoading={false}
          isSaving={false}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onLoadPlan={() => {}}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan]}
          profile={null}
        />
      );

      const reviewCard = container.querySelector('.review-status-due');
      expect(reviewCard).not.toBeNull();
      expect(reviewCard?.textContent).toContain('Monthly review due');
      expect(container.querySelector('.review-badge-due')?.textContent).toContain('Review Due');

      // Stale evidence alert
      const staleBox = container.querySelector('.stale-evidence-box');
      expect(staleBox).not.toBeNull();
      expect(staleBox?.textContent).toContain('Stale evidence (32 days old)');

      // Radiogroup with keep, revise, defer
      const radioGroup = container.querySelector('.review-decision-group');
      expect(radioGroup).not.toBeNull();
      expect(radioGroup?.textContent).toContain('Keep assumptions');
      expect(radioGroup?.textContent).toContain('Revise assumptions');
      expect(radioGroup?.textContent).toContain('Defer review (14 days)');

      // Submit action button
      const submitBtn = container.querySelector('.review-action-container .primary-button');
      expect(submitBtn).not.toBeNull();
      expect(submitBtn?.textContent).toContain('Confirm unchanged assumptions');
    });

    it('renders "overdue" status banner when review date is passed by > 14 days', () => {
      const dueStatus: DueStatusResult = {
        daysSinceBaseline: 60,
        daysUntilEligible: 0,
        deferredUntil: null,
        eligibleForReview: true,
        evidenceAgeDays: 60,
        evidenceDate: '2026-05-01',
        isEvidenceStale: true,
        nextReviewDue: '2026-06-01',
        status: 'overdue'
      };

      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={samplePlan.id}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={samplePlan.snapshot.plan}
          currentResult={sampleResult}
          currentSnapshot={samplePlan.snapshot}
          currentTimeline={samplePlan.snapshot.timeline}
          goals={[]}
          initialDueStatus={dueStatus}
          initialReviews={[]}
          isLoading={false}
          isSaving={false}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onLoadPlan={() => {}}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan]}
          profile={null}
        />
      );

      expect(container.querySelector('.review-status-overdue')).not.toBeNull();
      expect(container.querySelector('.review-badge-overdue')?.textContent).toContain('Review Overdue');
      expect(container.textContent).toContain('This plan has not been reviewed within the monthly cadence');
    });

    it('renders past review history with version, decision badge, and dates', () => {
      const pastReview: StoredPlanReview = {
        id: 'rev_01',
        planId: samplePlan.id,
        planVersionNumber: 1,
        decision: 'keep',
        status: 'completed',
        evidenceDate: '2026-06-01',
        nextReviewDue: '2026-07-01',
        deferredUntil: null,
        notes: 'Assets on track according to Vanguard statement.',
        completedAt: '2026-06-01T14:00:00.000Z',
        createdAt: '2026-06-01T14:00:00.000Z',
        updatedAt: '2026-06-01T14:00:00.000Z'
      };

      const dueStatus: DueStatusResult = {
        daysSinceBaseline: 10,
        daysUntilEligible: 0,
        deferredUntil: null,
        eligibleForReview: true,
        evidenceAgeDays: 10,
        evidenceDate: '2026-06-01',
        isEvidenceStale: false,
        nextReviewDue: '2026-07-01',
        status: 'up-to-date'
      };

      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={samplePlan.id}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={samplePlan.snapshot.plan}
          currentResult={sampleResult}
          currentSnapshot={samplePlan.snapshot}
          currentTimeline={samplePlan.snapshot.timeline}
          goals={[]}
          initialDueStatus={dueStatus}
          initialReviews={[pastReview]}
          isLoading={false}
          isSaving={false}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onLoadPlan={() => {}}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan]}
          profile={null}
        />
      );

      const historySection = container.querySelector('.review-history-section');
      expect(historySection).not.toBeNull();
      expect(historySection?.textContent).toContain('Version 1');
      expect(historySection?.textContent).toContain('Decision: Keep assumptions');
      expect(historySection?.textContent).toContain('Vanguard statement');
      expect(container.querySelector('.review-badge-keep')).not.toBeNull();
    });
  });

  describe('DashboardPanel Reviews Rollup (B11 / B28)', () => {
    it('renders dashboard-reviews-rollup when a plan has a due review', () => {
      const onNavigate = vi.fn();
      const planDue = {
        ...samplePlan,
        dueStatus: {
          daysSinceBaseline: 35,
          daysUntilEligible: 0,
          deferredUntil: null,
          eligibleForReview: true,
          evidenceAgeDays: 35,
          evidenceDate: '2026-06-01',
          isEvidenceStale: true,
          nextReviewDue: '2026-07-01',
          status: 'due' as const
        }
      };

      const { container } = renderComponent(
        <DashboardPanel
          accounts={[]}
          cashflow={emptyCashflow}
          calculatorResultMessage=""
          goals={[]}
          insights={[]}
          isLoading={false}
          isLoadingCalculatorResults={false}
          isLoadingGoals={false}
          message=""
          goalMessage=""
          goalSummary={emptyGoalSummary}
          onNavigate={onNavigate}
          plans={[planDue]}
          savedCalculatorResults={[]}
          summary={emptyAccountSummary}
        />
      );

      const rollup = container.querySelector('.dashboard-reviews-rollup');
      expect(rollup).not.toBeNull();
      expect(rollup?.textContent).toContain('Reviews needing attention (1)');

      const reviewCard = container.querySelector('.dashboard-review-card-due') as HTMLButtonElement;
      expect(reviewCard).not.toBeNull();
      expect(reviewCard.textContent).toContain('Review Due');
      expect(reviewCard.textContent).toContain('Retirement Independence Roadmap');

      act(() => {
        reviewCard.click();
      });

      expect(onNavigate).toHaveBeenCalledWith('/plans?planId=plan_b11_01&version=1');
    });

    it('does not render dashboard-reviews-rollup when all plans are up to date', () => {
      const planOk = {
        ...samplePlan,
        dueStatus: {
          daysSinceBaseline: 15,
          daysUntilEligible: 0,
          deferredUntil: null,
          eligibleForReview: true,
          evidenceAgeDays: 15,
          evidenceDate: '2026-06-01',
          isEvidenceStale: false,
          nextReviewDue: '2026-07-01',
          status: 'up-to-date' as const
        }
      };

      const { container } = renderComponent(
        <DashboardPanel
          accounts={[]}
          cashflow={emptyCashflow}
          calculatorResultMessage=""
          goals={[]}
          insights={[]}
          isLoading={false}
          isLoadingCalculatorResults={false}
          isLoadingGoals={false}
          message=""
          goalMessage=""
          goalSummary={emptyGoalSummary}
          onNavigate={vi.fn()}
          plans={[planOk]}
          savedCalculatorResults={[]}
          summary={emptyAccountSummary}
        />
      );

      expect(container.querySelector('.dashboard-reviews-rollup')).toBeNull();
      // But the plan card in the calculator list should show the badge
      const planBadge = container.querySelector('.dashboard-plan-card .review-badge-up-to-date');
      expect(planBadge).not.toBeNull();
      expect(planBadge?.textContent).toBe('Up to Date');
    });
  });

  describe('GoalsPanel Presentation (B28)', () => {
    it('renders linked plan disclosure, version badge, and navigation deep link', () => {
      const onNavigate = vi.fn();
      const goal = populatedGoals[0]; // goal_01, linked to samplePlan (goalId: 'goal_01')

      const { container } = renderComponent(
        <GoalsPanel
          draft={{ currentAmount: '', goalType: 'retirement', name: '', targetAmount: '', targetDate: '' }}
          goals={[goal]}
          isLoading={false}
          isSaving={false}
          message=""
          summary={emptyGoalSummary}
          updateDrafts={{}}
          plans={[samplePlan]}
          onNavigate={onNavigate}
          onArchiveGoal={() => {}}
          onCreateGoal={() => {}}
          onDraftChange={() => {}}
          onUpdateDraftChange={() => {}}
          onUpdateGoal={() => {}}
        />
      );

      const linkedPlan = container.querySelector('.goal-linked-plan');
      expect(linkedPlan).not.toBeNull();
      expect(linkedPlan?.textContent).toContain('Linked plan: Retirement Independence Roadmap (v1)');

      const openPlanBtn = linkedPlan?.querySelector('.goal-link-button') as HTMLButtonElement;
      expect(openPlanBtn).not.toBeNull();

      act(() => {
        openPlanBtn.click();
      });

      expect(onNavigate).toHaveBeenCalledWith('/plans?planId=plan_b11_01&version=1');
    });

    it('renders unlinked note when goal does not correspond to any plan', () => {
      const unlinkedGoal = { ...populatedGoals[1], id: 'goal_unlinked_99' };

      const { container } = renderComponent(
        <GoalsPanel
          draft={{ currentAmount: '', goalType: 'emergency_fund', name: '', targetAmount: '', targetDate: '' }}
          goals={[unlinkedGoal]}
          isLoading={false}
          isSaving={false}
          message=""
          summary={emptyGoalSummary}
          updateDrafts={{}}
          plans={[samplePlan]}
          onArchiveGoal={() => {}}
          onCreateGoal={() => {}}
          onDraftChange={() => {}}
          onUpdateDraftChange={() => {}}
          onUpdateGoal={() => {}}
        />
      );

      expect(container.querySelector('.goal-unlinked-note')?.textContent).toBe('Manual milestone (unlinked)');
    });

    it('displays evidence recorded date and warns when evidence is stale (>30 days)', () => {
      const staleGoal = staleGoals[0]; // updatedAt in 2025

      const { container } = renderComponent(
        <GoalsPanel
          draft={{ currentAmount: '', goalType: 'retirement', name: '', targetAmount: '', targetDate: '' }}
          goals={[staleGoal]}
          isLoading={false}
          isSaving={false}
          message=""
          summary={emptyGoalSummary}
          updateDrafts={{}}
          plans={[]}
          onArchiveGoal={() => {}}
          onCreateGoal={() => {}}
          onDraftChange={() => {}}
          onUpdateDraftChange={() => {}}
          onUpdateGoal={() => {}}
        />
      );

      expect(container.querySelector('.goal-evidence-date')?.textContent).toContain('Evidence recorded:');

      const staleBox = container.querySelector('.stale-evidence-box');
      expect(staleBox).not.toBeNull();
      expect(staleBox?.textContent).toContain('Stale evidence');
    });

    it('displays explicit funding gap amount and completed status', () => {
      const completedGoal = populatedGoals[1]; // 6-Month Emergency Fund, 100% funded, remaining 0

      const { container } = renderComponent(
        <GoalsPanel
          draft={{ currentAmount: '', goalType: 'emergency_fund', name: '', targetAmount: '', targetDate: '' }}
          goals={[completedGoal]}
          isLoading={false}
          isSaving={false}
          message=""
          summary={emptyGoalSummary}
          updateDrafts={{}}
          plans={[]}
          onArchiveGoal={() => {}}
          onCreateGoal={() => {}}
          onDraftChange={() => {}}
          onUpdateDraftChange={() => {}}
          onUpdateGoal={() => {}}
        />
      );

      const gapRow = container.querySelector('.goal-funding-gap-row');
      expect(gapRow).not.toBeNull();
      expect(gapRow?.textContent).toContain('Goal funded');
      expect(container.querySelector('.goal-status-completed')?.textContent).toBe('Completed');
    });

    it('displays explicit OVERDUE badge text for overdue goals', () => {
      const overdueGoal = {
        ...populatedGoals[0],
        isOverdue: true,
        status: 'active' as const
      };

      const { container } = renderComponent(
        <GoalsPanel
          draft={{ currentAmount: '', goalType: 'retirement', name: '', targetAmount: '', targetDate: '' }}
          goals={[overdueGoal]}
          isLoading={false}
          isSaving={false}
          message=""
          summary={emptyGoalSummary}
          updateDrafts={{}}
          plans={[]}
          onArchiveGoal={() => {}}
          onCreateGoal={() => {}}
          onDraftChange={() => {}}
          onUpdateDraftChange={() => {}}
          onUpdateGoal={() => {}}
        />
      );

      const overdueBadge = container.querySelector('.goal-status-overdue');
      expect(overdueBadge).not.toBeNull();
      expect(overdueBadge?.textContent).toBe('OVERDUE');
    });

    it('renders empty goals state gracefully', () => {
      const { container } = renderComponent(
        <GoalsPanel
          draft={{ currentAmount: '', goalType: 'retirement', name: '', targetAmount: '', targetDate: '' }}
          goals={[]}
          isLoading={false}
          isSaving={false}
          message=""
          summary={emptyGoalSummary}
          updateDrafts={{}}
          plans={[]}
          onArchiveGoal={() => {}}
          onCreateGoal={() => {}}
          onDraftChange={() => {}}
          onUpdateDraftChange={() => {}}
          onUpdateGoal={() => {}}
        />
      );

      expect(container.textContent).toContain('No goals yet');
      expect(container.textContent).toContain('Create a goal to begin tracking funding and deadlines.');
    });
  });
});
