// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanningWorkspace, type PlanningSaveDraft, type PlanVersionDetail } from './PlanningWorkspace';
import { DashboardPanel } from './workspace/WorkspacePanels';
import { calculateFirePlan } from './lib/fire';
import { buildPlanDeepLink, parsePlanDeepLink } from './lib/navigation';
import { emptyAccountSummary, emptyCashflow, emptyGoalSummary } from './fixtures/syntheticData';
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

describe('B10 UI: Saved FIRE Decision Deep Link & Unsaved Changes Protection', () => {
  const syntheticAuth: Extract<AuthState, { status: 'signed-in' }> = {
    provider: 'clerk',
    status: 'signed-in',
    isConfigured: true,
    isSignedIn: true,
    getToken: async () => 'test_token',
    user: {
      id: 'user_1',
      displayName: 'Test User',
      email: 'test@example.com'
    }
  };

  const samplePlan1 = {
    id: 'plan_1',
    name: 'Early Retirement Strategy',
    label: 'Conservative 2026',
    notes: 'Initial plan with conservative assumption',
    versionNumber: 1,
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    goalId: null,
    snapshot: {
      calculatorMode: 'fire-number' as const,
      plan: {
        initialPortfolio: 500000,
        annualExpense: 40000,
        inflationRate: 0.025,
        investmentReturn: 0.07,
        retirementAge: 55,
        lifeExpectancy: 90,
        withdrawalTiming: 'start' as const,
        desiredFinalValue: 0,
        ratePeriods: [],
        oneOffEvents: []
      },
      timeline: { currentAge: 35, retirementAge: 55, planEndAge: 90 },
      scenarios: []
    }
  };

  const samplePlan2 = {
    id: 'plan_2',
    name: 'Coast FIRE Plan',
    label: 'Base Coast',
    notes: 'Part-time work in late 40s',
    versionNumber: 1,
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
    goalId: null,
    snapshot: {
      calculatorMode: 'fire-number' as const,
      plan: {
        initialPortfolio: 300000,
        annualExpense: 35000,
        inflationRate: 0.025,
        investmentReturn: 0.07,
        retirementAge: 50,
        lifeExpectancy: 90,
        withdrawalTiming: 'start' as const,
        desiredFinalValue: 0,
        ratePeriods: [],
        oneOffEvents: []
      },
      timeline: { currentAge: 32, retirementAge: 50, planEndAge: 90 },
      scenarios: []
    }
  };

  const sampleResult1 = calculateFirePlan(samplePlan1.snapshot.plan);

  afterEach(() => {
    while (cleanupFns.length > 0) {
      cleanupFns.pop()!();
    }
  });

  describe('1. Controlled error state for missing / forbidden / archived deep links', () => {
    it('renders controlled error state when deepLinkError is provided, without falling back', () => {
      const onClear = vi.fn();
      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={null}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={samplePlan1.snapshot.plan}
          currentResult={sampleResult1}
          currentSnapshot={samplePlan1.snapshot}
          currentTimeline={samplePlan1.snapshot.timeline}
          deepLinkError="Saved decision unavailable: This plan or version was not found, has been archived, or you do not have permission to view it."
          goals={[]}
          isLoading={false}
          isSaving={false}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onClearDeepLinkError={onClear}
          onLoadPlan={() => {}}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan1]}
          profile={null}
        />
      );

      const errorBanner = container.querySelector('[data-testid="planning-error-state"]');
      expect(errorBanner).not.toBeNull();
      expect(errorBanner?.textContent).toContain('Saved decision unavailable');
      expect(errorBanner?.textContent).toContain('permission to view it');

      // The button allows returning to library
      const clearBtn = errorBanner?.querySelector('button');
      expect(clearBtn).not.toBeNull();
      expect(clearBtn?.textContent).toContain('Return to plan library');
      act(() => {
        clearBtn?.click();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Historical version immutability and assumption disclosure', () => {
    it('renders historical version banner when loadedVersionNumber is set', () => {
      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={samplePlan1.id}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={samplePlan1.snapshot.plan}
          currentResult={sampleResult1}
          currentSnapshot={samplePlan1.snapshot}
          currentTimeline={samplePlan1.snapshot.timeline}
          goals={[]}
          isLoading={false}
          isSaving={false}
          loadedVersionNumber={1}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onLoadPlan={() => {}}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan1]}
          profile={null}
        />
      );

      const banner = container.querySelector('.historical-version-banner');
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain('Viewing historical Version 1');
      expect(banner?.textContent).toContain('Saved FIRE Decision');
      expect(banner?.textContent).toContain('locked');
    });
  });

  describe('3. Unsaved changes protection before replacing workspace assumptions', () => {
    it('prompts confirmation when edits exist and user loads another plan; cancel keeps edits, confirm discards', () => {
      const onLoadPlan = vi.fn();

      // currentPlan has modified initialPortfolio: 999999 (different from samplePlan1's 500000)
      const modifiedPlan = {
        ...samplePlan1.snapshot.plan,
        initialPortfolio: 999999
      };

      const { container } = renderComponent(
        <PlanningWorkspace
          accounts={[]}
          activePlanId={samplePlan1.id}
          auth={syntheticAuth}
          canUndoSeed={false}
          currentPlan={modifiedPlan}
          currentResult={calculateFirePlan(modifiedPlan)}
          currentSnapshot={{
            ...samplePlan1.snapshot,
            plan: modifiedPlan
          }}
          currentTimeline={samplePlan1.snapshot.timeline}
          goals={[]}
          isLoading={false}
          isSaving={false}
          message=""
          onApplySeed={() => {}}
          onArchive={() => {}}
          onLoadPlan={onLoadPlan}
          onLoadVersion={() => {}}
          onNavigateCalculator={() => {}}
          onSave={() => {}}
          onUndoSeed={() => {}}
          plans={[samplePlan1, samplePlan2]}
          profile={null}
        />
      );

      // Find the second plan in the library list and click "Open"
      const planRows = container.querySelectorAll('.planning-list-row');
      expect(planRows.length).toBeGreaterThanOrEqual(2);

      const secondPlanOpenBtn = planRows[1].querySelector('button.secondary-button') as HTMLButtonElement;
      expect(secondPlanOpenBtn).not.toBeNull();

      act(() => {
        secondPlanOpenBtn.click();
      });

      // Confirmation dialog should appear!
      const modal = container.querySelector('.modal-scrim');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Unsaved changes');
      expect(modal?.textContent).toContain('Loading another plan or version will discard these changes');

      // onLoadPlan has NOT been called yet
      expect(onLoadPlan).not.toHaveBeenCalled();

      // Test Cancel / Keep editing
      const cancelBtn = Array.from(modal!.querySelectorAll('button')).find(
        (btn) => btn.textContent?.includes('Keep editing')
      ) as HTMLButtonElement;
      expect(cancelBtn).not.toBeNull();

      act(() => {
        cancelBtn.click();
      });

      // Modal closed, edits kept, onLoadPlan not called
      expect(container.querySelector('.modal-scrim')).toBeNull();
      expect(onLoadPlan).not.toHaveBeenCalled();

      // Now click "Open" again and Confirm / Discard and load
      act(() => {
        secondPlanOpenBtn.click();
      });

      const modal2 = container.querySelector('.modal-scrim');
      expect(modal2).not.toBeNull();

      const discardBtn = Array.from(modal2!.querySelectorAll('button')).find(
        (btn) => btn.textContent?.includes('Discard and load')
      ) as HTMLButtonElement;
      expect(discardBtn).not.toBeNull();

      act(() => {
        discardBtn.click();
      });

      // Modal closed, onLoadPlan called with samplePlan2!
      expect(container.querySelector('.modal-scrim')).toBeNull();
      expect(onLoadPlan).toHaveBeenCalledWith(samplePlan2);
    });
  });

  describe('4. Dashboard follow-up links to saved plans and calculators', () => {
    it('navigates to buildPlanDeepLink when clicking a saved calculator result linked to a plan', () => {
      const onNavigate = vi.fn();

      const savedCalcResult = {
        id: 'calc_res_1',
        userId: 'usr_test_b10',
        calculatorSlug: 'fire-number',
        calculatorTitle: 'FIRE Number Calculator',
        calculatorCategory: 'fire',
        calculatorRegion: 'global',
        currency: 'USD',
        destinationType: 'plan' as const,
        conversionRoute: '/plans' as const,
        conversionLabel: 'Review plan',
        inputJson: '{}',
        resultJson: JSON.stringify({ metrics: [{ label: 'Savings goal', value: '$1,000,000' }] }),
        result: { metrics: [{ label: 'Savings goal', value: '$1,000,000' }] },
        input: {},
        createdEntityType: 'plan' as const,
        createdEntityId: 'plan_1',
        createdAt: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-01T12:00:00.000Z'
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
          savedCalculatorResults={[savedCalcResult as any]}
          summary={emptyAccountSummary}
        />
      );

      const card = container.querySelector('.dashboard-calculator-card') as HTMLButtonElement;
      expect(card).not.toBeNull();

      act(() => {
        card.click();
      });

      expect(onNavigate).toHaveBeenCalledWith('/plans?planId=plan_1');
    });

    it('navigates to buildPlanDeepLink when clicking a saved FIRE plan on dashboard', () => {
      const onNavigate = vi.fn();

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
          plans={[samplePlan1]}
          savedCalculatorResults={[]}
          summary={emptyAccountSummary}
        />
      );

      const planCard = container.querySelector('.dashboard-plan-card') as HTMLButtonElement;
      expect(planCard).not.toBeNull();
      expect(planCard.textContent).toContain('Early Retirement Strategy');

      act(() => {
        planCard.click();
      });

      expect(onNavigate).toHaveBeenCalledWith('/plans?planId=plan_1&version=1');
    });
  });
});
