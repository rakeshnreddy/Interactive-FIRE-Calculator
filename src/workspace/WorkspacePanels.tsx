import { ChevronRight, FolderKanban, Save, SlidersHorizontal, Target, Trash2 } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import { ACCOUNT_DATA_DELETE_CONFIRMATION, type AccountDraft, type AccountProfile, type AccountProfileDraft, type AccountSummary, accountTypeLabel, accountTypeOptions, type BalanceDraft, emptyBalanceDraft, type FinancialAccount, formatAccountMetric, formatCurrencyBreakdown, formatGoalPercent, formatTransactionAmount, type Goal, goalDeadlineLabel, type GoalDraft, goalStatusLabel, goalStatusOptions, type GoalSummary, goalToUpdateDraft, goalTypeLabel, goalTypeOptions, type GoalUpdateDraft, isBalanceStale, type SavedCalculatorResult, type Transaction, transactionAmountClass, type TransactionDraft, type TransactionSummary, transactionToDraft, transactionTypeLabel, transactionTypeOptions } from '../lib/api';
import { Field } from '../components/Field';
import { PrivacyControlsPanel } from '../settings/PrivacyControlsPanel';
import { AnalyticsConsentPanel } from '../settings/AnalyticsConsentPanel';
import { track } from '../lib/analyticsClient';
import { ReportsPanel } from '../reports/ReportsPanel';
import { allTransactionAccountFilter, allTransactionCategoryFilter, type TransactionCashflowRollup, transactionCategoryLabel, type TransactionFilters, uncategorizedTransactionCategoryFilter, unlinkedTransactionAccountFilter } from '../lib/transactionAnalytics';
import { buildCalculatorFollowUp } from '../lib/calculatorFollowUps';
import { formatCents, formatMonthLabel, formatSavedCalculatorMetric, formatSignedCents } from '../lib/format';
import { platformPages, type PlatformRoute, priorityLabel, type SavedPlan, SignedInProfileBand } from '../App';
import { type AppRoute, buildPlanDeepLink } from '../lib/navigation';
import { type AuthState } from '../auth';
import { type DueReviewItem } from '../lib/planReviews';
import { type FinancialInsight } from '../lib/insights';
import { type PrivacyStatus } from '../settings/privacyOutcome';
import { type ReportScope } from '../reports/reportScope';

// Signed-in workspace panels (B38): loaded on demand so public visitors never download them.
const BalanceImportPanel = lazy(() =>
  import('../BalanceImportPanel').then((module) => ({ default: module.BalanceImportPanel }))
);
const TransactionImportPanel = lazy(() =>
  import('../TransactionImportPanel').then((module) => ({ default: module.TransactionImportPanel }))
);

export function ProfileSettingsPanel({
  draft,
  isLoading,
  isSaving,
  message,
  onChange,
  onSave,
  profile
}: {
  draft: AccountProfileDraft;
  isLoading: boolean;
  isSaving: boolean;
  message: string;
  onChange: (field: keyof AccountProfileDraft, value: string) => void;
  onSave: () => void;
  profile: AccountProfile | null;
}) {
  return (
    <section className="profile-editor" aria-labelledby="profile-settings-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Profile defaults</p>
          <h2 id="profile-settings-title">Household profile</h2>
        </div>
        {profile ? <span className="profile-updated">Updated {new Date(profile.updatedAt).toLocaleDateString()}</span> : null}
      </div>

      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="profile-form-grid">
          <Field label="Display name">
            <input
              disabled={isLoading || isSaving}
              maxLength={80}
              type="text"
              value={draft.displayName}
              onChange={(event) => onChange('displayName', event.target.value)}
            />
          </Field>
          <Field label="Household name">
            <input
              disabled={isLoading || isSaving}
              maxLength={120}
              type="text"
              value={draft.householdName}
              onChange={(event) => onChange('householdName', event.target.value)}
            />
          </Field>
          <Field label="Currency">
            <input
              disabled={isLoading || isSaving}
              maxLength={3}
              type="text"
              value={draft.defaultCurrency}
              onChange={(event) => onChange('defaultCurrency', event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Birth year">
            <input
              disabled={isLoading || isSaving}
              inputMode="numeric"
              max={2200}
              min={1900}
              type="number"
              value={draft.birthYear}
              onChange={(event) => onChange('birthYear', event.target.value)}
            />
          </Field>
          <Field label="Target retirement age">
            <input
              disabled={isLoading || isSaving}
              inputMode="numeric"
              max={100}
              min={18}
              type="number"
              value={draft.targetRetirementAge}
              onChange={(event) => onChange('targetRetirementAge', event.target.value)}
            />
          </Field>
        </div>

        <div className="profile-editor-actions">
          {message ? (
            <p className="profile-status" role="status" aria-live="polite">
              {message}
            </p>
          ) : null}
          <button className="primary-button icon-text-button" disabled={isLoading || isSaving} type="submit">
            <Save size={16} />
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}

export function DashboardPanel({
  accounts,
  calculatorResultMessage,
  cashflow,
  dueReviews,
  dueReviewsError,
  goals,
  insights,
  isLoading,
  isLoadingCalculatorResults,
  isLoadingDueReviews,
  isLoadingGoals,
  message,
  goalMessage,
  goalSummary,
  onNavigate,
  onRetryDueReviews,
  plans = [],
  savedCalculatorResults,
  summary
}: {
  accounts: FinancialAccount[];
  calculatorResultMessage: string;
  cashflow: TransactionCashflowRollup;
  dueReviews?: DueReviewItem[] | null;
  dueReviewsError?: string | null;
  goals: Goal[];
  insights: FinancialInsight[];
  isLoading: boolean;
  isLoadingCalculatorResults: boolean;
  isLoadingDueReviews?: boolean;
  isLoadingGoals: boolean;
  message: string;
  goalMessage: string;
  goalSummary: GoalSummary;
  onNavigate: (route: AppRoute | string) => void;
  onRetryDueReviews?: () => void;
  plans?: SavedPlan[];
  savedCalculatorResults: SavedCalculatorResult[];
  summary: AccountSummary;
}) {
  const recentAccounts = accounts
    .filter((account) => account.isActive !== false && !account.archivedAt)
    .slice(0, 5);
  const recentGoals = goals.slice(0, 3);
  const recentCalculatorResults = savedCalculatorResults.slice(0, 4);

  const dueReviewCards = useMemo(() => {
    if (dueReviews !== undefined) {
      if (!dueReviews) return [];
      return dueReviews.filter((r) => r.status === 'due' || r.status === 'overdue');
    }
    return plans
      .map((plan) => {
        const legacyDueStatus = (plan as any).dueStatus;
        if (legacyDueStatus && (legacyDueStatus.status === 'due' || legacyDueStatus.status === 'overdue')) {
          return {
            planId: plan.id,
            planName: plan.name,
            latestVersionNumber: plan.versionNumber ?? 1,
            status: legacyDueStatus.status,
            evidenceDate: legacyDueStatus.evidenceDate ?? '',
            nextReviewDue: legacyDueStatus.nextReviewDue ?? '',
            daysSinceBaseline: legacyDueStatus.daysSinceBaseline ?? 0,
            daysUntilEligible: legacyDueStatus.daysUntilEligible ?? 0
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [dueReviews, plans]);

  const plansWithDueStatus = useMemo(() => {
    return plans.map((plan) => {
      const match = dueReviews !== undefined
        ? (dueReviews?.find((dr) => dr.planId === plan.id) ?? null)
        : ((plan as any).dueStatus ?? null);
      return { plan, dueStatus: match };
    });
  }, [plans, dueReviews]);

  const duePlans = useMemo(() => {
    return plansWithDueStatus.filter(
      ({ dueStatus }) => dueStatus?.status === 'due' || dueStatus?.status === 'overdue'
    );
  }, [plansWithDueStatus]);

  return (
    <section className="financial-dashboard" aria-label="Financial dashboard">
      <div className="dashboard-summary-grid">
        <article className="tracker-metric tracker-metric-primary">
          <span>Net worth</span>
          <strong>{formatAccountMetric(summary.netWorthCents, summary)}</strong>
          {summary.hasMixedCurrencies ? (
            <small className="currency-breakdown">{formatCurrencyBreakdown(summary, 'netWorthCents')}</small>
          ) : (
            <small>{summary.accountCount} active accounts</small>
          )}
        </article>
        <article className="tracker-metric">
          <span>Assets</span>
          <strong>{formatAccountMetric(summary.assetsCents, summary)}</strong>
          {summary.hasMixedCurrencies ? (
            <small className="currency-breakdown">{formatCurrencyBreakdown(summary, 'assetsCents')}</small>
          ) : (
            <small>Cash, investments, property, and other assets</small>
          )}
        </article>
        <article className="tracker-metric">
          <span>Liabilities</span>
          <strong>{formatAccountMetric(summary.liabilitiesCents, summary)}</strong>
          {summary.hasMixedCurrencies ? (
            <small className="currency-breakdown">{formatCurrencyBreakdown(summary, 'liabilitiesCents')}</small>
          ) : (
            <small>{summary.liabilityAccountCount} debt accounts</small>
          )}
        </article>
        <article className="tracker-metric">
          <span>Goals funded</span>
          <strong>{formatGoalPercent(goalSummary.fundedPercent)}</strong>
          <small>{goalSummary.activeGoalCount} active goals</small>
        </article>
        <article className={cashflow.currentMonthNetCashFlowCents >= 0 ? 'tracker-metric' : 'tracker-metric tracker-metric-warning'}>
          <span>Monthly cash flow</span>
          <strong className={cashflow.currentMonthNetCashFlowCents >= 0 ? 'amount-positive' : 'amount-negative'}>
            {formatSignedCents(cashflow.currentMonthNetCashFlowCents)}
          </strong>
          <small>{formatMonthLabel(cashflow.currentMonth)} manual ledger</small>
        </article>
      </div>

      <section className="account-panel dashboard-insight-rollup" aria-labelledby="dashboard-insights-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Priority insights</p>
            <h2 id="dashboard-insights-title">What needs attention</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/reports')}>
            Reports
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="dashboard-insight-list">
          {insights.slice(0, 3).map((insight) => (
            <button
              className={`dashboard-insight-row insight-priority-${insight.priority}`}
              key={insight.id}
              onClick={() => onNavigate(insight.route)}
            >
              <span>{priorityLabel(insight.priority)}</span>
              <strong>{insight.title}</strong>
              <small>{insight.rationale}</small>
            </button>
          ))}
        </div>
      </section>

      {isLoadingDueReviews && dueReviews === null ? (
        <section className="account-panel dashboard-reviews-rollup" aria-labelledby="dashboard-reviews-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Monthly reviews</p>
              <h2 id="dashboard-reviews-title">Monthly reviews</h2>
            </div>
          </div>
          <p className="empty-inline">Checking review cadence...</p>
        </section>
      ) : dueReviewsError ? (
        <section className="account-panel dashboard-reviews-rollup" aria-labelledby="dashboard-reviews-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Monthly reviews</p>
              <h2 id="dashboard-reviews-title">Review status unavailable</h2>
            </div>
            {onRetryDueReviews ? (
              <button type="button" className="secondary-button" onClick={onRetryDueReviews}>
                Retry
              </button>
            ) : null}
          </div>
          <p className="error-banner">{dueReviewsError}</p>
        </section>
      ) : dueReviewCards.length > 0 ? (
        <section className="account-panel dashboard-reviews-rollup" aria-labelledby="dashboard-reviews-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Monthly reviews</p>
              <h2 id="dashboard-reviews-title">Reviews needing attention ({dueReviewCards.length})</h2>
            </div>
            <button className="secondary-button icon-text-button" onClick={() => onNavigate('/plans')}>
              Plans
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="dashboard-reviews-list">
            {dueReviewCards.map((review) => (
              <button
                className={`dashboard-review-card dashboard-review-card-${review.status}`}
                key={review.planId}
                type="button"
                onClick={() => {
                  track('review_due_opened', { source: 'in-app' });
                  onNavigate(buildPlanDeepLink(review.planId, review.latestVersionNumber));
                }}
              >
                <div className="dashboard-review-card-header">
                  <span className={`review-badge review-badge-${review.status}`}>
                    {review.status === 'overdue' ? 'Review Overdue' : 'Review Due'}
                  </span>
                  <span>Version {review.latestVersionNumber}</span>
                </div>
                <strong>{review.planName}</strong>
                <small>
                  {review.status === 'overdue'
                    ? `Review overdue since ${review.nextReviewDue}. Open plan to review dated evidence.`
                    : `Review due ${review.nextReviewDue}. Confirm or revise assumptions.`}
                </small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="account-panel dashboard-calculator-rollup" aria-labelledby="dashboard-calculators-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved calculator results</p>
            <h2 id="dashboard-calculators-title">Decisions to keep tracking</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/calculators')}>
            Calculators
            <ChevronRight size={16} />
          </button>
        </div>

        {isLoadingCalculatorResults ? (
          <p className="empty-inline">Loading saved calculator results...</p>
        ) : recentCalculatorResults.length === 0 && plans.length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No saved calculator results yet</span>
            <small>Run a public calculator, then save the result to connect it to this dashboard.</small>
          </article>
        ) : (
          <div className="dashboard-calculator-list">
            {plansWithDueStatus.map(({ plan, dueStatus }) => (
              <button
                className="dashboard-calculator-card dashboard-plan-card"
                key={plan.id}
                type="button"
                onClick={() => onNavigate(buildPlanDeepLink(plan.id, plan.versionNumber ?? 1))}
              >
                <div className="dashboard-plan-card-badges">
                  <span>Version {plan.versionNumber ?? 1}</span>
                  {dueStatus ? (
                    <span className={`review-badge review-badge-${dueStatus.status}`}>
                      {dueStatus.status === 'overdue'
                        ? 'Review Overdue'
                        : dueStatus.status === 'due'
                        ? 'Review Due'
                        : dueStatus.status === 'deferred'
                        ? 'Deferred'
                        : dueStatus.status === 'too-early'
                        ? 'Baseline'
                        : 'Up to Date'}
                    </span>
                  ) : null}
                </div>
                <strong>{plan.name}</strong>
                <small>
                  {plan.label ? `${plan.label} · ` : ''}Updated {new Date(plan.updatedAt ?? plan.createdAt).toLocaleDateString()}. Open saved decision.
                </small>
              </button>
            ))}
            {recentCalculatorResults.map((item) => {
              const followUp = buildCalculatorFollowUp(item);

              return (
                <button
                  className="dashboard-calculator-card"
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.conversionRoute === '/plans' && item.createdEntityId) {
                      onNavigate(buildPlanDeepLink(item.createdEntityId));
                    } else {
                      onNavigate(item.conversionRoute);
                    }
                  }}
                >
                  <span>{followUp.label}</span>
                  <strong>{item.calculatorTitle}</strong>
                  <small>
                    {formatSavedCalculatorMetric(item)} saved {new Date(item.createdAt).toLocaleDateString()}. {followUp.action}
                  </small>
                </button>
              );
            })}
          </div>
        )}

        {calculatorResultMessage ? <p className="empty-inline">{calculatorResultMessage}</p> : null}
      </section>

      <section className="account-panel dashboard-cashflow-rollup" aria-labelledby="dashboard-cashflow-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cash flow</p>
            <h2 id="dashboard-cashflow-title">Manual ledger this month</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/transactions')}>
            Transactions
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="dashboard-cashflow-grid" aria-label={`${formatMonthLabel(cashflow.currentMonth)} cash flow`}>
          <span>
            <small>Income</small>
            <strong>{formatCents(cashflow.currentMonthIncomeCents)}</strong>
          </span>
          <span>
            <small>Expenses</small>
            <strong>{formatCents(cashflow.currentMonthExpenseCents)}</strong>
          </span>
          <span>
            <small>Net</small>
            <strong className={cashflow.currentMonthNetCashFlowCents >= 0 ? 'amount-positive' : 'amount-negative'}>
              {formatSignedCents(cashflow.currentMonthNetCashFlowCents)}
            </strong>
          </span>
          <span>
            <small>Rows</small>
            <strong>{cashflow.currentMonthTransactionCount}</strong>
          </span>
        </div>

        {cashflow.totalTransactionCount === 0 ? (
          <article className="scenario-card empty-card">
            <span>No transaction rows yet</span>
            <small>Add manual income and expenses to unlock cash-flow rollups.</small>
          </article>
        ) : (
          <div className="dashboard-cashflow-columns">
            <div className="dashboard-category-list" aria-label="Top expense categories">
              <strong>Top categories</strong>
              {cashflow.topExpenseCategories.length === 0 ? (
                <small>No expense categories yet.</small>
              ) : (
                cashflow.topExpenseCategories.slice(0, 3).map((category) => (
                  <span key={category.category}>
                    <small>{category.category}</small>
                    <strong>{formatCents(category.amountCents)}</strong>
                  </span>
                ))
              )}
            </div>
            <div className="dashboard-recent-transactions" aria-label="Recent transactions">
              <strong>Recent rows</strong>
              {cashflow.recentTransactions.slice(0, 3).map((transaction) => (
                <button key={transaction.id} type="button" onClick={() => onNavigate('/transactions')}>
                  <span>
                    <strong>{transaction.description}</strong>
                    <small>{transaction.transactionDate} - {transactionCategoryLabel(transaction.category)}</small>
                  </span>
                  <em className={transaction.transactionType === 'expense' ? 'amount-negative' : transaction.transactionType === 'income' ? 'amount-positive' : 'amount-neutral'}>
                    {transaction.transactionType === 'expense' ? '-' : transaction.transactionType === 'income' ? '+' : ''}
                    {formatCents(transaction.amountCents)}
                  </em>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="account-panel dashboard-goal-rollup" aria-labelledby="dashboard-goals-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Goal rollup</p>
            <h2 id="dashboard-goals-title">Funding progress</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/goals')}>
            Goals
            <ChevronRight size={16} />
          </button>
        </div>

        {goalMessage ? <p className="account-status" role="status" aria-live="polite">{goalMessage}</p> : null}

        {isLoadingGoals ? (
          <article className="scenario-card empty-card">
            <span>Loading goals</span>
            <small>Checking saved funding progress.</small>
          </article>
        ) : recentGoals.length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No goals yet</span>
            <small>Add a goal to track funding progress and target dates.</small>
          </article>
        ) : (
          <div className="dashboard-goal-list">
            {recentGoals.map((goal) => (
              <article className="dashboard-goal-row" key={goal.id}>
                <div className="dashboard-goal-copy">
                  <strong>{goal.name}</strong>
                  <small className={goal.isOverdue ? 'goal-deadline goal-deadline-overdue' : 'goal-deadline'}>
                    {goalDeadlineLabel(goal)}
                  </small>
                </div>
                <div className="goal-progress-compact">
                  <span>{formatGoalPercent(goal.progressPercent)}</span>
                  <div
                    className="goal-progress-track"
                    role="progressbar"
                    aria-label={`${goal.name} funding progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, Math.max(0, goal.progressPercent))}
                  >
                    <span style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="account-panel" aria-labelledby="dashboard-accounts-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Balance rollup</p>
            <h2 id="dashboard-accounts-title">Latest account snapshot</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/accounts')}>
            Accounts
            <ChevronRight size={16} />
          </button>
        </div>

        {message ? <p className="account-status" role="status" aria-live="polite">{message}</p> : null}

        {isLoading ? (
          <article className="scenario-card empty-card">
            <span>Loading account data</span>
            <small>Checking saved balances.</small>
          </article>
        ) : recentAccounts.length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No account balances yet</span>
            <small>Add an account to turn the dashboard into a net-worth view.</small>
          </article>
        ) : (
          <div className="dashboard-account-list">
            {recentAccounts.map((account) => (
              <article className="dashboard-account-row" key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <small>
                    {accountTypeLabel(account.accountType)}
                    {account.latestBalanceDate ? ` · As of ${account.latestBalanceDate}` : ''}
                    {isBalanceStale(account.latestBalanceDate) ? (
                      <em className="account-stale-badge" title="Balance was recorded over 30 days ago or is missing">
                        Update due
                      </em>
                    ) : null}
                  </small>
                </div>
                <span className={account.category === 'liability' ? 'amount-negative' : 'amount-positive'}>
                  {account.category === 'liability' ? '-' : ''}
                  {formatCents(account.latestBalanceCents, account.currency)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export function TransactionsPanel({
  accounts,
  auth,
  allSummary,
  categoryOptions,
  draft,
  filters,
  isLoading,
  isSaving,
  message,
  onArchiveTransaction,
  onClearFilters,
  onCreateTransaction,
  onDraftChange,
  onFilterChange,
  onImportComplete,
  onUpdateDraftChange,
  onUpdateTransaction,
  summary,
  transactions,
  updateDrafts
}: {
  accounts: FinancialAccount[];
  auth: Extract<AuthState, { status: 'signed-in' }>;
  allSummary: TransactionSummary;
  categoryOptions: string[];
  draft: TransactionDraft;
  filters: TransactionFilters;
  isLoading: boolean;
  isSaving: boolean;
  message: string;
  onArchiveTransaction: (id: string) => void;
  onClearFilters: () => void;
  onCreateTransaction: () => void;
  onDraftChange: (field: keyof TransactionDraft, value: string) => void;
  onFilterChange: (field: keyof TransactionFilters, value: string) => void;
  onImportComplete: () => Promise<void>;
  onUpdateDraftChange: (id: string, field: keyof TransactionDraft, value: string) => void;
  onUpdateTransaction: (id: string) => void;
  summary: TransactionSummary;
  transactions: Transaction[];
  updateDrafts: Record<string, TransactionDraft>;
}) {
  const accountOptions = accounts.slice().sort((left, right) => left.name.localeCompare(right.name));
  const filtersAreActive =
    filters.accountId !== allTransactionAccountFilter ||
    filters.category !== allTransactionCategoryFilter ||
    filters.dateFrom.length > 0 ||
    filters.dateTo.length > 0 ||
    filters.query.trim().length > 0 ||
    filters.transactionType !== 'all';

  return (
    <section className="transaction-workspace" aria-labelledby="transactions-workspace-title">
      <div className="transaction-overview-strip">
        <article>
          <span>Visible net cash flow</span>
          <strong className={summary.netCashFlowCents >= 0 ? 'amount-positive' : 'amount-negative'}>
            {formatSignedCents(summary.netCashFlowCents)}
          </strong>
          <small>{summary.transactionCount} of {allSummary.transactionCount} manual rows</small>
        </article>
        <article>
          <span>Income</span>
          <strong>{formatCents(summary.incomeCents)}</strong>
          <small>Money in</small>
        </article>
        <article>
          <span>Expenses</span>
          <strong>{formatCents(summary.expenseCents)}</strong>
          <small>Money out</small>
        </article>
        <article>
          <span>Latest date</span>
          <strong>{summary.latestTransactionDate ?? 'None'}</strong>
          <small>{formatCents(summary.transferCents)} transfers tracked</small>
        </article>
      </div>

      <section className="transaction-create-panel" aria-labelledby="transactions-workspace-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Manual ledger</p>
            <h2 id="transactions-workspace-title">Add a transaction</h2>
          </div>
        </div>

        <form
          className="transaction-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateTransaction();
          }}
        >
          <Field label="Date">
            <input
              disabled={isSaving}
              required
              type="date"
              value={draft.transactionDate}
              onChange={(event) => onDraftChange('transactionDate', event.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              disabled={isSaving}
              value={draft.transactionType}
              onChange={(event) => onDraftChange('transactionType', event.target.value)}
            >
              {transactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              disabled={isSaving}
              maxLength={160}
              required
              type="text"
              value={draft.description}
              onChange={(event) => onDraftChange('description', event.target.value)}
            />
          </Field>
          <Field label="Amount">
            <input
              disabled={isSaving}
              inputMode="decimal"
              required
              type="text"
              value={draft.amount}
              onChange={(event) => onDraftChange('amount', event.target.value)}
            />
          </Field>
          <Field label="Account">
            <select
              disabled={isSaving}
              value={draft.accountId}
              onChange={(event) => onDraftChange('accountId', event.target.value)}
            >
              <option value="">No account link</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <input
              list="transaction-category-suggestions"
              disabled={isSaving}
              maxLength={80}
              type="text"
              value={draft.category}
              onChange={(event) => onDraftChange('category', event.target.value)}
            />
          </Field>
          <datalist id="transaction-category-suggestions">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <Field label="Notes">
            <input
              disabled={isSaving}
              maxLength={500}
              type="text"
              value={draft.notes}
              onChange={(event) => onDraftChange('notes', event.target.value)}
            />
          </Field>
          <button className="primary-button icon-text-button" disabled={isSaving} type="submit">
            <Save size={16} />
            Add transaction
          </button>
        </form>

        {message ? <p className="transaction-status-copy" role="status" aria-live="polite">{message}</p> : null}
      </section>

      <section className="transaction-filter-panel" aria-label="Filter transactions">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Ledger filters</p>
            <h2>Find transaction rows</h2>
          </div>
          <button className="secondary-button icon-text-button" disabled={!filtersAreActive} onClick={onClearFilters}>
            <SlidersHorizontal size={16} />
            Clear filters
          </button>
        </div>

        <div className="transaction-filter-grid">
          <Field label="Search">
            <input
              type="search"
              value={filters.query}
              onChange={(event) => onFilterChange('query', event.target.value)}
              placeholder="Description, note, account"
            />
          </Field>
          <Field label="Type">
            <select
              value={filters.transactionType}
              onChange={(event) => onFilterChange('transactionType', event.target.value)}
            >
              <option value="all">All types</option>
              {transactionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select value={filters.category} onChange={(event) => onFilterChange('category', event.target.value)}>
              <option value={allTransactionCategoryFilter}>All categories</option>
              <option value={uncategorizedTransactionCategoryFilter}>Uncategorized</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Account">
            <select value={filters.accountId} onChange={(event) => onFilterChange('accountId', event.target.value)}>
              <option value={allTransactionAccountFilter}>All accounts</option>
              <option value={unlinkedTransactionAccountFilter}>No account link</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => onFilterChange('dateFrom', event.target.value)}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => onFilterChange('dateTo', event.target.value)}
            />
          </Field>
        </div>
      </section>

      <Suspense fallback={<p className="transaction-status-copy">Loading transaction import tools...</p>}>
        <TransactionImportPanel accounts={accounts} auth={auth} onImportComplete={onImportComplete} />
      </Suspense>

      <section className="transaction-list-section" aria-label="Saved transactions">
        {isLoading ? (
          <article className="scenario-card empty-card">
            <span>Loading transactions</span>
            <small>Checking saved ledger rows.</small>
          </article>
        ) : allSummary.transactionCount === 0 ? (
          <article className="scenario-card empty-card">
            <span>No transactions yet</span>
            <small>Income, expenses, transfers, and adjustments will appear here.</small>
          </article>
        ) : transactions.length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No matching transactions</span>
            <small>Clear filters or broaden the date range to see saved rows.</small>
          </article>
        ) : (
          <div className="transaction-row-list">
            {transactions.map((transaction) => {
              const updateDraft = updateDrafts[transaction.id] ?? transactionToDraft(transaction);

              return (
                <article className="transaction-row-card" key={transaction.id}>
                  <div className="transaction-row-main">
                    <div className="transaction-row-copy">
                      <div className="transaction-badges">
                        <span className={`transaction-type-badge transaction-type-${transaction.transactionType}`}>
                          {transactionTypeLabel(transaction.transactionType)}
                        </span>
                        <span>{transactionCategoryLabel(transaction.category)}</span>
                      </div>
                      <strong>{transaction.description}</strong>
                      <small>
                        {transaction.transactionDate}
                        {transaction.account ? ` - ${transaction.account.name}` : ' - No account link'}
                      </small>
                    </div>
                    <div className="transaction-amount">
                      <span>{transaction.notes ?? 'Manual row'}</span>
                      <strong className={transactionAmountClass(transaction)}>
                        {formatTransactionAmount(transaction)}
                      </strong>
                    </div>
                  </div>

                  <form
                    className="transaction-update-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onUpdateTransaction(transaction.id);
                    }}
                  >
                    <Field label="Date">
                      <input
                        disabled={isSaving}
                        required
                        type="date"
                        value={updateDraft.transactionDate}
                        onChange={(event) => onUpdateDraftChange(transaction.id, 'transactionDate', event.target.value)}
                      />
                    </Field>
                    <Field label="Type">
                      <select
                        disabled={isSaving}
                        value={updateDraft.transactionType}
                        onChange={(event) => onUpdateDraftChange(transaction.id, 'transactionType', event.target.value)}
                      >
                        {transactionTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Description">
                      <input
                        disabled={isSaving}
                        maxLength={160}
                        required
                        type="text"
                        value={updateDraft.description}
                        onChange={(event) => onUpdateDraftChange(transaction.id, 'description', event.target.value)}
                      />
                    </Field>
                    <Field label="Amount">
                      <input
                        disabled={isSaving}
                        inputMode="decimal"
                        required
                        type="text"
                        value={updateDraft.amount}
                        onChange={(event) => onUpdateDraftChange(transaction.id, 'amount', event.target.value)}
                      />
                    </Field>
                    <Field label="Account">
                      <select
                        disabled={isSaving}
                        value={updateDraft.accountId}
                        onChange={(event) => onUpdateDraftChange(transaction.id, 'accountId', event.target.value)}
                      >
                        <option value="">No account link</option>
                        {accountOptions.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Category">
                      <input
                        list="transaction-category-suggestions"
                        disabled={isSaving}
                        maxLength={80}
                        type="text"
                        value={updateDraft.category}
                        onChange={(event) => onUpdateDraftChange(transaction.id, 'category', event.target.value)}
                      />
                    </Field>
                    <button className="secondary-button icon-text-button" disabled={isSaving} type="submit">
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      className="icon-button row-action"
                      disabled={isSaving}
                      type="button"
                      aria-label={`Remove ${transaction.description}`}
                      title={`Remove ${transaction.description}`}
                      onClick={() => onArchiveTransaction(transaction.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export function GoalsPanel({
  draft,
  goals,
  isLoading,
  isSaving,
  message,
  onArchiveGoal,
  onCreateGoal,
  onDraftChange,
  onUpdateDraftChange,
  onUpdateGoal,
  summary,
  updateDrafts,
  plans = [],
  onNavigate
}: {
  draft: GoalDraft;
  goals: Goal[];
  isLoading: boolean;
  isSaving: boolean;
  message: string;
  onArchiveGoal: (id: string) => void;
  onCreateGoal: () => void;
  onDraftChange: (field: keyof GoalDraft, value: string) => void;
  onUpdateDraftChange: (id: string, field: keyof GoalUpdateDraft, value: string) => void;
  onUpdateGoal: (id: string) => void;
  summary: GoalSummary;
  updateDrafts: Record<string, GoalUpdateDraft>;
  plans?: SavedPlan[];
  onNavigate?: (route: AppRoute | string) => void;
}) {
  return (
    <section className="goal-workspace" aria-labelledby="goals-workspace-title">
      <div className="goal-overview-strip">
        <article>
          <span>Overall funded</span>
          <strong>{formatGoalPercent(summary.fundedPercent)}</strong>
          <small>
            {formatCents(summary.totalCurrentCents)} of {formatCents(summary.totalTargetCents)}
          </small>
        </article>
        <article>
          <span>Active goals</span>
          <strong>{summary.activeGoalCount}</strong>
          <small>
            {summary.completedGoalCount} completed, {summary.pausedGoalCount} paused
          </small>
        </article>
        <article>
          <span>Nearest deadline</span>
          <strong>{summary.nextGoal?.name ?? 'None set'}</strong>
          <small className={summary.nextGoal?.isOverdue ? 'goal-deadline-overdue' : undefined}>
            {summary.nextGoal ? goalDeadlineLabel(summary.nextGoal) : 'Add a target date to plan ahead'}
          </small>
        </article>
      </div>

      <section className="goal-create-panel" aria-labelledby="goals-workspace-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">New milestone</p>
            <h2 id="goals-workspace-title">Add a goal</h2>
          </div>
        </div>

        <form
          className="goal-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateGoal();
          }}
        >
          <Field label="Goal name">
            <input
              disabled={isSaving}
              maxLength={120}
              required
              type="text"
              value={draft.name}
              onChange={(event) => onDraftChange('name', event.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              disabled={isSaving}
              value={draft.goalType}
              onChange={(event) => onDraftChange('goalType', event.target.value)}
            >
              {goalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target amount">
            <input
              disabled={isSaving}
              inputMode="decimal"
              required
              type="text"
              value={draft.targetAmount}
              onChange={(event) => onDraftChange('targetAmount', event.target.value)}
            />
          </Field>
          <Field label="Current amount">
            <input
              disabled={isSaving}
              inputMode="decimal"
              type="text"
              value={draft.currentAmount}
              onChange={(event) => onDraftChange('currentAmount', event.target.value)}
            />
          </Field>
          <Field label="Target date">
            <input
              disabled={isSaving}
              type="date"
              value={draft.targetDate}
              onChange={(event) => onDraftChange('targetDate', event.target.value)}
            />
          </Field>
          <button className="primary-button icon-text-button" disabled={isSaving} type="submit">
            <Target size={16} />
            Add goal
          </button>
        </form>

        {message ? <p className="goal-status-copy" role="status" aria-live="polite">{message}</p> : null}
      </section>

      <section className="goal-list-section" aria-label="Saved goals">
        {isLoading ? (
          <article className="scenario-card empty-card">
            <span>Loading goals</span>
            <small>Checking saved targets and progress.</small>
          </article>
        ) : goals.length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No goals yet</span>
            <small>Create a goal to begin tracking funding and deadlines.</small>
          </article>
        ) : (
          <div className="goal-card-list">
            {goals.map((goal) => {
              const updateDraft = updateDrafts[goal.id] ?? goalToUpdateDraft(goal);
              const progressValue = Math.min(100, Math.max(0, goal.progressPercent));
              const linkedPlan = plans.find((p) => p.goalId === goal.id);
              const nowMs = Date.now();
              const goalUpdatedMs = Date.parse(goal.updatedAt);
              const goalEvidenceAgeDays = isNaN(goalUpdatedMs)
                ? 0
                : Math.max(0, Math.floor((nowMs - goalUpdatedMs) / (24 * 60 * 60 * 1000)));
              const isGoalEvidenceStale = goalEvidenceAgeDays > 30;

              return (
                <article className="goal-card" key={goal.id}>
                  <div className="goal-card-heading">
                    <div className="goal-card-title">
                      <div className="goal-badges">
                        <span className="goal-type-badge">{goalTypeLabel(goal.goalType)}</span>
                        <span className={`goal-status-badge goal-status-${goal.status}`}>
                          {goalStatusLabel(goal.status)}
                        </span>
                        {goal.isOverdue && goal.status !== 'completed' ? (
                          <span className="goal-status-badge goal-status-overdue">OVERDUE</span>
                        ) : null}
                      </div>
                      <strong>{goal.name}</strong>
                      {linkedPlan ? (
                        <div className="goal-linked-plan">
                          <FolderKanban size={14} />
                          <span>Linked plan: <strong>{linkedPlan.name}</strong> (v{linkedPlan.versionNumber ?? 1})</span>
                          {onNavigate ? (
                            <button
                              type="button"
                              className="goal-link-button"
                              onClick={() => onNavigate(buildPlanDeepLink(linkedPlan.id, linkedPlan.versionNumber ?? 1))}
                            >
                              Open plan
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="goal-unlinked-note">Manual milestone (unlinked)</span>
                      )}
                      <span className="goal-evidence-date">
                        Goal updated: {goal.updatedAt.slice(0, 10)}
                      </span>
                      {isGoalEvidenceStale ? (
                        <div className="stale-evidence-box" role="alert">
                          <span className="stale-evidence-badge">
                            Goal inactive ({goalEvidenceAgeDays} days old)
                          </span>
                          <small className="stale-evidence-warning">
                            Goal details have not been updated in over 30 days. Review goal progress to keep targets current.
                          </small>
                        </div>
                      ) : null}
                    </div>
                    <div className="goal-amount-summary">
                      <span>Current / target</span>
                      <strong>
                        {formatCents(goal.currentAmountCents)} /{' '}
                        {goal.targetAmountCents === null ? 'No target' : formatCents(goal.targetAmountCents)}
                      </strong>
                      <div className="goal-funding-gap-row">
                        <span>Funding gap: </span>
                        <strong>
                          {goal.targetAmountCents === null
                            ? 'No target set'
                            : goal.remainingAmountCents <= 0
                            ? 'Goal funded'
                            : `${formatCents(goal.remainingAmountCents)} remaining`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="goal-progress-block">
                    {goal.targetAmountCents !== null && goal.targetAmountCents > 0 ? (
                      <>
                        <div>
                          <span>{formatGoalPercent(goal.progressPercent)} funded</span>
                          <small>{formatCents(goal.remainingAmountCents)} remaining</small>
                        </div>
                        <div
                          className="goal-progress-track"
                          role="progressbar"
                          aria-label={`${goal.name} funding progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progressValue}
                        >
                          <span style={{ width: `${progressValue}%` }} />
                        </div>
                      </>
                    ) : (
                      <div className="goal-no-progress">
                        <small>Set a target amount to track funding progress</small>
                      </div>
                    )}
                    <small className={goal.isOverdue ? 'goal-deadline goal-deadline-overdue' : 'goal-deadline'}>
                      {goalDeadlineLabel(goal)}
                      {goal.targetDate ? ` - ${goal.targetDate}` : ''}
                    </small>
                  </div>

                  <form
                    className="goal-update-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onUpdateGoal(goal.id);
                    }}
                  >
                    <Field label="Current amount">
                      <input
                        disabled={isSaving}
                        inputMode="decimal"
                        type="text"
                        value={updateDraft.currentAmount}
                        onChange={(event) => onUpdateDraftChange(goal.id, 'currentAmount', event.target.value)}
                      />
                    </Field>
                    <Field label="Target amount">
                      <input
                        disabled={isSaving}
                        inputMode="decimal"
                        required
                        type="text"
                        value={updateDraft.targetAmount}
                        onChange={(event) => onUpdateDraftChange(goal.id, 'targetAmount', event.target.value)}
                      />
                    </Field>
                    <Field label="Target date">
                      <input
                        disabled={isSaving}
                        type="date"
                        value={updateDraft.targetDate}
                        onChange={(event) => onUpdateDraftChange(goal.id, 'targetDate', event.target.value)}
                      />
                    </Field>
                    <Field label="Status">
                      <select
                        disabled={isSaving}
                        value={updateDraft.status}
                        onChange={(event) => onUpdateDraftChange(goal.id, 'status', event.target.value)}
                      >
                        {goalStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <button className="secondary-button icon-text-button" disabled={isSaving} type="submit">
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      className="icon-button row-action"
                      disabled={isSaving}
                      type="button"
                      aria-label={`Archive ${goal.name}`}
                      title={`Archive ${goal.name}`}
                      onClick={() => onArchiveGoal(goal.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

export function AccountsPanel({
  accounts,
  auth,
  balanceDrafts,
  draft,
  isLoading,
  isSaving,
  message,
  onArchiveAccount,
  onBalanceDraftChange,
  onCreateAccount,
  onDraftChange,
  onImportComplete,
  onRecordBalance,
  summary
}: {
  accounts: FinancialAccount[];
  auth: Extract<AuthState, { status: 'signed-in' }>;
  balanceDrafts: Record<string, BalanceDraft>;
  draft: AccountDraft;
  isLoading: boolean;
  isSaving: boolean;
  message: string;
  onArchiveAccount: (id: string) => void;
  onBalanceDraftChange: (id: string, field: keyof BalanceDraft, value: string) => void;
  onCreateAccount: () => void;
  onDraftChange: (field: keyof AccountDraft, value: string) => void;
  onImportComplete: () => Promise<void>;
  onRecordBalance: (id: string) => void;
  summary: AccountSummary;
}) {
  return (
    <section className="account-workspace" aria-labelledby="accounts-workspace-title">
      <div className="account-overview-strip">
        <article>
          <span>Net worth</span>
          <strong>{formatAccountMetric(summary.netWorthCents, summary)}</strong>
          {summary.hasMixedCurrencies ? (
            <small className="currency-breakdown">{formatCurrencyBreakdown(summary, 'netWorthCents')}</small>
          ) : null}
        </article>
        <article>
          <span>Assets</span>
          <strong>{formatAccountMetric(summary.assetsCents, summary)}</strong>
          {summary.hasMixedCurrencies ? (
            <small className="currency-breakdown">{formatCurrencyBreakdown(summary, 'assetsCents')}</small>
          ) : null}
        </article>
        <article>
          <span>Liabilities</span>
          <strong>{formatAccountMetric(summary.liabilitiesCents, summary)}</strong>
          {summary.hasMixedCurrencies ? (
            <small className="currency-breakdown">{formatCurrencyBreakdown(summary, 'liabilitiesCents')}</small>
          ) : null}
        </article>
      </div>

      <section className="account-panel" aria-labelledby="accounts-workspace-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Manual tracker</p>
            <h2 id="accounts-workspace-title">Accounts and balances</h2>
          </div>
        </div>

        <form
          className="account-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateAccount();
          }}
        >
          <Field label="Account name">
            <input
              disabled={isSaving}
              maxLength={120}
              type="text"
              value={draft.name}
              onChange={(event) => onDraftChange('name', event.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              disabled={isSaving}
              value={draft.accountType}
              onChange={(event) => onDraftChange('accountType', event.target.value)}
            >
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Institution">
            <input
              disabled={isSaving}
              maxLength={120}
              type="text"
              value={draft.institutionName}
              onChange={(event) => onDraftChange('institutionName', event.target.value)}
            />
          </Field>
          <Field label="Currency">
            <input
              disabled={isSaving}
              maxLength={3}
              type="text"
              value={draft.currency}
              onChange={(event) => onDraftChange('currency', event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Balance / debt">
            <input
              disabled={isSaving}
              inputMode="decimal"
              type="text"
              value={draft.balanceAmount}
              onChange={(event) => onDraftChange('balanceAmount', event.target.value)}
            />
          </Field>
          <Field label="Balance date">
            <input
              disabled={isSaving}
              type="date"
              value={draft.balanceDate}
              onChange={(event) => onDraftChange('balanceDate', event.target.value)}
            />
          </Field>
          <button className="primary-button icon-text-button" disabled={isSaving} type="submit">
            <Save size={16} />
            Add account
          </button>
        </form>

        {message ? <p className="account-status" role="status" aria-live="polite">{message}</p> : null}
      </section>

      <Suspense fallback={<section className="account-panel"><p className="empty-inline">Loading CSV import...</p></section>}>
        <BalanceImportPanel accounts={accounts} auth={auth} onImportComplete={onImportComplete} />
      </Suspense>

      <section className="account-panel" aria-label="Saved accounts">
        {isLoading ? (
          <article className="scenario-card empty-card">
            <span>Loading accounts</span>
            <small>Checking saved account balances.</small>
          </article>
        ) : accounts.filter((a) => a.isActive !== false && !a.archivedAt).length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No accounts yet</span>
            <small>Assets and debt balances will appear here.</small>
          </article>
        ) : (
          <div className="account-card-list">
            {accounts
              .filter((a) => a.isActive !== false && !a.archivedAt)
              .map((account) => {
              const balanceDraft = balanceDrafts[account.id] ?? emptyBalanceDraft();

              return (
                <article className="account-card" key={account.id}>
                  <div className="account-card-main">
                    <div>
                      <span className={`account-category account-category-${account.category}`}>
                        {account.category}
                      </span>
                      <strong>{account.name}</strong>
                      <small>
                        {accountTypeLabel(account.accountType)}
                        {account.institutionName ? ` - ${account.institutionName}` : ''}
                      </small>
                    </div>
                    <div className="account-balance">
                      <span className={isBalanceStale(account.latestBalanceDate) ? 'balance-date-stale' : 'balance-date-fresh'}>
                        {account.latestBalanceDate ? `As of ${account.latestBalanceDate}` : 'No balance date'}
                        {isBalanceStale(account.latestBalanceDate) ? (
                          <em className="account-stale-badge" title="Balance was recorded over 30 days ago or is missing">
                            Update due
                          </em>
                        ) : null}
                      </span>
                      <strong>{formatCents(account.latestBalanceCents, account.currency)}</strong>
                    </div>
                  </div>

                  <form
                    className="balance-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onRecordBalance(account.id);
                    }}
                  >
                    <Field label="New balance">
                      <input
                        disabled={isSaving}
                        inputMode="decimal"
                        type="text"
                        value={balanceDraft.amount}
                        onChange={(event) => onBalanceDraftChange(account.id, 'amount', event.target.value)}
                      />
                    </Field>
                    <Field label="Date">
                      <input
                        disabled={isSaving}
                        type="date"
                        value={balanceDraft.date}
                        onChange={(event) => onBalanceDraftChange(account.id, 'date', event.target.value)}
                      />
                    </Field>
                    <button className="secondary-button icon-text-button" disabled={isSaving} type="submit">
                      <Save size={16} />
                      Record
                    </button>
                    <button
                      className="icon-button row-action"
                      disabled={isSaving}
                      type="button"
                      aria-label={`Archive ${account.name}`}
                      onClick={() => onArchiveAccount(account.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>

                  {account.balanceHistory.length > 0 ? (
                    <div className="balance-history" aria-label={`${account.name} balance history`}>
                      {account.balanceHistory.slice(0, 4).map((balance) => (
                        <span key={balance.id}>
                          {balance.balanceDate}
                          <strong>{formatCents(balance.balanceCents, account.currency)}</strong>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}


export function PlatformPage({
  accountDraft,
  accountMessage,
  accountSummary,
  transactionDraft,
  transactionCashflow,
  calculatorResultMessage,
  transactionCategoryOptions,
  transactionFilters,
  transactionMessage,
  transactionSummary,
  visibleTransactionSummary,
  transactions,
  transactionUpdateDrafts,
  balanceDrafts,
  auth,
  dueReviews,
  dueReviewsError,
  financialAccounts,
  financialInsights,
  reportScope,
  goalDraft,
  isLoadingDueReviews,
  onRetryDueReviews,
  goalMessage,
  goals,
  goalSummary,
  goalUpdateDrafts,
  isLoadingProfile,
  isLoadingAccounts,
  isLoadingCalculatorResults,
  isLoadingTransactions,
  isLoadingGoals,
  isSavingAccount,
  isSavingTransaction,
  isSavingGoal,
  isSavingProfile,
  onAccountDraftChange,
  onArchiveAccount,
  onArchiveTransaction,
  onBalanceDraftChange,
  onCreateAccount,
  onCreateTransaction,
  onCreateGoal,
  onGoalDraftChange,
  onGoalUpdateDraftChange,
  onImportComplete,
  onProfileDraftChange,
  onProfileSave,
  onAccountDataDelete,
  onAccountDataExport,
  onRecordBalance,
  onArchiveGoal,
  onTransactionDraftChange,
  onTransactionFilterChange,
  onTransactionFiltersClear,
  onTransactionImportComplete,
  onTransactionUpdateDraftChange,
  onUpdateTransaction,
  onUpdateGoal,
  plans = [],
  route,
  savedCalculatorResults,
  onNavigate,
  profile,
  profileDraft,
  profileMessage,
  accountDataDeleteConfirmation,
  accountDataPrivacyMessage,
  isDeletingAccountData,
  isExportingAccountData,
  onAccountDataDeleteConfirmationChange,
  analyticsConsent,
  isSavingAnalyticsConsent,
  analyticsConsentMessage,
  onAnalyticsConsentChange
}: {
  analyticsConsent: boolean | null;
  isSavingAnalyticsConsent: boolean;
  analyticsConsentMessage: string;
  onAnalyticsConsentChange: (granted: boolean) => void;
  accountDraft: AccountDraft;
  accountMessage: string;
  accountSummary: AccountSummary;
  transactionDraft: TransactionDraft;
  transactionCashflow: TransactionCashflowRollup;
  calculatorResultMessage: string;
  transactionCategoryOptions: string[];
  transactionFilters: TransactionFilters;
  transactionMessage: string;
  transactionSummary: TransactionSummary;
  visibleTransactionSummary: TransactionSummary;
  transactions: Transaction[];
  transactionUpdateDrafts: Record<string, TransactionDraft>;
  balanceDrafts: Record<string, BalanceDraft>;
  auth: Extract<AuthState, { status: 'signed-in' }>;
  financialAccounts: FinancialAccount[];
  financialInsights: FinancialInsight[];
  reportScope?: ReportScope;
  goalDraft: GoalDraft;
  goalMessage: string;
  goals: Goal[];
  goalSummary: GoalSummary;
  goalUpdateDrafts: Record<string, GoalUpdateDraft>;
  isLoadingAccounts: boolean;
  isLoadingCalculatorResults: boolean;
  isLoadingTransactions: boolean;
  isLoadingGoals: boolean;
  isLoadingProfile: boolean;
  isSavingAccount: boolean;
  isSavingTransaction: boolean;
  isSavingGoal: boolean;
  isSavingProfile: boolean;
  onAccountDraftChange: (field: keyof AccountDraft, value: string) => void;
  onArchiveAccount: (id: string) => void;
  onArchiveTransaction: (id: string) => void;
  onBalanceDraftChange: (id: string, field: keyof BalanceDraft, value: string) => void;
  onCreateAccount: () => void;
  onCreateTransaction: () => void;
  onCreateGoal: () => void;
  onGoalDraftChange: (field: keyof GoalDraft, value: string) => void;
  onGoalUpdateDraftChange: (id: string, field: keyof GoalUpdateDraft, value: string) => void;
  onImportComplete: () => Promise<void>;
  onProfileDraftChange: (field: keyof AccountProfileDraft, value: string) => void;
  onProfileSave: () => void;
  onAccountDataDelete: () => void;
  onAccountDataExport: () => void;
  onRecordBalance: (id: string) => void;
  onArchiveGoal: (id: string) => void;
  onTransactionDraftChange: (field: keyof TransactionDraft, value: string) => void;
  onTransactionFilterChange: (field: keyof TransactionFilters, value: string) => void;
  onTransactionFiltersClear: () => void;
  onTransactionImportComplete: () => Promise<void>;
  onTransactionUpdateDraftChange: (id: string, field: keyof TransactionDraft, value: string) => void;
  onUpdateTransaction: (id: string) => void;
  onUpdateGoal: (id: string) => void;
  dueReviews?: DueReviewItem[] | null;
  dueReviewsError?: string | null;
  isLoadingDueReviews?: boolean;
  onRetryDueReviews?: () => void;
  plans?: SavedPlan[];
  route: PlatformRoute;
  savedCalculatorResults: SavedCalculatorResult[];
  onNavigate: (route: AppRoute | string) => void;
  profile: AccountProfile | null;
  profileDraft: AccountProfileDraft;
  profileMessage: string;
  accountDataDeleteConfirmation: string;
  accountDataPrivacyMessage: PrivacyStatus | null;
  isDeletingAccountData: boolean;
  isExportingAccountData: boolean;
  onAccountDataDeleteConfirmationChange: (value: string) => void;
}) {
  const page = platformPages[route];
  const Icon = page.icon;

  return (
    <section className="route-shell" aria-labelledby={`${route.slice(1)}-title`}>
      <div className="route-heading">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1 id={`${route.slice(1)}-title`}>{page.title}</h1>
        <p>{page.description}</p>
      </div>

      <SignedInProfileBand auth={auth} />

      {route === '/dashboard' ? (
        <DashboardPanel
          accounts={financialAccounts}
          cashflow={transactionCashflow}
          dueReviews={dueReviews}
          dueReviewsError={dueReviewsError}
          goals={goals}
          insights={financialInsights}
          isLoading={isLoadingAccounts}
          isLoadingCalculatorResults={isLoadingCalculatorResults}
          isLoadingDueReviews={isLoadingDueReviews}
          isLoadingGoals={isLoadingGoals}
          calculatorResultMessage={calculatorResultMessage}
          message={accountMessage}
          goalMessage={goalMessage}
          goalSummary={goalSummary}
          onRetryDueReviews={onRetryDueReviews}
          plans={plans}
          savedCalculatorResults={savedCalculatorResults}
          summary={accountSummary}
          onNavigate={onNavigate}
        />
      ) : null}

      {route === '/accounts' ? (
        <AccountsPanel
          accounts={financialAccounts}
          auth={auth}
          balanceDrafts={balanceDrafts}
          draft={accountDraft}
          isLoading={isLoadingAccounts}
          isSaving={isSavingAccount}
          message={accountMessage}
          summary={accountSummary}
          onArchiveAccount={onArchiveAccount}
          onBalanceDraftChange={onBalanceDraftChange}
          onCreateAccount={onCreateAccount}
          onDraftChange={onAccountDraftChange}
          onImportComplete={onImportComplete}
          onRecordBalance={onRecordBalance}
        />
      ) : null}

      {route === '/transactions' ? (
        <TransactionsPanel
          accounts={financialAccounts}
          auth={auth}
          allSummary={transactionSummary}
          categoryOptions={transactionCategoryOptions}
          draft={transactionDraft}
          filters={transactionFilters}
          isLoading={isLoadingTransactions}
          isSaving={isSavingTransaction}
          message={transactionMessage}
          summary={visibleTransactionSummary}
          transactions={transactions}
          updateDrafts={transactionUpdateDrafts}
          onArchiveTransaction={onArchiveTransaction}
          onClearFilters={onTransactionFiltersClear}
          onCreateTransaction={onCreateTransaction}
          onDraftChange={onTransactionDraftChange}
          onFilterChange={onTransactionFilterChange}
          onImportComplete={onTransactionImportComplete}
          onUpdateDraftChange={onTransactionUpdateDraftChange}
          onUpdateTransaction={onUpdateTransaction}
        />
      ) : null}

      {route === '/goals' ? (
        <GoalsPanel
          draft={goalDraft}
          goals={goals}
          isLoading={isLoadingGoals}
          isSaving={isSavingGoal}
          message={goalMessage}
          summary={goalSummary}
          updateDrafts={goalUpdateDrafts}
          onArchiveGoal={onArchiveGoal}
          onCreateGoal={onCreateGoal}
          onDraftChange={onGoalDraftChange}
          onUpdateDraftChange={onGoalUpdateDraftChange}
          onUpdateGoal={onUpdateGoal}
          plans={plans}
          onNavigate={onNavigate}
        />
      ) : null}

      {route === '/settings' ? (
        <>
          <ProfileSettingsPanel
            draft={profileDraft}
            isLoading={isLoadingProfile}
            isSaving={isSavingProfile}
            message={profileMessage}
            profile={profile}
            onChange={onProfileDraftChange}
            onSave={onProfileSave}
          />
          <AnalyticsConsentPanel
            granted={analyticsConsent}
            isSaving={isSavingAnalyticsConsent}
            message={analyticsConsentMessage}
            onChange={onAnalyticsConsentChange}
          />
          <PrivacyControlsPanel
            deleteConfirmation={accountDataDeleteConfirmation}
            isDeleting={isDeletingAccountData}
            isExporting={isExportingAccountData}
            status={accountDataPrivacyMessage}
            confirmationPhrase={ACCOUNT_DATA_DELETE_CONFIRMATION}
            onDelete={onAccountDataDelete}
            onDeleteConfirmationChange={onAccountDataDeleteConfirmationChange}
            onExport={onAccountDataExport}
          />
        </>
      ) : null}

      {route === '/reports' ? (
        <ReportsPanel insights={financialInsights} onNavigate={onNavigate} scope={reportScope} isLoading={isLoadingAccounts || isLoadingTransactions || isLoadingGoals} />
      ) : null}

      {route === '/dashboard' || route === '/accounts' || route === '/transactions' || route === '/goals' || route === '/reports' || route === '/settings' ? null : (
        <div className="placeholder-grid">
          {page.cards.map((card) => (
            <article className="scenario-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </article>
          ))}
        </div>
      )}

      <section className="next-module-band" aria-label={`${page.eyebrow} next action`}>
        <span className="feature-icon">
          <Icon size={20} />
        </span>
        <div>
          <strong>
            {route === '/goals'
              ? 'Goal tracking is active.'
              : route === '/transactions'
                ? 'Transaction tracking is active.'
              : route === '/reports'
                ? 'Insights are active.'
              : route === '/accounts'
                ? 'Accounts and balances are active.'
              : route === '/dashboard'
                ? 'Dashboard overview is active.'
              : `${page.eyebrow} is active.`}
          </strong>
          {' '}
          <small>
            {route === '/dashboard'
              ? 'Account balances and goal progress now power the signed-in tracker.'
              : route === '/accounts'
                ? 'Manual and reviewed CSV balances feed net worth while goals track the next milestone.'
                : route === '/transactions'
                  ? 'Manual ledger rows stay separate from balance imports while the transaction model settles.'
                : route === '/goals'
                  ? 'Funding updates and target dates roll directly into the dashboard.'
                  : route === '/reports'
                    ? 'Rule-based insights now cite plan health, dated balances, and goal timing.'
                  : 'Use public calculators first, then sign in when you want to keep the result connected to your plan.'}
          </small>
        </div>
        <button
          className="secondary-button icon-text-button"
          onClick={() => onNavigate(route === '/dashboard' ? '/accounts' : route === '/transactions' ? '/accounts' : route === '/goals' ? '/dashboard' : route === '/reports' ? '/plans' : '/calculators')}
        >
          {route === '/dashboard' ? 'Accounts' : route === '/transactions' ? 'Accounts' : route === '/goals' ? 'Dashboard' : route === '/reports' ? 'Plans' : 'Calculators'}
          <ChevronRight size={16} />
        </button>
      </section>
    </section>
  );
}
