import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { buildReportScope } from '../reports/reportScope';
import {
  InsightsPanel,
  PrivacyControlsPanel,
  type AccountDraft,
  type AccountProfileDraft,
  type BalanceDraft,
  type GoalDraft,
  type GoalUpdateDraft,
  type TransactionDraft
} from '../App';
import { AccountsPanel, DashboardPanel, GoalsPanel, ProfileSettingsPanel, TransactionsPanel } from '../workspace/WorkspacePanels';
import type { TransactionFilters } from '../lib/transactionAnalytics';
import { PlanningWorkspace, type PlanningSaveDraft, type PlanVersionDetail } from '../PlanningWorkspace';
import '../styles.css';
import '../vivid-theme.css';
import './fixtures.css';
import { installFixtureNetworkGuard, setFixtureGuardState } from './fixtureNetworkGuard';
import {
  SYNTHETIC_FIXTURE_MARKER,
  syntheticAuth,
  populatedAccounts,
  staleAccounts,
  longValueAccounts,
  emptyAccountSummary,
  populatedAccountSummary,
  longValueAccountSummary,
  populatedTransactions,
  staleTransactions,
  longValueTransactions,
  emptyTransactionSummary,
  populatedTransactionSummary,
  staleTransactionSummary,
  longValueTransactionSummary,
  populatedCashflow,
  emptyCashflow,
  longValueCashflow,
  defaultTransactionFilters,
  populatedGoals,
  staleGoals,
  longValueGoals,
  emptyGoalSummary,
  populatedGoalSummary,
  staleGoalSummary,
  longValueGoalSummary,
  populatedSavedPlans,
  longValueSavedPlans,
  populatedPlanResult,
  longPlanResult,
  populatedInsights,
  longValueInsights,
  populatedProfile,
  populatedProfileDraft,
  longValueProfile,
  longValueProfileDraft,
  emptyProfileDraft,
  populatedSavedCalculatorResults,
  longValueSavedCalculatorResults,
  type FixtureComponentName,
  type FixtureStateName
} from './syntheticData';

const VALID_COMPONENTS: FixtureComponentName[] = ['dashboard', 'accounts', 'transactions', 'goals', 'plans', 'reports', 'settings'];
const VALID_STATES: FixtureStateName[] = ['empty', 'populated', 'stale', 'loading', 'failure', 'long-value'];

export function FixtureApp() {
  // Read initial state from URL search params if present
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') return { component: 'dashboard' as FixtureComponentName, state: 'populated' as FixtureStateName, theme: 'light' };
    const params = new URLSearchParams(window.location.search);
    const compParam = params.get('component') as FixtureComponentName;
    const stateParam = params.get('state') as FixtureStateName;
    return {
      component: VALID_COMPONENTS.includes(compParam) ? compParam : 'dashboard',
      state: VALID_STATES.includes(stateParam) ? stateParam : 'populated',
      theme: params.get('theme') === 'dark' ? 'dark' : 'light'
    };
  }, []);

  const [selectedComponent, setSelectedComponent] = useState<FixtureComponentName>(initialParams.component);
  const [selectedState, setSelectedState] = useState<FixtureStateName>(initialParams.state);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(initialParams.theme === 'dark' ? 'dark' : 'light');
  const [actionLog, setActionLog] = useState<string>('Harness initialized with zero network access.');

  // Editable drafts for interactive panel exploration
  const [accountDraft, setAccountDraft] = useState<AccountDraft>({
    accountType: 'checking',
    balanceAmount: '5000',
    balanceDate: '2026-09-01',
    currency: 'USD',
    institutionName: 'Synthetic Regional Bank',
    name: 'New Checking Account'
  });
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, BalanceDraft>>({});
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({
    accountId: 'acc_chk_01',
    amount: '125.00',
    category: 'Groceries',
    description: 'Farmers Market Produce',
    notes: 'Weekly fresh groceries',
    transactionDate: '2026-09-01',
    transactionType: 'expense'
  });
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(defaultTransactionFilters);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    currentAmount: '1000',
    goalType: 'emergency_fund',
    name: 'New Emergency Buffer',
    targetAmount: '10000',
    targetDate: '2027-01-01'
  });
  const [goalUpdateDrafts, setGoalUpdateDrafts] = useState<Record<string, GoalUpdateDraft>>({});
  const [profileDraft, setProfileDraft] = useState<AccountProfileDraft>(populatedProfileDraft);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('');

  const logAction = useCallback((name: string, payload?: unknown) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    const logEntry = `[${timestamp}] Synthetic action: "${name}" handled in-memory. Zero network mutation.`;
    setActionLog(logEntry);
    console.log(`[FixtureAction] ${name}`, payload ?? '');
  }, []);

  // Sync state to URL, network guard, and theme attributes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    installFixtureNetworkGuard(logAction);
    setFixtureGuardState(selectedState, logAction);

    const url = new URL(window.location.href);
    url.searchParams.set('component', selectedComponent);
    url.searchParams.set('state', selectedState);
    url.searchParams.set('theme', colorMode);
    try {
      const search = url.searchParams.toString();
      window.history.replaceState({}, '', `${window.location.pathname}?${search}`);
    } catch {
      // replaceState may fail in restricted iframe or jsdom environments
    }

    document.documentElement.dataset.theme = colorMode;
    document.documentElement.dataset.mode = colorMode;
    document.documentElement.className = colorMode === 'dark' ? 'app theme-dark' : 'app theme-light';
  }, [selectedComponent, selectedState, colorMode, logAction]);

  // Compute active dataset based on selected state
  const accountsData = useMemo(() => {
    if (selectedState === 'empty') return [];
    if (selectedState === 'stale') return staleAccounts;
    if (selectedState === 'long-value') return longValueAccounts;
    return populatedAccounts;
  }, [selectedState]);

  const accountSummaryData = useMemo(() => {
    if (selectedState === 'empty') return emptyAccountSummary;
    if (selectedState === 'long-value') return longValueAccountSummary;
    return populatedAccountSummary;
  }, [selectedState]);

  const transactionsData = useMemo(() => {
    if (selectedState === 'empty') return [];
    if (selectedState === 'stale') return staleTransactions;
    if (selectedState === 'long-value') return longValueTransactions;
    return populatedTransactions;
  }, [selectedState]);

  const transactionSummaryData = useMemo(() => {
    if (selectedState === 'empty') return emptyTransactionSummary;
    if (selectedState === 'long-value') return longValueTransactionSummary;
    if (selectedState === 'stale') return staleTransactionSummary;
    return populatedTransactionSummary;
  }, [selectedState]);

  const cashflowData = useMemo(() => {
    if (selectedState === 'empty') return emptyCashflow;
    if (selectedState === 'long-value') return longValueCashflow;
    return populatedCashflow;
  }, [selectedState]);

  const goalsData = useMemo(() => {
    if (selectedState === 'empty') return [];
    if (selectedState === 'stale') return staleGoals;
    if (selectedState === 'long-value') return longValueGoals;
    return populatedGoals;
  }, [selectedState]);

  const goalSummaryData = useMemo(() => {
    if (selectedState === 'empty') return emptyGoalSummary;
    if (selectedState === 'long-value') return longValueGoalSummary;
    if (selectedState === 'stale') return staleGoalSummary;
    return populatedGoalSummary;
  }, [selectedState]);

  const plansData = useMemo(() => {
    if (selectedState === 'empty') return [];
    if (selectedState === 'long-value') return longValueSavedPlans;
    return populatedSavedPlans;
  }, [selectedState]);

  const insightsData = useMemo(() => {
    if (selectedState === 'empty') return [];
    if (selectedState === 'long-value') return longValueInsights;
    return populatedInsights;
  }, [selectedState]);

  const profileData = useMemo(() => {
    if (selectedState === 'empty') return null;
    if (selectedState === 'long-value') return longValueProfile;
    return populatedProfile;
  }, [selectedState]);

  const savedCalcResults = useMemo(() => {
    if (selectedState === 'empty') return [];
    if (selectedState === 'long-value') return longValueSavedCalculatorResults;
    return populatedSavedCalculatorResults;
  }, [selectedState]);

  const isLoading = selectedState === 'loading';
  const failureMessage = selectedState === 'failure'
    ? 'Synthetic Error: Connection to backend storage timed out (HTTP 503 Service Unavailable).'
    : '';

  return (
    <div
      className={`fixture-harness-root app ${colorMode === 'dark' ? 'theme-dark' : 'theme-light'}`}
      data-mode={colorMode}
      data-testid="fixture-harness-root"
      data-fixture-marker={SYNTHETIC_FIXTURE_MARKER}
    >
      {/* Top Fixture Navigation & Control Bar */}
      <header className="fixture-banner" role="region" aria-label="Synthetic Fixture Controls">
        <div className="fixture-banner-top">
          <div className="fixture-badge-group">
            <span className="fixture-pill fixture-pill-warning">SYNTHETIC FIXTURE HARNESS</span>
            <span className="fixture-pill fixture-pill-info">ISOLATED LOCAL TEST</span>
            <span className="fixture-pill fixture-pill-success">NETWORK MUTATIONS BLOCKED</span>
          </div>
          <div className="fixture-theme-toggle">
            <button
              type="button"
              className="fixture-btn"
              onClick={() => setColorMode((m) => (m === 'light' ? 'dark' : 'light'))}
              aria-label="Toggle Color Theme"
            >
              Theme: {colorMode === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        <div className="fixture-selectors-bar">
          <div className="fixture-selector-group">
            <span className="fixture-selector-label">Component:</span>
            {(['dashboard', 'accounts', 'transactions', 'goals', 'plans', 'reports', 'settings'] as FixtureComponentName[]).map(
              (name) => (
                <button
                  key={name}
                  type="button"
                  className={`fixture-btn ${selectedComponent === name ? 'fixture-btn-active' : ''}`}
                  onClick={() => setSelectedComponent(name)}
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </button>
              )
            )}
          </div>

          <div className="fixture-selector-group">
            <span className="fixture-selector-label">State:</span>
            {(['populated', 'empty', 'stale', 'loading', 'failure', 'long-value'] as FixtureStateName[]).map(
              (state) => (
                <button
                  key={state}
                  type="button"
                  className={`fixture-btn ${selectedState === state ? 'fixture-btn-active' : ''}`}
                  onClick={() => setSelectedState(state)}
                >
                  {state}
                </button>
              )
            )}
          </div>
        </div>

        <div className="fixture-status-bar">
          <span className="fixture-status-url">
            URL: <code>?component={selectedComponent}&state={selectedState}&theme={colorMode}</code>
          </span>
          <span className="fixture-status-log" role="status">
            {actionLog}
          </span>
        </div>
      </header>

      {/* Component Render Container */}
      <main className="fixture-render-surface" id="main-content">
        <div className="app app-shell" data-mode={colorMode} style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
          {selectedComponent === 'dashboard' && (
            <DashboardPanel
              accounts={accountsData}
              cashflow={cashflowData}
              goals={goalsData}
              insights={insightsData}
              isLoading={isLoading}
              isLoadingCalculatorResults={isLoading}
              isLoadingGoals={isLoading}
              calculatorResultMessage={failureMessage}
              message={failureMessage}
              goalMessage={failureMessage}
              goalSummary={goalSummaryData}
              savedCalculatorResults={savedCalcResults}
              summary={accountSummaryData}
              onNavigate={(route) => logAction('Navigate', { route })}
            />
          )}

          {selectedComponent === 'accounts' && (
            <AccountsPanel
              accounts={accountsData}
              auth={syntheticAuth}
              balanceDrafts={balanceDrafts}
              draft={accountDraft}
              isLoading={isLoading}
              isSaving={false}
              message={failureMessage}
              summary={accountSummaryData}
              onArchiveAccount={(id) => logAction('ArchiveAccount', { id })}
              onBalanceDraftChange={(id, field, value) => {
                setBalanceDrafts((prev) => ({
                  ...prev,
                  [id]: { amount: prev[id]?.amount || '', date: prev[id]?.date || '', [field]: value }
                }));
              }}
              onCreateAccount={() => logAction('CreateAccount', accountDraft)}
              onDraftChange={(field, value) => setAccountDraft((d) => ({ ...d, [field]: value }))}
              onImportComplete={async () => {
                logAction('ImportComplete');
              }}
              onRecordBalance={(id) => logAction('RecordBalance', { id, draft: balanceDrafts[id] })}
            />
          )}

          {selectedComponent === 'transactions' && (
            <TransactionsPanel
              accounts={accountsData}
              auth={syntheticAuth}
              allSummary={transactionSummaryData}
              categoryOptions={['Income', 'Housing', 'Groceries', 'Utilities', 'Dividends', 'Savings Transfer']}
              draft={transactionDraft}
              filters={transactionFilters}
              isLoading={isLoading}
              isSaving={false}
              message={failureMessage}
              summary={transactionSummaryData}
              transactions={transactionsData}
              updateDrafts={{}}
              onArchiveTransaction={(id) => logAction('ArchiveTransaction', { id })}
              onClearFilters={() => setTransactionFilters(defaultTransactionFilters)}
              onCreateTransaction={() => logAction('CreateTransaction', transactionDraft)}
              onDraftChange={(field, value) => setTransactionDraft((d) => ({ ...d, [field]: value }))}
              onFilterChange={(field, value) => setTransactionFilters((f: TransactionFilters) => ({ ...f, [field]: value }))}
              onImportComplete={async () => {
                logAction('TransactionImportComplete');
              }}
              onUpdateDraftChange={(id, field, value) => logAction('UpdateDraftChange', { id, field, value })}
              onUpdateTransaction={(id) => logAction('UpdateTransaction', { id })}
            />
          )}

          {selectedComponent === 'goals' && (
            <GoalsPanel
              draft={goalDraft}
              goals={goalsData}
              isLoading={isLoading}
              isSaving={false}
              message={failureMessage}
              summary={goalSummaryData}
              updateDrafts={goalUpdateDrafts}
              onArchiveGoal={(id) => logAction('ArchiveGoal', { id })}
              onCreateGoal={() => logAction('CreateGoal', goalDraft)}
              onDraftChange={(field, value) => setGoalDraft((d) => ({ ...d, [field]: value }))}
              onUpdateDraftChange={(id, field, value) => {
                setGoalUpdateDrafts((prev) => ({
                  ...prev,
                  [id]: { ...prev[id], [field]: value } as GoalUpdateDraft
                }));
              }}
              onUpdateGoal={(id) => logAction('UpdateGoal', { id, draft: goalUpdateDrafts[id] })}
            />
          )}

          {selectedComponent === 'plans' && (
            <PlanningWorkspace
              accounts={accountsData.map((a) => ({
                accountType: a.accountType,
                category: a.category,
                currency: a.currency,
                id: a.id,
                isActive: a.isActive,
                latestBalanceCents: a.latestBalanceCents,
                latestBalanceDate: a.latestBalanceDate,
                name: a.name
              }))}
              activePlanId={plansData[0]?.id ?? null}
              auth={syntheticAuth}
              canUndoSeed={false}
              currentPlan={plansData[0]?.snapshot?.plan ?? populatedSavedPlans[0].snapshot.plan}
              currentResult={plansData[0]?.result ?? populatedPlanResult}
              currentSnapshot={plansData[0]?.snapshot ?? populatedSavedPlans[0].snapshot}
              currentTimeline={plansData[0]?.snapshot?.timeline ?? populatedSavedPlans[0].snapshot.timeline}
              goals={goalsData.map((g) => ({
                currentAmountCents: g.currentAmountCents,
                goalType: g.goalType,
                id: g.id,
                name: g.name,
                status: g.status,
                targetAmountCents: g.targetAmountCents,
                targetDate: g.targetDate,
                updatedAt: g.updatedAt
              }))}
              isLoading={isLoading}
              isSaving={false}
              message={failureMessage}
              plans={plansData}
              profile={profileData}
              onApplySeed={(preview) => logAction('ApplySeed', preview)}
              onArchive={(id) => logAction('ArchivePlan', { id })}
              onLoadPlan={(plan) => logAction('LoadPlan', { id: plan.id })}
              onLoadVersion={(planId, version: PlanVersionDetail) => logAction('LoadVersion', { planId, version })}
              onNavigateCalculator={() => logAction('NavigateCalculator')}
              onSave={(mode, draft: PlanningSaveDraft) => logAction('SavePlan', { mode, draft })}
              onUndoSeed={() => logAction('UndoSeed')}
            />
          )}

          {selectedComponent === 'reports' && (
            <InsightsPanel
              insights={insightsData}
              onNavigate={(route) => logAction('NavigateInsight', { route })}
              scope={buildReportScope({
                accounts: accountsData,
                goals: goalsData as never,
                transactions: transactionsData as never,
                planLabel: selectedState === 'empty' ? null : 'Synthetic base plan · Version 2',
                today: '2026-09-26'
              })}
            />
          )}

          {selectedComponent === 'settings' && (
            <div className="settings-fixture-layout" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <ProfileSettingsPanel
                draft={selectedState === 'empty' ? emptyProfileDraft : selectedState === 'long-value' ? longValueProfileDraft : profileDraft}
                isLoading={isLoading}
                isSaving={false}
                message={failureMessage}
                profile={profileData}
                onChange={(field, value) => setProfileDraft((p) => ({ ...p, [field]: value }))}
                onSave={() => logAction('SaveProfile', profileDraft)}
              />
              <PrivacyControlsPanel
                deleteConfirmation={deleteConfirmation}
                isDeleting={false}
                isExporting={false}
                status={failureMessage ? { kind: 'error', text: failureMessage } : null}
                confirmationPhrase="DELETE MY FINPATH DATA"
                onDelete={() => logAction('DeleteAccountData')}
                onDeleteConfirmationChange={(val) => setDeleteConfirmation(val)}
                onExport={() => logAction('ExportAccountData')}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
export default FixtureApp;
