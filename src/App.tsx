import { AccountUserButton, SignInIntent, SignOutControl, SignUpIntent } from './authRuntime';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CircleGauge,
  ClipboardList,
  Download,
  FolderKanban,
  Info,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  LineChart as LineChartIcon,
  Lightbulb,
  Menu,
  Moon,
  PiggyBank,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserCircle,
  X
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type {
  CalculatorSaveOutcome,
  CalculatorSaveRequest
} from './CalculatorLibrary';
import { HeroFireExample } from './HeroFireExample';
import { CalculatorSaveCoordinator } from './lib/calculatorSaveManager';
import type {
  PlanVersionDetail,
  PlanningSaveDraft,
  PlanningSavedPlan,
  PlanningSnapshot
} from './PlanningWorkspace';
import {
  annualSimulation,
  calculateFirePlan,
  formatMoney,
  formatPercent,
  totalDuration,
  type FirePlanResult,
  type PlanInput,
  type PlanWarningCode,
  type RatePeriod,
  type RecurringCashFlow,
  type SimulationResult,
  type WithdrawalTiming,
  type YearResult
} from './lib/fire';
import { buildCalculatorFollowUp } from './lib/calculatorFollowUps';
import {
  buildFinancialInsights,
  type FinancialInsight,
  type InsightPriority
} from './lib/insights';
import { undoPlanSeed, type PlanSeedPreview, type SeedApplication } from './lib/planWorkspace';
import { applyRouteMetadata } from './lib/routeMetadata';
import {
  allTransactionAccountFilter,
  allTransactionCategoryFilter,
  buildTransactionCashflowRollup,
  emptyTransactionFilters,
  filterTransactions,
  getTransactionCategoryOptions,
  normalizeTransactionCategoryInput,
  transactionCategoryLabel,
  uncategorizedTransactionCategoryFilter,
  unlinkedTransactionAccountFilter,
  type TransactionCashflowRollup,
  type TransactionFilters,
  type TransactionType
} from './lib/transactionAnalytics';
import { findSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { estimateRetirementAge, fitRatePeriods, projectPortfolioAtAge, type AccumulationResult } from './lib/fireAccumulation';
import { validateFireForm } from './lib/fireValidation';
import { configureAnalytics, flushAnalytics, track } from './lib/analyticsClient';
import { formatCompactMoney } from './lib/money';
import { HERO_FIRE_FIXTURE } from './lib/heroExample';
import { FireRetirementEstimate } from './components/FireRetirementEstimate';
import { ReportsPanel } from './reports/ReportsPanel';
import { PrivacyControlsPanel } from './settings/PrivacyControlsPanel';
import { deletionFailure, exportFailure, summarizeDeletion, type PrivacyStatus } from './settings/privacyOutcome';
export { PrivacyControlsPanel };
import { buildReportScope, type ReportScope } from './reports/reportScope';
export { ReportsPanel as InsightsPanel };
import {
  activeNavigationPath,
  buildPlanDeepLink,
  parsePlanDeepLink,
  resolvePlansRouteAction,
  primaryNavigationFor,
  shouldHandleNavigationClick,
  workspaceNavigation,
  type AppRoute
} from './lib/navigation';
import type { AuthState } from './auth';
import { calculatePlanReviewDueStatus, loadDuePlanReviews, type DueReviewItem } from './lib/planReviews';
import {
  ACCOUNT_DATA_DELETE_CONFIRMATION,
  accountTypeLabel,
  accountTypeOptions,
  addFinancialAccountBalanceRecord,
  archiveFinancialAccountRecord,
  archiveGoalRecord,
  archiveTransactionRecord,
  authenticatedJsonRequest,
  buildBalanceDraftMap,
  buildGoalUpdateDraftMap,
  buildTransactionDraftMap,
  calculatorDestinationLabel,
  calculatorSaveMessage,
  clearLocalDrafts,
  createAccountPlan,
  createCalculatorResultRecord,
  createFinancialAccountRecord,
  createGoalRecord,
  createTransactionRecord,
  deleteAccountDataRecord,
  deleteAccountPlan,
  draftToProfileUpdate,
  emptyAccountDraft,
  emptyBalanceDraft,
  emptyGoalDraft,
  emptyProfileDraft,
  emptyTransactionDraft,
  emptyTransactionSummary,
  formatAccountMetric,
  formatCurrencyBreakdown,
  formatGoalPercent,
  formatTransactionAmount,
  goalDeadlineLabel,
  goalStatusLabel,
  goalStatusOptions,
  goalToUpdateDraft,
  goalTypeLabel,
  goalTypeOptions,
  isAccountCategory,
  isAppSnapshot,
  isBalanceStale,
  isCalculatorConversionRoute,
  isFinancialAccountType,
  isGoalStatus,
  isGoalType,
  isNumberRecord,
  isRecord,
  isSavedCalculatorCreatedEntityType,
  isSavedCalculatorDestinationType,
  isSavedMetricValueType,
  isTransactionType,
  loadAccountDataExport,
  loadAccountPlans,
  loadAccountProfile,
  loadFinancialAccounts,
  loadGoals,
  loadSavedCalculatorResults,
  loadTransactions,
  pickString,
  PlanRequestError,
  planErrorMessage,
  profileToDraft,
  readFinancialAccountResponse,
  readGoalResponse,
  readProfileResponse,
  readSavedPlanResponse,
  readSavedPlans,
  readTransactionResponse,
  SAVED_PLANS_KEY,
  summarizeAccountList,
  summarizeGoalList,
  summarizeTransactionList,
  toAccountBalance,
  toAccountProfile,
  toAccountSummary,
  toCalculatorCreatedEntity,
  toFinancialAccount,
  toGoal,
  toGoalSummary,
  toSavedCalculatorMetric,
  toSavedCalculatorResult,
  toSavedCalculatorResultSnapshot,
  toSavedPlan,
  toTransaction,
  toTransactionAccount,
  toTransactionSummary,
  transactionAmountClass,
  transactionToDraft,
  transactionTypeLabel,
  transactionTypeOptions,
  updateAccountPlan,
  updateAccountProfile,
  updateGoalRecord,
  updateTransactionRecord,
  writeSavedPlans,
  type AccountCategory,
  type AccountDraft,
  type AccountProfile,
  type AccountProfileDraft,
  type AccountProfileUpdate,
  type AccountSummary,
  type BalanceDraft,
  type CalculatorSaveApiResponse,
  type CurrencyAccountSummary,
  type FinancialAccount,
  type FinancialAccountType,
  type Goal,
  type GoalDraft,
  type GoalStatus,
  type GoalSummary,
  type GoalType,
  type GoalUpdateDraft,
  type SavedCalculatorCreatedEntityType,
  type SavedCalculatorDestinationType,
  type SavedCalculatorMetric,
  type SavedCalculatorResult,
  type SavedCalculatorResultSnapshot,
  type Transaction,
  type TransactionDraft,
  type TransactionSummary
} from './lib/api';
import {
  formatCents,
  formatMonthLabel,
  formatSavedCalculatorMetric,
  formatSignedCents,
  formatSignedPercent,
  formatStoredCurrency,
  moneyInputToCents,
  numericValue,
  todayInputDate
} from './lib/format';
import {
  buildProjectionCsv,
  downloadCsv,
  downloadJson,
  escapeCsvCell
} from './lib/csv';
import {
  averageRate,
  engineWarnings,
  ENGINE_WARNING_TITLES,
  firstNegativeYear,
  humanizeWarningTitle,
  normalizeWarning,
  planWarnings,
  shouldSuppressHorizonDepletion,
  stressTestCurrentPortfolio,
  type WarningNotice
} from './lib/warnings';
import { Metric } from './components/Metric';
import { InfoTip } from './components/InfoTip';
import { Field, fieldSlugify } from './components/Field';
import { YearByYearTable } from './components/YearByYearTable';

const BalanceImportPanel = lazy(() =>
  import('./BalanceImportPanel').then((module) => ({ default: module.BalanceImportPanel }))
);
const TransactionImportPanel = lazy(() =>
  import('./TransactionImportPanel').then((module) => ({ default: module.TransactionImportPanel }))
);
const PlatformPage = lazy(() =>
  import('./workspace/WorkspacePanels').then((module) => ({ default: module.PlatformPage }))
);
const CalculatorLibrary = lazy(() =>
  import('./CalculatorLibrary').then((module) => ({ default: module.CalculatorLibrary }))
);
const PlanningWorkspace = lazy(() =>
  import('./PlanningWorkspace').then((module) => ({ default: module.PlanningWorkspace }))
);
const ProjectionChart = lazy(() =>
  import('./ProjectionChart').then((module) => ({ default: module.ProjectionChart }))
);

type Mode = 'light' | 'dark';
export type PlatformRoute = Exclude<AppRoute, '/' | '/calculators' | `/calculators/${string}`>;
type CalculatorPanel = 'planner' | 'results' | 'compare';
type CalculatorMode = 'fire-number' | 'withdrawal-income';
type ResultsMode = 'chart' | 'table';
type ProjectionBasis = 'fire-number' | 'current-portfolio';
type ScenarioField = 'spendingDelta' | 'portfolioDelta' | 'returnDelta' | 'inflationDelta';
export type TimelineInput = {
  currentAge: number;
  retirementAge: number;
  planEndAge: number;
};

type ScenarioConfig = {
  id: 'base' | 'guardrail' | 'upside';
  label: string;
  spendingDelta: number;
  portfolioDelta: number;
  returnDelta: number;
  inflationDelta: number;
};

type AppSnapshot = PlanningSnapshot;
export type SavedPlan = PlanningSavedPlan;

export {
  clearLocalDrafts,
  createCalculatorResultRecord,
  formatAccountMetric,
  formatCents,
  formatCurrencyBreakdown,
  formatTransactionAmount,
  isBalanceStale,
  summarizeAccountList,
  summarizeGoalList,
  type AccountDraft,
  type AccountProfile,
  type AccountProfileDraft,
  type AccountSummary,
  type BalanceDraft,
  type FinancialAccount,
  type Goal,
  type GoalDraft,
  type GoalStatus,
  type GoalSummary,
  type GoalType,
  type GoalUpdateDraft,
  type SavedCalculatorResult,
  type Transaction,
  type TransactionDraft,
  type TransactionSummary
};

const navigationIconByPath: Record<string, typeof Calculator> = {
  '/accounts': CircleDollarSign,
  '/calculators': Calculator,
  '/calculators/fire': Target,
  '/dashboard': LayoutDashboard,
  '/goals': Target,
  '/plans': FolderKanban,
  '/reports': BarChart3,
  '/settings': Settings,
  '/transactions': ClipboardList
};

const popularCalculatorLinks: Array<{ label: string; path: AppRoute }> = [
  { label: 'Mortgage', path: '/calculators/mortgage' },
  { label: 'Debt payoff', path: '/calculators/debt-payoff' },
  { label: 'Compound interest', path: '/calculators/compound-interest' },
  { label: 'FIRE', path: '/calculators/fire' }
];

const calculatorPanels: Array<{ id: CalculatorPanel; label: string; icon: typeof Calculator }> = [
  { id: 'planner', label: 'Inputs', icon: Calculator },
  { id: 'results', label: 'Results', icon: LineChartIcon },
  { id: 'compare', label: 'Compare', icon: BarChart3 }
];

const calculatorModeCopy: Record<
  CalculatorMode,
  {
    eyebrow: string;
    title: string;
    shortTitle: string;
    primaryLabel: string;
    primaryHelp: string;
    secondaryLabel: string;
    secondaryHelp: string;
  }
> = {
  'fire-number': {
    eyebrow: 'Need to number',
    title: 'Find my FIRE number',
    shortTitle: 'FIRE number',
    primaryLabel: 'Annual withdrawal need',
    primaryHelp: 'Example starting value: $80,000/yr. Adjust for your expected first-year retirement spending (not personalized advice).',
    secondaryLabel: 'Current portfolio',
    secondaryHelp: 'Example starting value: $750,000. Used for funding gap and stress checks.'
  },
  'withdrawal-income': {
    eyebrow: 'Number to income',
    title: 'Find my annual withdrawal',
    shortTitle: 'Withdrawal income',
    primaryLabel: 'FIRE number / portfolio',
    primaryHelp: 'Example starting value: $750,000. Portfolio amount to test (not personalized advice).',
    secondaryLabel: 'Need benchmark',
    secondaryHelp: 'Example spending goal to compare ($80,000/yr).'
  }
};

export const initialPlan: PlanInput = {
  annualExpense: 80_000,
  initialPortfolio: 750_000,
  withdrawalTiming: 'end',
  desiredFinalValue: 0,
  ratePeriods: [
    { duration: 30, r: 0, i: 0 }
  ],
  oneOffEvents: [],
  recurringCashFlows: []
};

export const initialTimeline: TimelineInput = {
  currentAge: 40,
  retirementAge: 50,
  planEndAge: 80
};

// Loading a saved snapshot fills fields added since it was saved. The planning workspace compares
// against the same normalization so legacy snapshots do not look like unsaved edits.
export function normalizeSnapshotPlan(plan: Partial<PlanInput>): PlanInput {
  return { ...initialPlan, ...plan, recurringCashFlows: plan.recurringCashFlows ?? [] };
}

export type FireCurrency = 'USD' | 'INR';
export type SavingsEntry = { annualSavings: string; savingsGrowth: string };
export type RateEntry = { r: string; i: string };

// Example rates offered by "Use example values": the homepage illustration, so the two always agree.
export const EXAMPLE_RATE_ENTRY: RateEntry = {
  r: String(Math.round(HERO_FIRE_FIXTURE.ratePeriods[0].r * 1000) / 10),
  i: String(Math.round(HERO_FIRE_FIXTURE.ratePeriods[0].i * 1000) / 10)
};
export const EMPTY_RATE_ENTRY: RateEntry = { r: '', i: '' };
export const EMPTY_SAVINGS_ENTRY: SavingsEntry = { annualSavings: '', savingsGrowth: '' };

export function formatRateText(rate: number): string {
  return String(Math.round(rate * 100 * 10_000) / 10_000);
}

export function parseSavingsEntry(entry: SavingsEntry): { annualSavings: number | null; savingsGrowth: number } {
  const savings = entry.annualSavings.trim() === '' ? null : Number(entry.annualSavings);
  const growth = entry.savingsGrowth.trim() === '' ? 0 : Number(entry.savingsGrowth) / 100;
  return { annualSavings: savings !== null && Number.isFinite(savings) ? savings : null, savingsGrowth: Number.isFinite(growth) ? growth : 0 };
}

export function normalizeSnapshotTimeline(timeline: Partial<TimelineInput>): TimelineInput {
  return { ...initialTimeline, ...timeline };
}

const initialScenarios: ScenarioConfig[] = [
  {
    id: 'base',
    label: 'Base',
    spendingDelta: 0,
    portfolioDelta: 0,
    returnDelta: 0,
    inflationDelta: 0
  },
  {
    id: 'guardrail',
    label: 'Guardrail',
    spendingDelta: -0.05,
    portfolioDelta: 0,
    returnDelta: -0.015,
    inflationDelta: 0.005
  },
  {
    id: 'upside',
    label: 'Upside',
    spendingDelta: 0.05,
    portfolioDelta: 0.05,
    returnDelta: 0.015,
    inflationDelta: -0.005
  }
];

function normalizeRoute(pathname: string): AppRoute {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  switch (cleanPath) {
    case '/':
    case '/dashboard':
    case '/accounts':
    case '/transactions':
    case '/goals':
    case '/plans':
    case '/calculators':
    case '/calculators/fire':
    case '/reports':
    case '/settings':
      return cleanPath;
    default:
      if (cleanPath.startsWith('/plans/')) {
        return '/plans';
      }

      if (cleanPath.startsWith('/calculators/') && findSeoCalculator(cleanPath)) {
        return cleanPath as `/calculators/${string}`;
      }

      return '/';
  }
}

function readRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return '/';
  }

  return normalizeRoute(window.location.pathname);
}

function readPreferredMode(): Mode {
  if (typeof window === 'undefined') return 'light';

  const saved = window.localStorage.getItem('finpath.colorMode');
  if (saved === 'light' || saved === 'dark') return saved;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function handleNavigationAnchorClick(
  event: ReactMouseEvent<HTMLAnchorElement>,
  route: AppRoute,
  onNavigate: (route: AppRoute) => void,
  beforeNavigate?: () => void
) {
  if (
    !shouldHandleNavigationClick(event, {
      download: event.currentTarget.hasAttribute('download'),
      target: event.currentTarget.target
    })
  ) {
    return;
  }

  event.preventDefault();
  beforeNavigate?.();
  onNavigate(route);
}

function modeledDurationFromTimeline(timeline: TimelineInput): number {
  return Math.max(1, Math.trunc(timeline.planEndAge) - Math.trunc(timeline.retirementAge));
}

function resizeRatePeriods(periods: RatePeriod[], duration: number): RatePeriod[] {
  const targetDuration = Math.max(1, Math.trunc(duration));
  const source = periods.length > 0 ? periods : [{ duration: targetDuration, r: 0, i: 0 }];
  let remaining = targetDuration;
  const resized: RatePeriod[] = [];

  source.forEach((period, index) => {
    if (remaining <= 0) {
      return;
    }

    const isLast = index === source.length - 1;
    const nextDuration = isLast ? remaining : Math.min(Math.max(1, period.duration), remaining);
    resized.push({ ...period, duration: nextDuration });
    remaining -= nextDuration;
  });

  if (remaining > 0) {
    const last = resized[resized.length - 1] ?? source[source.length - 1];
    resized[resized.length - 1] = { ...last, duration: last.duration + remaining };
  }

  return resized;
}

export function priorityLabel(priority: InsightPriority): string {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

function updateRatePeriod(
  periods: RatePeriod[],
  index: number,
  key: keyof RatePeriod,
  value: number
): RatePeriod[] {
  return periods.map((period, periodIndex) =>
    periodIndex === index ? { ...period, [key]: value } : period
  );
}

function updateScenario(
  scenarios: ScenarioConfig[],
  id: ScenarioConfig["id"],
  updates: Partial<ScenarioConfig>
): ScenarioConfig[] {
  return scenarios.map((scenario) =>
    scenario.id === id ? { ...scenario, ...updates } : scenario
  );
}

function clampRate(value: number): number {
  return Math.min(0.5, Math.max(-0.5, value));
}

function applyScenario(plan: PlanInput, scenario: ScenarioConfig): PlanInput {
  return {
    ...plan,
    annualExpense: Math.max(0, plan.annualExpense * Math.max(0, 1 + scenario.spendingDelta)),
    initialPortfolio: Math.max(0, plan.initialPortfolio * Math.max(0, 1 + scenario.portfolioDelta)),
    ratePeriods: plan.ratePeriods.map((period) => ({
      ...period,
      r: clampRate(period.r + scenario.returnDelta),
      i: clampRate(period.i + scenario.inflationDelta)
    })),
    recurringCashFlows: (plan.recurringCashFlows ?? []).map((flow) =>
      flow.kind === "expense"
        ? { ...flow, amount: Math.max(0, flow.amount * Math.max(0, 1 + scenario.spendingDelta)) }
        : flow
    )
  };
}

export const landingSteps = [
  {
    step: '1',
    title: 'Add your numbers',
    body: 'Start with your savings and spending.',
    icon: Calculator
  },
  {
    step: '2',
    title: 'Try different assumptions',
    body: 'Explore how changes affect the estimate.',
    icon: TrendingUp
  },
  {
    step: '3',
    title: 'Review the results',
    body: 'See the timeline and the assumptions behind it.',
    icon: Target
  }
];

export const usefulCalculatorPaths = [
  {
    title: 'Buying a home?',
    action: 'Explore borrowing costs',
    body: 'Estimate monthly payments and total interest over time.',
    route: '/calculators/mortgage' as AppRoute,
    icon: CircleDollarSign
  },
  {
    title: 'Growing your savings?',
    action: 'Explore compound growth',
    body: 'See how regular contributions compound over time.',
    route: '/calculators/compound-interest' as AppRoute,
    icon: TrendingUp
  },
  {
    title: 'Long-term independence?',
    action: 'Explore financial independence',
    body: 'Model portfolio needs and sustainable retirement withdrawals.',
    route: '/calculators/fire' as AppRoute,
    icon: Target
  }
];

const calculatorModules = [
  {
    title: 'FIRE Calculator',
    body: 'Estimate a retirement portfolio target or annual withdrawal from a portfolio.',
    status: 'Ready',
    route: '/calculators/fire' as AppRoute,
    icon: Calculator
  },
  {
    title: 'Emergency Fund',
    body: 'Size cash reserves from monthly spending, income stability, and dependents.',
    status: 'Planned',
    icon: ShieldCheck
  },
  {
    title: 'Debt Payoff',
    body: 'Compare avalanche and snowball payoff schedules across balances and APRs.',
    status: 'Planned',
    icon: ClipboardList
  },
  {
    title: 'Savings Goal',
    body: 'Back into monthly savings for a home, education, travel, or family milestone.',
    status: 'Planned',
    icon: Target
  }
];

export const platformPages: Record<
  PlatformRoute,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: typeof Calculator;
    cards: Array<{ label: string; value: string; detail: string }>;
  }
> = {
  '/dashboard': {
    eyebrow: 'Dashboard',
    title: 'Your financial snapshot starts here.',
    description:
      'Net worth, account balances, and funded goals roll up from your saved tracker data.',
    icon: LayoutDashboard,
    cards: [
      { label: 'Net worth', value: '$0', detail: 'Manual accounts and balances power this number.' },
      { label: 'Goal progress', value: '0%', detail: 'Goals will roll up into a concise progress view.' },
      { label: 'Saved plans', value: '0', detail: 'FIRE and future planning modules will save here.' }
    ]
  },
  '/accounts': {
    eyebrow: 'Accounts',
    title: 'Keep every balance in view.',
    description:
      'Add accounts by hand or review a balance CSV before updating net worth and account history.',
    icon: CircleDollarSign,
    cards: [
      { label: 'Assets', value: 'Ready', detail: 'Cash, brokerage, retirement, property, and other holdings.' },
      { label: 'Liabilities', value: 'Ready', detail: 'Credit cards, loans, mortgages, and other debt balances.' },
      { label: 'Balances', value: 'Ready', detail: 'Snapshot history for dashboard calculations.' }
    ]
  },
  '/transactions': {
    eyebrow: 'Transactions',
    title: 'Manual ledger for cash flow.',
    description:
      'Add income, expenses, transfers, and adjustments without linking them to balance imports yet.',
    icon: ClipboardList,
    cards: [
      { label: 'Manual rows', value: 'Ready', detail: 'Income, expense, transfer, and adjustment entries.' },
      { label: 'Categories', value: 'Ready', detail: 'Optional labels keep the first ledger flexible.' },
      { label: 'Imports', value: 'Later', detail: 'Balance CSV imports remain separate from transactions.' }
    ]
  },
  '/goals': {
    eyebrow: 'Goals',
    title: 'Fund the milestones that matter next.',
    description:
      'Create dated targets, update funded amounts, and keep overdue or paused goals visible.',
    icon: Target,
    cards: [
      { label: 'Funded', value: '0%', detail: 'Overall progress across goals with target amounts.' },
      { label: 'Active', value: '0', detail: 'Goals currently moving toward a target.' },
      { label: 'Deadlines', value: '0', detail: 'Target dates surface upcoming and overdue work.' }
    ]
  },
  '/plans': {
    eyebrow: 'Plans',
    title: 'Saved planning versions will collect here.',
    description:
      'This route separates durable financial plans from one-time calculator runs and local demo drafts.',
    icon: FolderKanban,
    cards: [
      { label: 'Plan versions', value: 'Coming', detail: 'Compare assumptions across saved plan history.' },
      { label: 'Scenario notes', value: 'Coming', detail: 'Capture what changed and why.' },
      { label: 'Exports', value: 'Coming', detail: 'Keep portability and user data ownership visible.' }
    ]
  },
  '/reports': {
    eyebrow: 'Reports',
    title: 'Insights with the evidence attached.',
    description:
      'Prioritized recommendations stay rule-based, traceable, and clear about uncertainty.',
    icon: BarChart3,
    cards: [
      { label: 'Next actions', value: 'Ready', detail: 'Plan, account, and goal rules sorted by priority.' },
      { label: 'Evidence', value: 'Ready', detail: 'Every insight cites the inputs that triggered it.' },
      { label: 'Uncertainty', value: 'Ready', detail: 'Assumption limits stay visible before acting.' }
    ]
  },
  '/settings': {
    eyebrow: 'Settings',
    title: 'Profile and privacy controls.',
    description:
      'Manage household planning defaults, download saved data, and delete your saved records when needed.',
    icon: Settings,
    cards: [
      { label: 'Profile', value: 'Ready', detail: 'Household and planning defaults.' },
      { label: 'Privacy', value: 'Ready', detail: 'Download or delete your saved data.' },
      { label: 'Theme', value: 'Ready', detail: 'Light and dark controls remain global.' }
    ]
  }
};

function isPlatformRoute(route: AppRoute): route is PlatformRoute {
  return route in platformPages;
}

function AuthActionButton({
  auth,
  kind,
  className,
  children,
  onUnavailable
}: {
  auth: AuthState;
  kind: 'sign-in' | 'sign-up';
  className: string;
  children: ReactNode;
  onUnavailable: () => void;
}) {
  const button = (
    <button className={className} onClick={auth.isConfigured ? undefined : onUnavailable}>
      {children}
    </button>
  );

  if (!auth.isConfigured) {
    return button;
  }

  return kind === 'sign-in' ? (
    <SignInIntent mode="redirect">
      {button}
    </SignInIntent>
  ) : (
    <SignUpIntent mode="redirect">
      {button}
    </SignUpIntent>
  );
}

export function SignedInProfileBand({ auth }: { auth: Extract<AuthState, { status: 'signed-in' }> }) {
  const hasDistinctEmail = Boolean(auth.user.email && auth.user.email !== auth.user.displayName);
  return (
    <section className="profile-band" aria-label="Signed-in profile">
      <span className="feature-icon">
        <UserCircle size={20} />
      </span>
      <div>
        <span>Signed in as</span>
        <strong>{auth.user.displayName}</strong>
        {hasDistinctEmail && <small>{auth.user.email}</small>}
      </div>
      <small className="profile-private-label">Private workspace</small>
    </section>
  );
}

export function AuthGate({
  auth,
  route,
  onNavigate
}: {
  auth: AuthState;
  route: PlatformRoute;
  onNavigate: (route: AppRoute) => void;
}) {
  const page = platformPages[route];
  const Icon = page.icon;
  const title =
    auth.status === 'not-configured'
      ? 'Account features are currently unavailable.'
      : auth.status === 'loading'
        ? 'Checking your session.'
        : `Sign in to open ${page.eyebrow}.`;
  const description =
    auth.status === 'not-configured'
      ? 'Saved plans, accounts, and cross-device sync require account services that are not active in this preview. You can use all interactive financial calculators without an account.'
      : auth.status === 'loading'
        ? 'FinPath is confirming whether there is an active session for this browser.'
        : `${page.eyebrow} is part of the account-backed planning shell. You can still use the public calculator library without signing in.`;

  return (
    <section className="route-shell auth-gate" aria-labelledby={`${route.slice(1)}-auth-title`}>
      <div className="auth-gate-panel">
        <span className="feature-icon">
          {auth.status === 'not-configured' ? <LockKeyhole size={20} /> : <Icon size={20} />}
        </span>
        <div className="route-heading">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 id={`${route.slice(1)}-auth-title`}>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="auth-gate-actions">
          {auth.status === 'loading' ? (
            <>
              <button className="primary-button icon-text-button" disabled>
                <LogIn size={17} />
                Checking session
              </button>
              <button className="secondary-button icon-text-button" onClick={() => onNavigate('/calculators')}>
                <Calculator size={16} />
                Browse calculators
              </button>
            </>
          ) : auth.status === 'signed-out' ? (
            <>
              <AuthActionButton
                auth={auth}
                kind="sign-in"
                className="primary-button icon-text-button"
                onUnavailable={() => onNavigate(route)}
              >
                <LogIn size={17} />
                Sign in
              </AuthActionButton>
              <AuthActionButton
                auth={auth}
                kind="sign-up"
                className="secondary-button icon-text-button"
                onUnavailable={() => onNavigate(route)}
              >
                Create account
                <ArrowRight size={17} />
              </AuthActionButton>
              <button className="secondary-button icon-text-button" onClick={() => onNavigate('/calculators')}>
                <Calculator size={16} />
                Browse calculators
              </button>
            </>
          ) : (
            <>
              <button className="primary-button icon-text-button" onClick={() => onNavigate('/calculators')}>
                <Calculator size={16} />
                Explore public calculators
              </button>
              <button className="secondary-button icon-text-button" disabled aria-disabled="true">
                <LockKeyhole size={17} />
                Account features unavailable
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DesktopNavigation({
  authStatus,
  route,
  onNavigate
}: {
  authStatus: AuthState['status'];
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
}) {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const primaryItems = primaryNavigationFor(authStatus);
  const activePrimaryPath = activeNavigationPath(route, primaryItems);
  const activeWorkspacePath = activeNavigationPath(route, workspaceNavigation);
  const workspaceIsActive = activeWorkspacePath !== null;

  useEffect(() => {
    setIsWorkspaceOpen(false);
  }, [route]);

  useEffect(() => {
    const closeOnOutsideInteraction = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsWorkspaceOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isWorkspaceOpen) return;
      event.preventDefault();
      setIsWorkspaceOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsideInteraction);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isWorkspaceOpen]);

  return (
    <nav className="desktop-nav" aria-label="Primary">
      {primaryItems.map((item) => {
        const Icon = navigationIconByPath[item.path];
        const isActive = activePrimaryPath === item.path;
        return (
          <a
            key={item.path}
            href={item.path}
            className={isActive ? 'nav-button active' : 'nav-button'}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => handleNavigationAnchorClick(event, item.path, onNavigate)}
          >
            <Icon size={17} />
            {item.label}
          </a>
        );
      })}
      <div className="desktop-nav-menu" ref={menuRef}>
        <button
          ref={triggerRef}
          className={workspaceIsActive ? 'nav-button active' : 'nav-button'}
          type="button"
          aria-controls="desktop-workspace-navigation"
          aria-current={workspaceIsActive ? 'page' : undefined}
          aria-expanded={isWorkspaceOpen}
          onClick={() => setIsWorkspaceOpen((open) => !open)}
        >
          <FolderKanban size={17} />
          Workspace
          <ChevronDown className={isWorkspaceOpen ? 'nav-chevron open' : 'nav-chevron'} size={15} />
        </button>
        {isWorkspaceOpen && (
          <div className="desktop-nav-dropdown" id="desktop-workspace-navigation">
            {workspaceNavigation.map((item) => {
              const Icon = navigationIconByPath[item.path];
              const isActive = activeWorkspacePath === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={isActive ? 'active' : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) =>
                    handleNavigationAnchorClick(event, item.path, onNavigate, () => setIsWorkspaceOpen(false))
                  }
                >
                  <Icon size={17} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.path === '/accounts' ? 'Balances and net worth' : item.path === '/plans' ? 'Saved scenarios' : item.path === '/reports' ? 'Progress and insights' : 'Profile and preferences'}</small>
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

export function LandingPage({ auth, onNavigate }: { auth: AuthState; onNavigate: (route: AppRoute) => void }) {
  return (
    <>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="eyebrow">Plan your financial future</p>
            <h1 id="landing-title">See when you could retire.</h1>
            <p>
              See how saving more or spending less could change your retirement timeline. Try it free, without an account.
            </p>
            <div className="landing-actions">
              <a
                href="/calculators/fire"
                className="primary-button icon-text-button"
                onClick={(event) => handleNavigationAnchorClick(event, '/calculators/fire', onNavigate)}
              >
                <Target size={16} />
                Explore my retirement timeline
              </a>
              <a
                href="/calculators"
                className="secondary-button icon-text-button"
                onClick={(event) => handleNavigationAnchorClick(event, '/calculators', onNavigate)}
              >
                <Calculator size={16} />
                Explore all calculators
              </a>
            </div>
            <nav className="landing-popular-paths" aria-label="Popular calculators">
              <span>Popular starts</span>
              {popularCalculatorLinks.map(({ path, label }) => (
                <a
                  key={path}
                  href={path}
                  onClick={(event) => handleNavigationAnchorClick(event, path, onNavigate)}
                >
                  {label}
                  <ChevronRight size={14} />
                </a>
              ))}
            </nav>
          </div>

          <HeroFireExample />
        </div>
      </section>

      <section className="landing-path-strip" aria-label="Choose a planning path">
        {usefulCalculatorPaths.map((pathItem) => {
          const Icon = pathItem.icon;
          return (
            <a
              key={pathItem.route}
              href={pathItem.route}
              onClick={(event) => handleNavigationAnchorClick(event, pathItem.route, onNavigate)}
            >
              <Icon size={22} />
              <span>
                <small>{pathItem.title}</small>
                <strong>{pathItem.action}</strong>
              </span>
              <ArrowRight size={18} />
            </a>
          );
        })}
      </section>

      <section className="landing-capabilities" aria-labelledby="capabilities-title">
        <header>
          <p className="eyebrow">How it works</p>
          <h2 id="capabilities-title">Start with a question. Leave with a clearer plan.</h2>
          <p>Each tool helps you test assumptions, inspect the math, and understand what changes the outcome.</p>
        </header>

        <div className="landing-feature-list">
          {landingSteps.map((stepItem) => {
            const Icon = stepItem.icon;
            return (
              <article className="landing-feature" key={stepItem.title}>
                <span className="feature-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{stepItem.title}</strong>
                  <small>{stepItem.body}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="privacy-band" aria-labelledby="privacy-title">
        <ShieldCheck size={24} />
        <div>
          <h2 id="privacy-title">Start without an account.</h2>
          <p>
            Use the public calculators before deciding whether to create an account.
          </p>
        </div>
        {auth.isConfigured && (
          auth.isSignedIn ? (
            <a
              href="/dashboard"
              className="secondary-button icon-text-button"
              onClick={(event) => handleNavigationAnchorClick(event, '/dashboard', onNavigate)}
            >
              Open dashboard
              <ArrowRight size={17} />
            </a>
          ) : (
            <AuthActionButton
              auth={auth}
              kind="sign-up"
              className="secondary-button icon-text-button"
              onUnavailable={() => onNavigate('/dashboard')}
            >
              Create account
              <ArrowRight size={17} />
            </AuthActionButton>
          )
        )}
      </section>

      <footer className="landing-footer">
        <a
          href="/"
          onClick={(event) => handleNavigationAnchorClick(event, '/', onNavigate)}
          aria-label="FinPath home"
        >
          <PiggyBank size={22} />
          <strong>FinPath</strong>
        </a>
        <p>Track today. Test tomorrow. Keep the assumptions yours.</p>
        <a
          className="landing-footer-action"
          href="/calculators"
          onClick={(event) => handleNavigationAnchorClick(event, '/calculators', onNavigate)}
        >
          Browse calculators
          <ArrowRight size={16} />
        </a>
      </footer>
    </>
  );
}

function CalculatorsPage({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <section className="route-shell" aria-labelledby="calculators-title">
      <div className="route-heading">
        <p className="eyebrow">Calculators</p>
        <h1 id="calculators-title">Financial calculators</h1>
        <p>
          Explore task-focused financial calculators designed to help you plan savings, debt payoff,
          home purchases, and retirement.
        </p>
      </div>

      <div className="module-grid">
        {calculatorModules.map((module) => {
          const Icon = module.icon;
          return (
            <article className="module-card" key={module.title}>
              <span className="feature-icon">
                <Icon size={20} />
              </span>
              <div>
                <span className="pill">{module.status}</span>
                <strong>{module.title}</strong>
                <small>{module.body}</small>
              </div>
              {module.route ? (
                <button
                  className="secondary-button icon-text-button"
                  onClick={() => onNavigate(module.route)}
                >
                  Open
                  <ChevronRight size={16} />
                </button>
              ) : (
                <span className="module-soon">Future module</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TopbarAuthActions({
  auth,
  onNavigate
}: {
  auth: AuthState;
  onNavigate: (route: AppRoute) => void;
}) {
  if (auth.isSignedIn) {
    return (
      <>
        <div className="topbar-profile" aria-label="Current user">
          <AccountUserButton />
          <span>{auth.user.displayName}</span>
        </div>
        <SignOutControl redirectUrl="/">
          <button className="secondary-button topbar-link icon-text-button">
            <LogOut size={16} />
            Sign out
          </button>
        </SignOutControl>
      </>
    );
  }

  return (
    <>
      {auth.status === 'loading' ? (
        <button className="secondary-button topbar-link" disabled>
          Checking
        </button>
      ) : (
        <AuthActionButton
          auth={auth}
          kind="sign-in"
          className="secondary-button topbar-link icon-text-button"
          onUnavailable={() => onNavigate('/dashboard')}
        >
          <LogIn size={16} />
          Sign in
        </AuthActionButton>
      )}
      {auth.status === 'loading' ? (
        <button className="primary-button topbar-primary" disabled>
          Create account
        </button>
      ) : (
        <AuthActionButton
          auth={auth}
          kind="sign-up"
          className="primary-button topbar-primary"
          onUnavailable={() => onNavigate('/dashboard')}
        >
          Create account
        </AuthActionButton>
      )}
    </>
  );
}

function App({ auth }: { auth: AuthState }) {
  const [route, setRoute] = useState<AppRoute>(readRoute);
  const mainRef = useRef<HTMLElement>(null);
  const previousRouteRef = useRef<AppRoute>(route);

  useEffect(() => {
    if (previousRouteRef.current === route) {
      return;
    }

    previousRouteRef.current = route;
    const focusRouteHeading = () => {
      const heading = mainRef.current?.querySelector<HTMLElement>('h1');
      if (!heading) return false;

      heading.setAttribute('tabindex', '-1');
      heading.focus();
      return true;
    };

    if (focusRouteHeading()) return;

    const observer = new MutationObserver(() => {
      if (focusRouteHeading()) observer.disconnect();
    });

    if (mainRef.current) observer.observe(mainRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route]);

  useEffect(() => {
    applyRouteMetadata(route);
  }, [route]);


  const [plan, setPlan] = useState<PlanInput>(initialPlan);
  const [timeline, setTimeline] = useState<TimelineInput>(initialTimeline);
  const [mode, setMode] = useState<Mode>(readPreferredMode);
  const [calculatorPanel, setCalculatorPanel] = useState<CalculatorPanel>('planner');
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('fire-number');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [displayedResult, setDisplayedResult] = useState<{
    result: FirePlanResult;
    plan: PlanInput;
    mode: CalculatorMode;
    simulation: SimulationResult;
    timeline: TimelineInput;
  } | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>('chart');
  // Return/inflation start empty and required (OD-1). null means "show the loaded plan's rates".
  const [rateEntry, setRateEntry] = useState<RateEntry | null>(EMPTY_RATE_ENTRY);
  const [savingsEntry, setSavingsEntry] = useState<SavingsEntry>(EMPTY_SAVINGS_ENTRY);
  const [fireCurrency, setFireCurrency] = useState<FireCurrency>('USD');
  const [calculatedSavings, setCalculatedSavings] = useState<ReturnType<typeof parseSavingsEntry>>({ annualSavings: null, savingsGrowth: 0 });
  const [projectionBasis, setProjectionBasis] = useState<ProjectionBasis>('fire-number');
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(initialScenarios);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(readSavedPlans);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activePlanVersionNumber, setActivePlanVersionNumber] = useState<number | null>(null);
  const [seedApplications, setSeedApplications] = useState<SeedApplication[]>([]);
  const [lastSeedImport, setLastSeedImport] = useState<{
    preview: Extract<PlanSeedPreview, { ok: true }>;
    previousApplications: SeedApplication[];
  } | null>(null);
  const [isLoadingSavedPlans, setIsLoadingSavedPlans] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planStorageMessage, setPlanStorageMessage] = useState('');
  const [planDeepLinkError, setPlanDeepLinkError] = useState<string | null>(null);
  const [dueReviews, setDueReviews] = useState<DueReviewItem[] | null>(null);
  const [isLoadingDueReviews, setIsLoadingDueReviews] = useState(false);
  const [dueReviewsError, setDueReviewsError] = useState<string | null>(null);
  const [isPlanningWorkspaceDirty, setIsPlanningWorkspaceDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    nextRoute: string;
    isPopState?: boolean;
  } | null>(null);

  const refreshDueReviews = useCallback(async () => {
    if (auth.status !== 'signed-in') {
      setDueReviews(null);
      setIsLoadingDueReviews(false);
      setDueReviewsError(null);
      return;
    }

    setIsLoadingDueReviews(true);
    setDueReviewsError(null);

    try {
      const data = await loadDuePlanReviews(auth);
      if (data) {
        setDueReviews(data.dueReviews);
      } else {
        setDueReviews([]);
      }
    } catch {
      setDueReviewsError('Unable to load plan review status.');
    } finally {
      setIsLoadingDueReviews(false);
    }
  }, [auth]);

  const loadPlanDeepLinkTarget = useCallback(
    async (
      targetPlanId: string,
      targetVersionNumber: number | null,
      isVersionInvalid: boolean,
      plansList: SavedPlan[] = savedPlans
    ) => {
      if (isVersionInvalid) {
        setPlanDeepLinkError(
          'Saved decision unavailable: Invalid version parameter specified in link.'
        );
        setActivePlanId(null);
        setActivePlanVersionNumber(null);
        setPlanStorageMessage('Saved decision unavailable.');
        return false;
      }

      const matchingPlan = plansList.find((p) => p.id === targetPlanId);
      if (!matchingPlan) {
        setPlanDeepLinkError(
          'Saved decision unavailable: This plan or version was not found, has been archived, or you do not have permission to view it.'
        );
        setActivePlanId(null);
        setActivePlanVersionNumber(null);
        setPlanStorageMessage('Saved decision unavailable.');
        return false;
      }

      if (targetVersionNumber && targetVersionNumber !== matchingPlan.versionNumber) {
        if (auth.status !== 'signed-in') {
          return false;
        }
        try {
          const res = await authenticatedJsonRequest(
            auth,
            `/api/plans/${encodeURIComponent(matchingPlan.id)}/versions/${targetVersionNumber}`
          );
          if (!res.ok) {
            setPlanDeepLinkError(
              'Saved decision unavailable: This plan or version was not found, has been archived, or you do not have permission to view it.'
            );
            setActivePlanId(null);
            setActivePlanVersionNumber(null);
            setPlanStorageMessage('Saved decision unavailable.');
            return false;
          }
          const verBody: any = await res.json().catch(() => null);
          const snapshot = verBody?.version?.snapshot;
          if (!snapshot || !snapshot.plan || !snapshot.timeline) {
            setPlanDeepLinkError(
              'Saved decision unavailable: This plan or version was not found, has been archived, or you do not have permission to view it.'
            );
            setActivePlanId(null);
            setActivePlanVersionNumber(null);
            setPlanStorageMessage('Saved decision unavailable.');
            return false;
          }

          setActivePlanId(matchingPlan.id);
          setActivePlanVersionNumber(targetVersionNumber);
          setSaveName(matchingPlan.name);
          hydrateFromSnapshot(snapshot);
          setHasCalculated(true);
          setPlanDeepLinkError(null);
          setPlanStorageMessage(`Version ${targetVersionNumber} of "${matchingPlan.name}" loaded.`);
          return true;
        } catch {
          setPlanDeepLinkError(
            'Saved decision unavailable: This plan or version was not found, has been archived, or you do not have permission to view it.'
          );
          setActivePlanId(null);
          setActivePlanVersionNumber(null);
          setPlanStorageMessage('Saved decision unavailable.');
          return false;
        }
      }

      setActivePlanId(matchingPlan.id);
      setActivePlanVersionNumber(matchingPlan.versionNumber ?? null);
      setSaveName(matchingPlan.name);
      hydrateFromSnapshot(matchingPlan.snapshot);
      setHasCalculated(true);
      setPlanDeepLinkError(null);
      setPlanStorageMessage(`Plan "${matchingPlan.name}" loaded.`);
      return true;
    },
    [auth, savedPlans]
  );
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<AccountProfileDraft>(emptyProfileDraft);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [isExportingAccountData, setIsExportingAccountData] = useState(false);
  const [isDeletingAccountData, setIsDeletingAccountData] = useState(false);
  const [accountDataDeleteConfirmation, setAccountDataDeleteConfirmation] = useState('');
  const [accountDataPrivacyMessage, setAccountDataPrivacyMessage] = useState<PrivacyStatus | null>(null);
  // B12: optional product analytics, off until the signed-in user turns it on.
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean | null>(null);
  const [isSavingAnalyticsConsent, setIsSavingAnalyticsConsent] = useState(false);
  const [analyticsConsentMessage, setAnalyticsConsentMessage] = useState('');

  useEffect(() => {
    if (auth.status !== 'signed-in') {
      setAnalyticsConsent(null);
      configureAnalytics({ enabled: false, getToken: async () => null });
      return;
    }
    let cancelled = false;
    authenticatedJsonRequest(auth, '/api/analytics/consent')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (!cancelled) setAnalyticsConsent((body as { granted?: unknown } | null)?.granted === true);
      })
      .catch(() => {
        if (!cancelled) setAnalyticsConsent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, auth.user?.id]);

  useEffect(() => {
    configureAnalytics({
      enabled: auth.status !== 'signed-in' ? false : analyticsConsent === null ? 'pending' : analyticsConsent,
      getToken: auth.status === 'signed-in' ? auth.getToken : async () => null
    });
    if (typeof window === 'undefined') return;
    const flush = () => void flushAnalytics();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [analyticsConsent, auth.status]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(emptyAccountDraft);
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, BalanceDraft>>({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary>(emptyTransactionSummary);
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>(emptyTransactionDraft);
  const [transactionUpdateDrafts, setTransactionUpdateDrafts] = useState<Record<string, TransactionDraft>>({});
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(emptyTransactionFilters);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [transactionMessage, setTransactionMessage] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalSummary, setGoalSummary] = useState<GoalSummary>(() => summarizeGoalList([]));
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(emptyGoalDraft);
  const [goalUpdateDrafts, setGoalUpdateDrafts] = useState<Record<string, GoalUpdateDraft>>({});
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goalMessage, setGoalMessage] = useState('');
  const [savedCalculatorResults, setSavedCalculatorResults] = useState<SavedCalculatorResult[]>([]);
  const [isLoadingCalculatorResults, setIsLoadingCalculatorResults] = useState(false);
  const [calculatorResultMessage, setCalculatorResultMessage] = useState('');
  const [saveName, setSaveName] = useState('Retirement base');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const saveCoordinatorRef = useRef(
    new CalculatorSaveCoordinator<Extract<AuthState, { status: 'signed-in' }>, CalculatorSaveApiResponse>(
      (currentAuth) => currentAuth.user.id
    )
  );

  useEffect(() => {
    saveCoordinatorRef.current.handleAccountTransition(auth.status === 'signed-in' ? auth.user.id : null);
  }, [auth]);

  useEffect(() => {
    window.localStorage.setItem('finpath.colorMode', mode);
    document.documentElement.style.colorScheme = mode;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      'content',
      mode === 'dark' ? '#111715' : '#f4f7f7'
    );
  }, [mode]);

  useEffect(() => {
    const handlePopState = () => {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const nextRoute = readRoute();

      if (route === '/plans' && isPlanningWorkspaceDirty) {
        if (typeof window !== 'undefined') {
          window.history.pushState(null, '', '/plans');
        }
        setPendingNavigation({ nextRoute: currentUrl, isPopState: true });
        return;
      }

      setRoute(nextRoute);
      setIsMenuOpen(false);

      if (nextRoute === '/plans') {
        const deepLink = parsePlanDeepLink(window.location.href);
        const action = resolvePlansRouteAction(deepLink);
        if (action === 'keep-active-plan') {
          setPlanDeepLinkError(null);
        } else {
          void loadPlanDeepLinkTarget(deepLink.planId ?? '', deepLink.versionNumber, action === 'invalid-version');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isPlanningWorkspaceDirty, loadPlanDeepLinkTarget, route]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const desktopBreakpoint = window.matchMedia('(min-width: 1041px)');
    const closeAtDesktopBreakpoint = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsMenuOpen(false);
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    };

    closeAtDesktopBreakpoint(desktopBreakpoint);
    document.addEventListener('keydown', closeOnEscape);
    desktopBreakpoint.addEventListener('change', closeAtDesktopBreakpoint);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      desktopBreakpoint.removeEventListener('change', closeAtDesktopBreakpoint);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setSavedPlans(readSavedPlans());
      setActivePlanId(null);
      setIsLoadingSavedPlans(false);
      setPlanStorageMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingSavedPlans(true);
    setPlanStorageMessage('Loading account plans...');

    void refreshDueReviews();

    loadAccountPlans(auth)
      .then(async (plans) => {
        if (isCancelled) {
          return;
        }

        setSavedPlans(plans);
        const deepLink = parsePlanDeepLink(typeof window !== 'undefined' ? window.location.href : '');

        if (deepLink.isVersionInvalid) {
          setPlanDeepLinkError(
            'Saved decision unavailable: Invalid version parameter specified in link.'
          );
          setActivePlanId(null);
          setActivePlanVersionNumber(null);
          setPlanStorageMessage('Saved decision unavailable.');
          return;
        }

        if (deepLink.planId) {
          const loaded = await loadPlanDeepLinkTarget(
            deepLink.planId,
            deepLink.versionNumber,
            false,
            plans
          );
          if (loaded || isCancelled) return;
          return;
        }

        const latestPlan = plans[0];

        if (latestPlan) {
          setActivePlanId(latestPlan.id);
          setActivePlanVersionNumber(latestPlan.versionNumber ?? null);
          setSaveName(latestPlan.name);
          hydrateFromSnapshot(latestPlan.snapshot);
          setHasCalculated(true);
        }
        setPlanDeepLinkError(null);
        setPlanStorageMessage('Account-backed plan storage is active.');
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setSavedPlans([]);
        setPlanStorageMessage('Account plans could not be loaded. Local export still works.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingSavedPlans(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  useEffect(() => {
    if (auth.status === 'signed-in') {
      return;
    }

    setIsExportingAccountData(false);
    setIsDeletingAccountData(false);
    setAccountDataDeleteConfirmation('');
    setAccountDataPrivacyMessage(null);
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setAccountProfile(null);
      setProfileDraft(emptyProfileDraft());
      setIsLoadingProfile(false);
      setProfileMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingProfile(true);
    setProfileMessage('Loading account profile...');

    loadAccountProfile(auth)
      .then((profile) => {
        if (isCancelled) {
          return;
        }

        setAccountProfile(profile);
        setProfileDraft(profileToDraft(profile));
        setProfileMessage('Account profile is synced.');
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setAccountProfile(null);
        setProfileDraft(emptyProfileDraft());
        setProfileMessage('Account profile could not be loaded.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setFinancialAccounts([]);
      setAccountDraft(emptyAccountDraft());
      setBalanceDrafts({});
      setIsLoadingAccounts(false);
      setAccountMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingAccounts(true);
    setAccountMessage('Loading account balances...');

    loadFinancialAccounts(auth)
      .then(({ accounts }) => {
        if (isCancelled) {
          return;
        }

        setFinancialAccounts(accounts);
        setBalanceDrafts(buildBalanceDraftMap(accounts));
        setAccountMessage('Account balances are synced.');
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setFinancialAccounts([]);
        setBalanceDrafts({});
        setAccountMessage('Account balances could not be loaded.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingAccounts(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setTransactions([]);
      setTransactionSummary(emptyTransactionSummary());
      setTransactionDraft(emptyTransactionDraft());
      setTransactionUpdateDrafts({});
      setTransactionFilters(emptyTransactionFilters());
      setIsLoadingTransactions(false);
      setIsSavingTransaction(false);
      setTransactionMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingTransactions(true);
    setTransactionMessage('Loading transactions...');

    loadTransactions(auth)
      .then(({ summary, transactions: loadedTransactions }) => {
        if (isCancelled) {
          return;
        }

        setTransactions(loadedTransactions);
        setTransactionSummary(summary);
        setTransactionUpdateDrafts(buildTransactionDraftMap(loadedTransactions));
        setTransactionMessage('Transactions are synced.');
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setTransactions([]);
        setTransactionSummary(emptyTransactionSummary());
        setTransactionUpdateDrafts({});
        setTransactionMessage('Transactions could not be loaded.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingTransactions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setGoals([]);
      setGoalSummary(summarizeGoalList([]));
      setGoalDraft(emptyGoalDraft());
      setGoalUpdateDrafts({});
      setIsLoadingGoals(false);
      setIsSavingGoal(false);
      setGoalMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingGoals(true);
    setGoalMessage('Loading goals...');

    loadGoals(auth)
      .then(({ goals: loadedGoals, summary }) => {
        if (isCancelled) {
          return;
        }

        setGoals(loadedGoals);
        setGoalSummary(summary);
        setGoalUpdateDrafts(buildGoalUpdateDraftMap(loadedGoals));
        setGoalMessage('Goals are synced.');
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setGoals([]);
        setGoalSummary(summarizeGoalList([]));
        setGoalUpdateDrafts({});
        setGoalMessage('Goals could not be loaded.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingGoals(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setSavedCalculatorResults([]);
      setIsLoadingCalculatorResults(false);
      setCalculatorResultMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingCalculatorResults(true);
    setCalculatorResultMessage('Loading saved calculator results...');

    loadSavedCalculatorResults(auth)
      .then((calculatorResults) => {
        if (isCancelled) {
          return;
        }

        setSavedCalculatorResults(calculatorResults);
        setCalculatorResultMessage(
          calculatorResults.length > 0
            ? 'Saved calculator results are synced.'
            : 'Run a calculator and save the result to see it here.'
        );
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setSavedCalculatorResults([]);
        setCalculatorResultMessage('Saved calculator results could not be loaded.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingCalculatorResults(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [auth.status, auth.isSignedIn, auth.user?.id]);

  const result = useMemo<FirePlanResult>(() => calculateFirePlan(plan), [plan]);
  const accountSummary = useMemo<AccountSummary>(() => summarizeAccountList(financialAccounts), [financialAccounts]);
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, transactionFilters),
    [transactionFilters, transactions]
  );
  const filteredTransactionSummary = useMemo(
    () => summarizeTransactionList(filteredTransactions),
    [filteredTransactions]
  );
  const transactionCategoryOptions = useMemo(
    () => getTransactionCategoryOptions(transactions),
    [transactions]
  );
  const transactionCashflow = useMemo<TransactionCashflowRollup>(
    () => buildTransactionCashflowRollup(transactions, todayInputDate()),
    [transactions]
  );
  const activeSavedPlan = useMemo(
    () => savedPlans.find((item) => item.id === activePlanId) ?? null,
    [activePlanId, savedPlans]
  );
  const reportScope = useMemo(
    () =>
      buildReportScope({
        accounts: financialAccounts,
        goals,
        transactions,
        planLabel:
          auth.status === 'signed-in'
            ? activeSavedPlan
              ? `${activeSavedPlan.name}${activeSavedPlan.versionNumber ? ` · Version ${activeSavedPlan.versionNumber}` : ''}`
              : 'Current FIRE calculator draft (unsaved)'
            : null,
        today: todayInputDate()
      }),
    [activeSavedPlan, auth.status, financialAccounts, goals, transactions]
  );
  const financialInsights = useMemo(
    () =>
      buildFinancialInsights({
        accounts: financialAccounts,
        goals,
        goalSummary,
        plan:
          auth.status === 'signed-in'
            ? {
                name: activeSavedPlan?.name ?? 'Current FIRE draft',
                plan,
                result,
                versionNumber: activeSavedPlan?.versionNumber
              }
            : null,
        transactions,
        today: todayInputDate()
      }),
    [activeSavedPlan?.name, activeSavedPlan?.versionNumber, auth.status, financialAccounts, goalSummary, goals, plan, result, transactions]
  );
  const formatFireMoney = (value: number, options: Intl.NumberFormatOptions = {}) =>
    formatMoney(value, { currency: fireCurrency, ...options });
  const currencySymbol = fireCurrency === 'INR' ? '₹' : '$';
  const duration = totalDuration(plan.ratePeriods);
  const timelineDuration = modeledDurationFromTimeline(timeline);
  const currentSimulation = useMemo(() => stressTestCurrentPortfolio(plan), [plan]);
  const incomeStreams = (plan.recurringCashFlows ?? []).map((flow, index) => ({ flow, index })).filter(({ flow }) => flow.kind === 'income');
  const expensePhases = (plan.recurringCashFlows ?? []).map((flow, index) => ({ flow, index })).filter(({ flow }) => flow.kind === 'expense');
  const ratesSummary = rateEntry && (rateEntry.r.trim() === '' || rateEntry.i.trim() === '')
    ? 'Return and inflation not set yet'
    : plan.ratePeriods.length === 1
      ? `${(plan.ratePeriods[0].r * 100).toFixed(1)}% return, ${(plan.ratePeriods[0].i * 100).toFixed(1)}% inflation`
      : plan.ratePeriods
          .map(
            (p, idx) =>
              `P${idx + 1} (${p.duration}y): ${(p.r * 100).toFixed(1)}% return, ${(p.i * 100).toFixed(1)}% inflation`
          )
          .join('; ');
  const timingSummary = plan.withdrawalTiming === 'start' ? 'Start-year timing' : 'End-year timing';
  const estateSummary = `${formatFireMoney(plan.desiredFinalValue)} estate`;
  const eventCount = plan.oneOffEvents.length;
  const eventsSummary = `${eventCount} event${eventCount === 1 ? '' : 's'}`;
  const incomeCount = incomeStreams.length;
  const incomeSummary = `${incomeCount} income stream${incomeCount === 1 ? '' : 's'}`;
  const expenseCount = expensePhases.length;
  const expenseSummary = `${expenseCount} expense phase${expenseCount === 1 ? '' : 's'}`;
  const advancedSummaryDescription = `${ratesSummary} • ${timingSummary} • ${estateSummary} • ${eventsSummary} • ${incomeSummary} • ${expenseSummary}`;
  const activeCalculator = calculatorModeCopy[calculatorMode];
  const annualExpenseLabel =
    calculatorMode === 'fire-number'
      ? activeCalculator.primaryLabel
      : activeCalculator.secondaryLabel;
  const portfolioLabel =
    calculatorMode === 'fire-number'
      ? activeCalculator.secondaryLabel
      : activeCalculator.primaryLabel;
  const primaryPeriod = plan.ratePeriods[0] ?? { duration: 1, r: 0, i: 0 };
  const returnPercentText = rateEntry ? rateEntry.r : formatRateText(primaryPeriod.r);
  const inflationPercentText = rateEntry ? rateEntry.i : formatRateText(primaryPeriod.i);
  const fireValidation = validateFireForm({
    mode: calculatorMode,
    currentAge: timeline.currentAge,
    retirementAge: timeline.retirementAge,
    planEndAge: timeline.planEndAge,
    annualExpense: plan.annualExpense,
    initialPortfolio: plan.initialPortfolio,
    returnPercent: returnPercentText,
    inflationPercent: inflationPercentText,
    annualSavings: savingsEntry.annualSavings,
    savingsGrowthPercent: savingsEntry.savingsGrowth
  });
  const activePlanForDisplay = (hasCalculated && displayedResult) ? displayedResult.plan : plan;
  const activeResultForDisplay = (hasCalculated && displayedResult) ? displayedResult.result : result;
  const activeModeForDisplay = (hasCalculated && displayedResult) ? displayedResult.mode : calculatorMode;
  const activeSimulationForDisplay = (hasCalculated && displayedResult) ? displayedResult.simulation : currentSimulation;
  const activeTimelineForDisplay = (hasCalculated && displayedResult) ? displayedResult.timeline : timeline;

  // "When could I retire?" — computed from the calculated snapshot only (B36, OD-2).
  const retirementEstimate = useMemo(() => {
    if (!hasCalculated || !displayedResult || displayedResult.mode !== 'fire-number') return null;
    const shownPlan = displayedResult.plan;
    const shownTimeline = displayedResult.timeline;
    const first = shownPlan.ratePeriods[0] ?? { duration: 1, r: 0, i: 0 };
    const neededAt = (age: number) =>
      calculateFirePlan({ ...shownPlan, ratePeriods: fitRatePeriods(shownPlan.ratePeriods, shownTimeline.planEndAge - age) }).requiredPortfolio;
    const accumulationBase = {
      currentAge: shownTimeline.currentAge,
      currentPortfolio: shownPlan.initialPortfolio,
      annualSavings: calculatedSavings.annualSavings ?? 0,
      savingsGrowth: calculatedSavings.savingsGrowth,
      nominalReturn: first.r,
      inflation: first.i
    };
    let estimate: AccumulationResult | null = null;
    try {
      estimate = calculatedSavings.annualSavings === null
        ? null
        : estimateRetirementAge({ ...accumulationBase, planEndAge: shownTimeline.planEndAge, targetAtAge: neededAt });
    } catch {
      estimate = null;
    }
    return {
      estimate,
      returnRate: first.r,
      inflationRate: first.i,
      neededAtChosenAge: neededAt(shownTimeline.retirementAge),
      projectedAtChosenAge: calculatedSavings.annualSavings === null ? null : projectPortfolioAtAge(accumulationBase, shownTimeline.retirementAge)
    };
  }, [calculatedSavings, displayedResult, hasCalculated]);

  const withdrawalCoverage = activeResultForDisplay.maxAnnualExpense - activePlanForDisplay.annualExpense;
  const requiredWithdrawalRate =
    activeResultForDisplay.requiredPortfolio > 0 && Number.isFinite(activeResultForDisplay.requiredPortfolio)
      ? activePlanForDisplay.annualExpense / activeResultForDisplay.requiredPortfolio
      : 0;
  const portfolioWithdrawalRate =
    activePlanForDisplay.initialPortfolio > 0 ? activeResultForDisplay.maxAnnualExpense / activePlanForDisplay.initialPortfolio : 0;
  const primaryResult =
    activeModeForDisplay === 'fire-number'
      ? {
          label: 'Required FIRE number',
          value: formatFireMoney(activeResultForDisplay.requiredPortfolio),
          tone: 'accent' as const,
          detail: `${formatFireMoney(activePlanForDisplay.annualExpense)} first-year withdrawal need.`
        }
      : {
          label: 'Annual withdrawal',
          value: formatFireMoney(activeResultForDisplay.maxAnnualExpense),
          tone: 'success' as const,
          detail: `${formatPercent(portfolioWithdrawalRate)} initial withdrawal rate.`
        };
  const secondaryResult =
    activeModeForDisplay === 'fire-number'
      ? {
          label: 'Withdrawal rate',
          value: formatPercent(requiredWithdrawalRate),
          tone: 'neutral' as const
        }
      : {
          label: 'Need coverage',
          value:
            withdrawalCoverage >= 0
              ? `+${formatFireMoney(withdrawalCoverage)}`
              : formatFireMoney(withdrawalCoverage),
          tone: withdrawalCoverage >= 0 ? ('success' as const) : ('warning' as const)
        };
  const fireNumberGap = activeResultForDisplay.requiredPortfolio - activePlanForDisplay.initialPortfolio;
  const supportResult =
    activeModeForDisplay === 'fire-number'
      ? fireNumberGap > 0
        ? {
            label: 'Gap to FIRE number',
            value: formatFireMoney(fireNumberGap)
          }
        : {
            label: 'Above FIRE number',
            value: `+${formatFireMoney(Math.abs(fireNumberGap))}`
          }
      : {
          label: 'Portfolio tested',
          value: formatFireMoney(activePlanForDisplay.initialPortfolio)
        };
  const projectionRows =
    projectionBasis === 'fire-number' ? activeResultForDisplay.expenseMode.rows : activeSimulationForDisplay.rows;
  const projectionLabel =
    projectionBasis === 'fire-number'
      ? 'FIRE number projection'
      : 'Current portfolio stress test';
  const displayDuration = totalDuration(activePlanForDisplay.ratePeriods);
  const displayTimelineDuration = modeledDurationFromTimeline(activeTimelineForDisplay);
  const timelineWarnings: WarningNotice[] = [];

  if (activeTimelineForDisplay.retirementAge <= activeTimelineForDisplay.currentAge) {
    timelineWarnings.push({
      title: 'Timeline age range',
      message: 'Retirement age should be higher than current age.',
      severity: 'warning'
    });
  }

  if (activeTimelineForDisplay.planEndAge <= activeTimelineForDisplay.retirementAge) {
    timelineWarnings.push({
      title: 'Timeline duration',
      message: 'Plan end age should be higher than retirement age.',
      severity: 'critical'
    });
  }

  if (displayTimelineDuration !== displayDuration) {
    timelineWarnings.push({
      title: 'Timeline mismatch',
      message: `The age timeline implies ${displayTimelineDuration} years while market periods model ${displayDuration} years.`,
      severity: 'info'
    });
  }

  const warningNotices = [
    ...planWarnings(activePlanForDisplay, activeResultForDisplay, activeSimulationForDisplay.rows, displayDuration),
    ...timelineWarnings
  ];
  const fieldIssue = (path: string): string | undefined =>
    result.warnings.find(
      (warning) =>
        warning.path === path ||
        warning.path?.startsWith(`${path}.`) ||
        (warning.path !== undefined && path.startsWith(`${warning.path}.`))
    )?.message;
  const chartRows = projectionRows.map((row: YearResult) => ({
    year: row.year,
    balance: row.endingBalance,
    withdrawal: row.withdrawal,
    oneOff: row.oneOffAmount
  }));

  const comparisonRows = useMemo(() => {
    const basePlan = activePlanForDisplay;
    const baseResult = activeResultForDisplay;
    return scenarios.map((scenario, index) => {
      const adjustedPlan = applyScenario(basePlan, scenario);
      const adjustedResult = calculateFirePlan(adjustedPlan);
      const adjustedSimulation = stressTestCurrentPortfolio(adjustedPlan);

      return {
        id: scenario.id,
        label: scenario.label.trim() || `Scenario ${index + 1}`,
        scenario,
        requiredPortfolio: adjustedResult.requiredPortfolio,
        requiredDelta: adjustedResult.requiredPortfolio - baseResult.requiredPortfolio,
        maxAnnualExpense: adjustedResult.maxAnnualExpense,
        actualFinalBalance: adjustedSimulation.finalBalance,
        depletionYear: firstNegativeYear(adjustedSimulation.rows)
      };
    });
  }, [activePlanForDisplay, activeResultForDisplay, scenarios]);

  const markInputsChanged = () => {
    if (hasCalculated) {
      setIsStale(true);
    }
  };

  const chooseCalculatorMode = (nextMode: CalculatorMode) => {
    setCalculatorMode(nextMode);
    setHasCalculated(false);
    setIsStale(false);
    setDisplayedResult(null);
  };

  const calculateNow = () => {
    if (!fireValidation.ok) return;
    track('calculation_completed', { slug: 'fire', engine: 'fire-ts-v1', outcome: 'valid' });
    setCalculatedSavings(parseSavingsEntry(savingsEntry));
    setDisplayedResult({
      result,
      plan: { ...plan },
      mode: calculatorMode,
      simulation: currentSimulation,
      timeline: { ...timeline }
    });
    setIsStale(false);
    setHasCalculated(true);
    setCalculatorPanel('planner');
  };

  const setTimelineValue = (key: keyof TimelineInput) => (event: ChangeEvent<HTMLInputElement>) => {
    markInputsChanged();
    const value = Math.max(0, Math.trunc(numericValue(event.target.value, timeline[key])));
    const nextTimeline = { ...timeline, [key]: value };
    const nextDuration = modeledDurationFromTimeline(nextTimeline);

    setTimeline(nextTimeline);
    setPlan((current) => ({
      ...current,
      ratePeriods:
        key === 'retirementAge' || key === 'planEndAge'
          ? resizeRatePeriods(current.ratePeriods, nextDuration)
          : current.ratePeriods
    }));
  };

  const setMoney = (key: keyof Pick<PlanInput, 'annualExpense' | 'initialPortfolio' | 'desiredFinalValue'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      markInputsChanged();
      const text = event.target.value.trim();
      const parsed = text === '' ? Number.NaN : Number(text);
      setPlan((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : Number.NaN }));
    };

  const setPrimaryRate = (key: 'r' | 'i') => (event: ChangeEvent<HTMLInputElement>) => {
    markInputsChanged();
    const text = event.target.value;
    const first = plan.ratePeriods[0];
    setRateEntry((current) => ({
      r: key === 'r' ? text : current?.r ?? formatRateText(first?.r ?? 0),
      i: key === 'i' ? text : current?.i ?? formatRateText(first?.i ?? 0)
    }));
    const parsed = Number(text);
    if (text.trim() !== '' && Number.isFinite(parsed)) {
      setPlan((current) => ({ ...current, ratePeriods: updateRatePeriod(current.ratePeriods, 0, key, parsed / 100) }));
    }
  };

  const applyExampleRates = () => {
    markInputsChanged();
    setRateEntry(EXAMPLE_RATE_ENTRY);
    setPlan((current) => ({
      ...current,
      ratePeriods: updateRatePeriod(
        updateRatePeriod(current.ratePeriods, 0, 'r', Number(EXAMPLE_RATE_ENTRY.r) / 100),
        0,
        'i',
        Number(EXAMPLE_RATE_ENTRY.i) / 100
      )
    }));
  };

  const setSavingsValue = (key: keyof SavingsEntry) => (event: ChangeEvent<HTMLInputElement>) => {
    markInputsChanged();
    const text = event.target.value;
    setSavingsEntry((current) => ({ ...current, [key]: text }));
  };

  const setTiming = (timing: WithdrawalTiming) => {
    markInputsChanged();
    setPlan((current) => ({ ...current, withdrawalTiming: timing }));
  };

  const setScenarioLabel = (id: ScenarioConfig['id']) => (event: ChangeEvent<HTMLInputElement>) => {
    setScenarios((current) => updateScenario(current, id, { label: event.target.value }));
  };

  const setScenarioPercent =
    (id: ScenarioConfig['id'], key: ScenarioField) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = numericValue(event.target.value) / 100;
      setScenarios((current) =>
        current.map((scenario) =>
          scenario.id === id ? { ...scenario, [key]: value } : scenario
        )
      );
    };

  const exportSelectedProjection = () => {
    downloadCsv(
      `firecalc-${projectionBasis}-projection.csv`,
      buildProjectionCsv(projectionLabel, projectionRows)
    );
  };

  const buildSnapshot = (): AppSnapshot => ({
    accumulation: parseSavingsEntry(savingsEntry),
    calculatorMode,
    currency: fireCurrency,
    engineVersion: 'fire-ts-v1',
    plan,
    scenarios,
    schemaVersion: 2,
    seedApplications,
    timeline
  });

  // Every path that loads a saved snapshot goes through here so stored rates, savings and currency
  // are restored exactly (older snapshots simply lack the optional fields).
  const hydrateFromSnapshot = (snapshot: AppSnapshot) => {
    const nextPlan = normalizeSnapshotPlan(snapshot.plan);
    const nextTimeline = normalizeSnapshotTimeline(snapshot.timeline);
    const savings: SavingsEntry = {
      annualSavings: typeof snapshot.accumulation?.annualSavings === 'number' ? String(snapshot.accumulation.annualSavings) : '',
      savingsGrowth: snapshot.accumulation?.savingsGrowth ? formatRateText(snapshot.accumulation.savingsGrowth) : ''
    };
    setPlan(nextPlan);
    setTimeline(nextTimeline);
    setCalculatorMode(snapshot.calculatorMode ?? 'fire-number');
    setScenarios(Array.isArray(snapshot.scenarios) ? snapshot.scenarios : initialScenarios);
    setSeedApplications(Array.isArray(snapshot.seedApplications) ? snapshot.seedApplications : []);
    setRateEntry(null);
    setSavingsEntry(savings);
    setCalculatedSavings(parseSavingsEntry(savings));
    setFireCurrency(snapshot.currency === 'INR' ? 'INR' : 'USD');
    return { nextPlan, nextTimeline };
  };

  const applySnapshot = (snapshot: AppSnapshot) => {
    const { nextPlan, nextTimeline } = hydrateFromSnapshot(snapshot);
    const nextMode = snapshot.calculatorMode ?? 'fire-number';
    const nextResult = calculateFirePlan(nextPlan);
    const nextSimulation = stressTestCurrentPortfolio(nextPlan);

    setLastSeedImport(null);
    setDisplayedResult({
      result: nextResult,
      plan: nextPlan,
      mode: nextMode,
      simulation: nextSimulation,
      timeline: nextTimeline
    });
    setIsStale(false);
    setHasCalculated(true);
    setCalculatorPanel('planner');
  };

  const loadSavedPlan = (savedPlan: SavedPlan) => {
    setActivePlanId(savedPlan.id);
    setActivePlanVersionNumber(savedPlan.versionNumber ?? null);
    setSaveName(savedPlan.name);
    applySnapshot(savedPlan.snapshot);
  };

  const loadSavedPlanVersion = (planId: string, version: PlanVersionDetail) => {
    setActivePlanId(planId);
    setActivePlanVersionNumber(version.versionNumber);
    applySnapshot(version.snapshot);
  };

  const applyPlanSeed = (preview: Extract<PlanSeedPreview, { ok: true }>) => {
    setLastSeedImport({ preview, previousApplications: seedApplications });
    setPlan(preview.nextPlan);
    setTimeline(preview.nextTimeline);
    setSeedApplications(preview.applications);
    setHasCalculated(false);
    setPlanStorageMessage('Account data imported into the draft. Save a version to preserve it.');
  };

  const undoLastPlanSeed = () => {
    if (!lastSeedImport) return;

    const previous = undoPlanSeed(lastSeedImport.preview);
    setPlan(previous.plan);
    setTimeline(previous.timeline);
    setSeedApplications(lastSeedImport.previousApplications);
    setLastSeedImport(null);
    setHasCalculated(false);
    setPlanStorageMessage('Last account-data import undone.');
  };

  const updateProfileDraft = (field: keyof AccountProfileDraft, value: string) => {
    setProfileDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const saveAccountProfile = async () => {
    if (auth.status !== 'signed-in') {
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage('Saving account profile...');

    try {
      const profile = await updateAccountProfile(auth, draftToProfileUpdate(profileDraft));

      setAccountProfile(profile);
      setProfileDraft(profileToDraft(profile));
      setProfileMessage('Profile saved.');
    } catch {
      setProfileMessage('Profile could not be saved.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changeAnalyticsConsent = async (granted: boolean) => {
    if (auth.status !== 'signed-in') return;
    setIsSavingAnalyticsConsent(true);
    setAnalyticsConsentMessage('');
    try {
      const response = await authenticatedJsonRequest(auth, '/api/analytics/consent', { method: 'PUT', body: JSON.stringify({ granted }) });
      if (!response.ok) throw new Error('Could not update the analytics preference.');
      setAnalyticsConsent(granted);
      setAnalyticsConsentMessage(granted ? 'Product analytics is on. Thank you.' : 'Product analytics is off and collected records were deleted.');
    } catch (error) {
      setAnalyticsConsentMessage(error instanceof Error ? error.message : 'Could not update the analytics preference.');
    } finally {
      setIsSavingAnalyticsConsent(false);
    }
  };

  const exportAccountData = async () => {
    if (auth.status !== 'signed-in') {
      return;
    }

    setIsExportingAccountData(true);
    setAccountDataPrivacyMessage({ kind: 'info', text: 'Preparing your download…' });

    try {
      const accountExport = await loadAccountDataExport(auth);
      downloadJson(`finpath-account-data-${todayInputDate()}.json`, accountExport);
      setAccountDataPrivacyMessage({ kind: 'success', text: `Downloaded finpath-account-data-${todayInputDate()}.json. It contains your saved records, so keep it somewhere private.` });
    } catch (error) {
      setAccountDataPrivacyMessage(exportFailure(error));
    } finally {
      setIsExportingAccountData(false);
    }
  };

  const deleteAccountData = async () => {
    if (auth.status !== 'signed-in') {
      return;
    }

    if (accountDataDeleteConfirmation.trim() !== ACCOUNT_DATA_DELETE_CONFIRMATION) {
      setAccountDataPrivacyMessage({ kind: 'error', text: `Type ${ACCOUNT_DATA_DELETE_CONFIRMATION} to confirm deletion.` });
      return;
    }

    setIsDeletingAccountData(true);
    setAccountDataPrivacyMessage({ kind: 'info', text: 'Deleting your FinPath data…' });

    try {
      const deletionBody = await deleteAccountDataRecord(auth, accountDataDeleteConfirmation.trim());
      const outcome = summarizeDeletion(deletionBody);
      if (outcome.kind !== 'success') {
        setAccountDataPrivacyMessage(outcome);
        return;
      }
      clearLocalDrafts();
      setAccountProfile(null);
      setProfileDraft(emptyProfileDraft());
      setProfileMessage('Profile data was deleted.');
      setSavedPlans([]);
      setActivePlanId(null);
      setSeedApplications([]);
      setLastSeedImport(null);
      setPlanStorageMessage('Account plans were deleted.');
      setFinancialAccounts([]);
      setAccountDraft(emptyAccountDraft());
      setBalanceDrafts({});
      setAccountMessage('Account data was deleted.');
      setTransactions([]);
      setTransactionSummary(emptyTransactionSummary());
      setTransactionDraft(emptyTransactionDraft());
      setTransactionUpdateDrafts({});
      setTransactionFilters(emptyTransactionFilters());
      setTransactionMessage('Transaction data was deleted.');
      setGoals([]);
      setGoalSummary(summarizeGoalList([]));
      setGoalDraft(emptyGoalDraft());
      setGoalUpdateDrafts({});
      setGoalMessage('Goal data was deleted.');
      setSavedCalculatorResults([]);
      setCalculatorResultMessage('Saved calculator results were deleted.');
      setAccountDataDeleteConfirmation('');
      setAccountDataPrivacyMessage(outcome);
    } catch (error) {
      setAccountDataPrivacyMessage(deletionFailure(error));
    } finally {
      setIsDeletingAccountData(false);
    }
  };

  const updateAccountDraft = (field: keyof AccountDraft, value: string) => {
    if (field === 'accountType') {
      if (!isFinancialAccountType(value)) {
        return;
      }

      setAccountDraft((current) => ({
        ...current,
        accountType: value
      }));
      return;
    }

    setAccountDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateBalanceDraft = (id: string, field: keyof BalanceDraft, value: string) => {
    setBalanceDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? emptyBalanceDraft()),
        [field]: value
      }
    }));
  };

  const createFinancialAccount = async () => {
    if (auth.status !== 'signed-in') {
      return;
    }

    if (accountDraft.name.trim().length === 0) {
      setAccountMessage('Account name is required.');
      return;
    }

    if (accountDraft.balanceAmount.trim() && moneyInputToCents(accountDraft.balanceAmount) === null) {
      setAccountMessage('Balance must be a dollar amount with up to two decimals.');
      return;
    }

    setIsSavingAccount(true);
    setAccountMessage('Saving account...');

    try {
      const account = await createFinancialAccountRecord(auth, accountDraft);
      const nextAccounts = [account, ...financialAccounts.filter((item) => item.id !== account.id)];

      setFinancialAccounts(nextAccounts);
      setBalanceDrafts((current) => ({
        ...current,
        [account.id]: emptyBalanceDraft()
      }));
      setAccountDraft(emptyAccountDraft());
      setAccountMessage('Account saved.');
    } catch {
      setAccountMessage('Account could not be saved.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const recordAccountBalance = async (id: string) => {
    if (auth.status !== 'signed-in') {
      return;
    }

    const draft = balanceDrafts[id] ?? emptyBalanceDraft();

    if (moneyInputToCents(draft.amount) === null) {
      setAccountMessage('Balance must be a dollar amount with up to two decimals.');
      return;
    }

    setIsSavingAccount(true);
    setAccountMessage('Recording balance...');

    try {
      const account = await addFinancialAccountBalanceRecord(auth, id, draft);

      setFinancialAccounts((current) => current.map((item) => (item.id === account.id ? account : item)));
      setBalanceDrafts((current) => ({
        ...current,
        [account.id]: emptyBalanceDraft()
      }));
      setAccountMessage('Balance recorded.');
    } catch {
      setAccountMessage('Balance could not be recorded.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const refreshAccountsAfterImport = async () => {
    if (auth.status !== 'signed-in') return;

    setIsLoadingAccounts(true);
    try {
      const { accounts } = await loadFinancialAccounts(auth);
      setFinancialAccounts(accounts);
      setBalanceDrafts(buildBalanceDraftMap(accounts));
      setAccountMessage('Imported balances are synced.');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const archiveFinancialAccount = async (id: string) => {
    if (auth.status !== 'signed-in') {
      return;
    }

    setIsSavingAccount(true);
    setAccountMessage('Archiving account...');

    try {
      await archiveFinancialAccountRecord(auth, id);
      setFinancialAccounts((current) => current.filter((item) => item.id !== id));
      setBalanceDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setAccountMessage('Account archived.');
    } catch {
      setAccountMessage('Account could not be archived.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const updateTransactionDraft = (field: keyof TransactionDraft, value: string) => {
    if (field === 'transactionType') {
      if (!isTransactionType(value)) {
        return;
      }

      setTransactionDraft((current) => ({
        ...current,
        transactionType: value
      }));
      return;
    }

    setTransactionDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateTransactionFilter = (field: keyof TransactionFilters, value: string) => {
    if (field === 'transactionType') {
      if (value !== 'all' && !isTransactionType(value)) {
        return;
      }

      setTransactionFilters((current) => ({
        ...current,
        transactionType: value
      }));
      return;
    }

    setTransactionFilters((current) => ({
      ...current,
      [field]: value
    }));
  };

  const clearTransactionFilters = () => {
    setTransactionFilters(emptyTransactionFilters());
  };

  const refreshTransactionsAfterImport = async () => {
    if (auth.status !== 'signed-in') return;

    setIsLoadingTransactions(true);
    try {
      const { summary, transactions: loadedTransactions } = await loadTransactions(auth);
      setTransactions(loadedTransactions);
      setTransactionSummary(summary);
      setTransactionUpdateDrafts(buildTransactionDraftMap(loadedTransactions));
      setTransactionMessage('Imported transactions are synced.');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const updateTransactionUpdateDraft = (
    id: string,
    field: keyof TransactionDraft,
    value: string
  ) => {
    if (field === 'transactionType') {
      if (!isTransactionType(value)) {
        return;
      }

      setTransactionUpdateDrafts((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? emptyTransactionDraft()),
          transactionType: value
        }
      }));
      return;
    }

    setTransactionUpdateDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? emptyTransactionDraft()),
        [field]: value
      }
    }));
  };

  const createTransaction = async () => {
    if (auth.status !== 'signed-in') {
      return;
    }

    if (transactionDraft.description.trim().length === 0) {
      setTransactionMessage('Description is required.');
      return;
    }

    const amountCents = moneyInputToCents(transactionDraft.amount);

    if (amountCents === null || amountCents <= 0) {
      setTransactionMessage('Amount must be greater than zero with up to two decimal places.');
      return;
    }

    setIsSavingTransaction(true);
    setTransactionMessage('Saving transaction...');

    try {
      const transaction = await createTransactionRecord(auth, transactionDraft);
      const nextTransactions = [transaction, ...transactions.filter((item) => item.id !== transaction.id)];

      setTransactions(nextTransactions);
      setTransactionSummary(summarizeTransactionList(nextTransactions));
      setTransactionUpdateDrafts((current) => ({
        ...current,
        [transaction.id]: transactionToDraft(transaction)
      }));
      setTransactionDraft(emptyTransactionDraft());
      setTransactionMessage('Transaction saved.');
    } catch (error) {
      setTransactionMessage(error instanceof Error ? error.message : 'Transaction could not be saved.');
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const updateTransaction = async (id: string) => {
    if (auth.status !== 'signed-in') {
      return;
    }

    const draft = transactionUpdateDrafts[id];

    if (!draft) {
      setTransactionMessage('Transaction update could not be prepared.');
      return;
    }

    if (draft.description.trim().length === 0) {
      setTransactionMessage('Description is required.');
      return;
    }

    const amountCents = moneyInputToCents(draft.amount);

    if (amountCents === null || amountCents <= 0) {
      setTransactionMessage('Amount must be greater than zero with up to two decimal places.');
      return;
    }

    setIsSavingTransaction(true);
    setTransactionMessage('Saving transaction changes...');

    try {
      const transaction = await updateTransactionRecord(auth, id, draft);
      const nextTransactions = transactions
        .map((item) => (item.id === transaction.id ? transaction : item))
        .sort((left, right) =>
          right.transactionDate.localeCompare(left.transactionDate) || right.createdAt.localeCompare(left.createdAt)
        );

      setTransactions(nextTransactions);
      setTransactionSummary(summarizeTransactionList(nextTransactions));
      setTransactionUpdateDrafts((current) => ({
        ...current,
        [transaction.id]: transactionToDraft(transaction)
      }));
      setTransactionMessage('Transaction updated.');
    } catch (error) {
      setTransactionMessage(error instanceof Error ? error.message : 'Transaction could not be updated.');
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const archiveTransaction = async (id: string) => {
    if (auth.status !== 'signed-in') {
      return;
    }

    setIsSavingTransaction(true);
    setTransactionMessage('Removing transaction...');

    try {
      await archiveTransactionRecord(auth, id);
      const nextTransactions = transactions.filter((item) => item.id !== id);

      setTransactions(nextTransactions);
      setTransactionSummary(summarizeTransactionList(nextTransactions));
      setTransactionUpdateDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setTransactionMessage('Transaction removed.');
    } catch {
      setTransactionMessage('Transaction could not be removed.');
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const updateGoalDraft = (field: keyof GoalDraft, value: string) => {
    if (field === 'goalType') {
      if (!isGoalType(value)) {
        return;
      }

      setGoalDraft((current) => ({
        ...current,
        goalType: value
      }));
      return;
    }

    setGoalDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateGoalUpdateDraft = (
    id: string,
    field: keyof GoalUpdateDraft,
    value: string
  ) => {
    if (field === 'status') {
      if (!isGoalStatus(value)) {
        return;
      }

      setGoalUpdateDrafts((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? {
            currentAmount: '',
            status: 'active',
            targetAmount: '',
            targetDate: ''
          }),
          status: value
        }
      }));
      return;
    }

    setGoalUpdateDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          currentAmount: '',
          status: 'active',
          targetAmount: '',
          targetDate: ''
        }),
        [field]: value
      }
    }));
  };

  const createGoal = async () => {
    if (auth.status !== 'signed-in') {
      return;
    }

    if (goalDraft.name.trim().length === 0) {
      setGoalMessage('Goal name is required.');
      return;
    }

    const targetAmountCents = moneyInputToCents(goalDraft.targetAmount);

    if (targetAmountCents === null || targetAmountCents <= 0) {
      setGoalMessage('Enter a target amount greater than zero with up to two decimal places.');
      return;
    }

    if (goalDraft.currentAmount.trim() && moneyInputToCents(goalDraft.currentAmount) === null) {
      setGoalMessage('Current amount must use up to two decimal places.');
      return;
    }

    setIsSavingGoal(true);
    setGoalMessage('Saving goal...');

    try {
      const goal = await createGoalRecord(auth, goalDraft);
      const nextGoals = [goal, ...goals.filter((item) => item.id !== goal.id)];

      setGoals(nextGoals);
      setGoalSummary(summarizeGoalList(nextGoals));
      setGoalUpdateDrafts((current) => ({
        ...current,
        [goal.id]: goalToUpdateDraft(goal)
      }));
      setGoalDraft(emptyGoalDraft());
      setGoalMessage('Goal saved.');
    } catch {
      setGoalMessage('Goal could not be saved.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const updateGoal = async (id: string) => {
    if (auth.status !== 'signed-in') {
      return;
    }

    const draft = goalUpdateDrafts[id];

    if (!draft) {
      setGoalMessage('Goal update could not be prepared.');
      return;
    }

    if (draft.currentAmount.trim() && moneyInputToCents(draft.currentAmount) === null) {
      setGoalMessage('Current amount must use up to two decimal places.');
      return;
    }

    const targetAmountCents = moneyInputToCents(draft.targetAmount);

    if (targetAmountCents === null || targetAmountCents <= 0) {
      setGoalMessage('Enter a target amount greater than zero with up to two decimal places.');
      return;
    }

    setIsSavingGoal(true);
    setGoalMessage('Saving goal changes...');

    try {
      const goal = await updateGoalRecord(auth, id, draft);
      const nextGoals = goals.map((item) => (item.id === goal.id ? goal : item));

      setGoals(nextGoals);
      setGoalSummary(summarizeGoalList(nextGoals));
      setGoalUpdateDrafts((current) => ({
        ...current,
        [goal.id]: goalToUpdateDraft(goal)
      }));
      setGoalMessage('Goal updated.');
    } catch {
      setGoalMessage('Goal could not be updated.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const archiveGoal = async (id: string) => {
    if (auth.status !== 'signed-in') {
      return;
    }

    setIsSavingGoal(true);
    setGoalMessage('Archiving goal...');

    try {
      await archiveGoalRecord(auth, id);
      const nextGoals = goals.filter((item) => item.id !== id);

      setGoals(nextGoals);
      setGoalSummary(summarizeGoalList(nextGoals));
      setGoalUpdateDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setGoalMessage('Goal archived.');
    } catch {
      setGoalMessage('Goal could not be archived.');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const saveCalculatorResult = async (request: CalculatorSaveRequest): Promise<CalculatorSaveOutcome> => {
    if (auth.status !== 'signed-in') {
      throw new Error('Sign in before saving calculator results.');
    }

    setCalculatorResultMessage('Saving calculator result...');

    try {
      const saved = await saveCoordinatorRef.current.executeSave(
        auth,
        request,
        (currentAuth, requestSnapshot, idempotencyKey) =>
          createCalculatorResultRecord(currentAuth, requestSnapshot, idempotencyKey)
      );
      const nextSavedResults = [
        saved.savedResult,
        ...savedCalculatorResults.filter((item) => item.id !== saved.savedResult.id)
      ].slice(0, 12);

      setSavedCalculatorResults(nextSavedResults);

      if (saved.createdEntity?.type === 'goal') {
        const goal = toGoal(saved.createdEntity.entity);

        if (goal) {
          const nextGoals = [goal, ...goals.filter((item) => item.id !== goal.id)];
          setGoals(nextGoals);
          setGoalSummary(summarizeGoalList(nextGoals));
          setGoalUpdateDrafts((current) => ({
            ...current,
            [goal.id]: goalToUpdateDraft(goal)
          }));
          setGoalMessage('Goal draft created from calculator result.');
        }
      }

      if (saved.createdEntity?.type === 'account') {
        const account = toFinancialAccount(saved.createdEntity.entity);

        if (account) {
          const nextAccounts = [account, ...financialAccounts.filter((item) => item.id !== account.id)];
          setFinancialAccounts(nextAccounts);
          setBalanceDrafts((current) => ({
            ...current,
            [account.id]: emptyBalanceDraft()
          }));
          setAccountMessage('Account draft created from calculator result.');
        }
      }

      if (saved.createdEntity?.type === 'plan') {
        setPlanStorageMessage('Plan draft created from calculator result.');
      }

      const message = calculatorSaveMessage(saved);
      setCalculatorResultMessage(message);

      return {
        destinationRoute: saved.savedResult.conversionRoute,
        message,
        savedResultId: saved.savedResult.id
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save calculator result.';
      setCalculatorResultMessage(message);
      throw error;
    }
  };

  const saveCurrentPlan = async () => {
    if (!fireValidation.ok) {
      setPlanStorageMessage('Complete the highlighted FIRE fields before saving.');
      return;
    }
    track('decision_save_attempted', { family: 'fire', destination: auth.status === 'signed-in' ? 'account' : 'browser' });
    const name = saveName.trim() || 'Retirement plan';
    const snapshot = buildSnapshot();

    if (auth.status === 'signed-in') {
      const activePlan = savedPlans.find((item) => item.id === activePlanId) ?? null;

      setIsSavingPlan(true);
      setPlanStorageMessage(activePlan ? 'Saving a new account version...' : 'Saving a new account plan...');

      try {
        const savedPlan = activePlan
          ? await updateAccountPlan(auth, activePlan.id, {
              expectedVersionNumber: activePlan.versionNumber,
              goalId: activePlan.goalId ?? null,
              label: `Calculator update ${new Date().toLocaleDateString()}`,
              name,
              notes: 'Saved from the FIRE calculator.',
              result,
              snapshot
            })
          : await createAccountPlan(auth, {
              goalId: null,
              label: 'Calculator draft',
              name,
              notes: 'Created from the FIRE calculator.',
              result,
              snapshot
            });

        setSavedPlans((current) => [savedPlan, ...current.filter((item) => item.id !== savedPlan.id)].slice(0, 8));
        setActivePlanId(savedPlan.id);
        setActivePlanVersionNumber(savedPlan.versionNumber ?? null);
        setSaveName(savedPlan.name);
        setPlanStorageMessage(activePlan ? `Version ${savedPlan.versionNumber} saved to your account.` : 'New plan saved to your account.');
      } catch (error) {
        setPlanStorageMessage(planErrorMessage(error));
      } finally {
        setIsSavingPlan(false);
      }

      return;
    }

    const savedPlan: SavedPlan = {
      id: `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      snapshot
    };
    const nextPlans = [savedPlan, ...savedPlans.filter((item) => item.name !== name)].slice(0, 8);
    setSavedPlans(nextPlans);
    writeSavedPlans(nextPlans);
    setPlanStorageMessage('Saved in this browser.');
  };

  const savePlanningPlan = async (
    mode: 'new-plan' | 'new-version',
    draft: PlanningSaveDraft
  ) => {
    if (auth.status !== 'signed-in') return;
    if (!fireValidation.ok) {
      setPlanStorageMessage('Complete the highlighted FIRE fields in the calculator before saving a version.');
      return;
    }
    track('decision_save_attempted', { family: 'fire', destination: 'account' });

    const name = draft.name.trim() || 'Retirement plan';
    const snapshot = buildSnapshot();
    const activePlan = savedPlans.find((item) => item.id === activePlanId) ?? null;

    if (mode === 'new-version' && !activePlan) {
      setPlanStorageMessage('Open or create a plan before saving a new version.');
      return;
    }

    setIsSavingPlan(true);
    setPlanStorageMessage(mode === 'new-version' ? 'Saving immutable version...' : 'Creating account plan...');

    try {
      const payload = {
        goalId: draft.goalId,
        label: draft.label.trim() || null,
        name,
        notes: draft.notes.trim() || null,
        result,
        snapshot
      };
      const savedPlan = mode === 'new-version' && activePlan
        ? await updateAccountPlan(auth, activePlan.id, {
            ...payload,
            expectedVersionNumber: activePlan.versionNumber
          })
        : await createAccountPlan(auth, payload);

      setSavedPlans((current) => [savedPlan, ...current.filter((item) => item.id !== savedPlan.id)].slice(0, 8));
      setActivePlanId(savedPlan.id);
      setActivePlanVersionNumber(savedPlan.versionNumber ?? null);
      setSaveName(savedPlan.name);
      setPlanStorageMessage(mode === 'new-version' ? `Version ${savedPlan.versionNumber} saved.` : 'New plan created.');
    } catch (error) {
      setPlanStorageMessage(planErrorMessage(error));

      if (error instanceof PlanRequestError && error.status === 409) {
        loadAccountPlans(auth).then(setSavedPlans).catch(() => undefined);
      }
    } finally {
      setIsSavingPlan(false);
    }
  };

  const removeSavedPlan = async (id: string) => {
    if (auth.status === 'signed-in') {
      setIsSavingPlan(true);
      setPlanStorageMessage('Deleting account plan...');

      try {
        await deleteAccountPlan(auth, id);
        setSavedPlans((current) => current.filter((item) => item.id !== id));
        if (activePlanId === id) {
          setActivePlanId(null);
          setActivePlanVersionNumber(null);
        }
        setPlanStorageMessage('Plan archived in your account.');
      } catch {
        setPlanStorageMessage('Plan could not be archived in your account.');
      } finally {
        setIsSavingPlan(false);
      }

      return;
    }

    const nextPlans = savedPlans.filter((item) => item.id !== id);
    setSavedPlans(nextPlans);
    writeSavedPlans(nextPlans);
    setPlanStorageMessage('Deleted local browser draft.');
  };

  const exportPlanJson = () => {
    downloadJson('firecalc-plan.json', buildSnapshot());
  };

  const importPlanJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snapshot = isAppSnapshot(parsed) ? parsed : isRecord(parsed) && isAppSnapshot(parsed.snapshot) ? parsed.snapshot : null;

      if (snapshot) {
        applySnapshot(snapshot);
      }
    } catch {
      // Invalid user-imported files are ignored; field validation handles imported snapshots.
    } finally {
      event.target.value = '';
    }
  };

  const addPeriod = () => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      ratePeriods: [...current.ratePeriods, { duration: 10, r: 0, i: 0 }]
    }));
  };

  const removePeriod = (index: number) => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      ratePeriods:
        current.ratePeriods.length === 1
          ? current.ratePeriods
          : current.ratePeriods.filter((_, periodIndex) => periodIndex !== index)
    }));
  };

  const addEvent = () => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      oneOffEvents: [...current.oneOffEvents, { year: 1, amount: 0, label: '' }]
    }));
  };

  const removeEvent = (index: number) => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      oneOffEvents: current.oneOffEvents.filter((_, eventIndex) => eventIndex !== index)
    }));
  };

  const addRecurringCashFlow = (kind: RecurringCashFlow['kind']) => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      recurringCashFlows: [
        ...(current.recurringCashFlows ?? []),
        {
          kind,
          startYear: 1,
          endYear: duration,
          amount: 0,
          label: '',
          inflationAdjusted: true
        }
      ]
    }));
  };

  const resetToFreshPlan = () => {
    markInputsChanged();
    setPlan(initialPlan);
    setTimeline(initialTimeline);
    setRateEntry(EMPTY_RATE_ENTRY);
    setSavingsEntry(EMPTY_SAVINGS_ENTRY);
    setActivePlanId(null);
    setActivePlanVersionNumber(null);
    setSaveName('Retirement base');
    setHasCalculated(false);
    setIsStale(false);
    setDisplayedResult(null);
    setPlanStorageMessage('Reset to clean baseline.');
  };

  const updateRecurringCashFlow = (index: number, updates: Partial<RecurringCashFlow>) => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      recurringCashFlows: (current.recurringCashFlows ?? []).map((flow, flowIndex) =>
        flowIndex === index ? { ...flow, ...updates } : flow
      )
    }));
  };

  const removeRecurringCashFlow = (index: number) => {
    markInputsChanged();
    setPlan((current) => ({
      ...current,
      recurringCashFlows: (current.recurringCashFlows ?? []).filter((_, flowIndex) => flowIndex !== index)
    }));
  };

  const performNavigateTo = useCallback(
    (nextRoute: AppRoute | string) => {
      setIsPlanningWorkspaceDirty(false);
      setPendingNavigation(null);

      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', nextRoute);
        window.scrollTo({ top: 0, left: 0 });
      }

      const baseRoute = normalizeRoute(nextRoute.split('?')[0]);
      setRoute(baseRoute);
      setIsMenuOpen(false);

      if (baseRoute === '/plans') {
        const deepLink = parsePlanDeepLink(nextRoute);
        const action = resolvePlansRouteAction(deepLink);
        if (action === 'keep-active-plan') {
          setPlanDeepLinkError(null);
        } else {
          void loadPlanDeepLinkTarget(deepLink.planId ?? '', deepLink.versionNumber, action === 'invalid-version');
        }
      }
    },
    [loadPlanDeepLinkTarget]
  );

  const navigateTo = (nextRoute: AppRoute | string) => {
    if (route === '/plans' && isPlanningWorkspaceDirty) {
      setPendingNavigation({ nextRoute, isPopState: false });
      return;
    }
    performNavigateTo(nextRoute);
  };

  const navigate = (nextPanel: CalculatorPanel) => {
    if (nextPanel === 'compare') track('comparison_viewed', { family: 'fire' });
    setCalculatorPanel(nextPanel);
    setIsMenuOpen(false);
  };

  return (
    <div className="app" data-mode={mode}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <a
          href="/"
          className="brand"
          onClick={(event) => handleNavigationAnchorClick(event, '/', navigateTo)}
        >
          <PiggyBank size={26} />
          <span>FinPath</span>
        </a>

        <DesktopNavigation authStatus={auth.status} route={route} onNavigate={navigateTo} />

        <div className="topbar-actions">
          <TopbarAuthActions auth={auth} onNavigate={navigateTo} />
          <button
            className="icon-button"
            type="button"
            aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-pressed={mode === 'dark'}
            onClick={() => setMode((current) => (current === 'light' ? 'dark' : 'light'))}
          >
            {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            ref={mobileMenuButtonRef}
            className="icon-button mobile-menu-button"
            type="button"
            aria-controls="mobile-primary-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <nav className="mobile-nav" id="mobile-primary-navigation" aria-label="Mobile primary">
          <span className="mobile-nav-heading">{auth.isSignedIn ? 'Plan' : 'Explore'}</span>
          {primaryNavigationFor(auth.status).map((item) => {
              const Icon = navigationIconByPath[item.path];
              const isActive = activeNavigationPath(route, primaryNavigationFor(auth.status)) === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={isActive ? 'nav-button active' : 'nav-button'}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(event) => handleNavigationAnchorClick(event, item.path, navigateTo)}
                >
                  <Icon size={17} />
                  {item.label}
                </a>
              );
            })}
          <details className="mobile-nav-group">
            <summary>
              <FolderKanban size={17} />
              Workspace
              <ChevronDown size={16} />
            </summary>
            <div>
              {workspaceNavigation.map((item) => {
                const Icon = navigationIconByPath[item.path];
                const isActive = activeNavigationPath(route, workspaceNavigation) === item.path;
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    className={isActive ? 'nav-button active' : 'nav-button'}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(event) => handleNavigationAnchorClick(event, item.path, navigateTo)}
                  >
                    <Icon size={17} />
                    {item.label}
                  </a>
                );
              })}
            </div>
          </details>
          {auth.isSignedIn ? (
            <>
              <SignOutControl redirectUrl="/">
                <button className="nav-button mobile-cta">
                  <LogOut size={17} />
                  Sign out
                </button>
              </SignOutControl>
            </>
          ) : auth.status === 'loading' ? (
            <button className="nav-button mobile-cta" disabled>
              <LogIn size={17} />
              Checking session
            </button>
          ) : (
            <>
              <AuthActionButton
                auth={auth}
                kind="sign-in"
                className="nav-button mobile-cta"
                onUnavailable={() => navigateTo('/dashboard')}
              >
                <LogIn size={17} />
                Sign in
              </AuthActionButton>
              <AuthActionButton
                auth={auth}
                kind="sign-up"
                className="nav-button mobile-cta"
                onUnavailable={() => navigateTo('/dashboard')}
              >
                <UserCircle size={17} />
                Create account
              </AuthActionButton>
            </>
          )}
        </nav>
      )}

      <main
        id="main-content"
        ref={mainRef}
        className={route === '/' ? 'workspace landing-workspace' : 'workspace'}
        tabIndex={-1}
      >
        {route === '/' ? (
          <LandingPage auth={auth} onNavigate={navigateTo} />
        ) : route === '/calculators' || (route.startsWith('/calculators/') && route !== '/calculators/fire') ? (
          <Suspense
            fallback={
              <section className="route-shell" aria-label="Calculator library loading" aria-busy="true">
                <p className="empty-inline">Loading calculator library...</p>
              </section>
            }
          >
            <CalculatorLibrary
              auth={auth}
              route={route}
              savedResults={savedCalculatorResults}
              onNavigate={(nextRoute) => navigateTo(normalizeRoute(nextRoute))}
              onSaveResult={saveCalculatorResult}
            />
          </Suspense>
        ) : isPlatformRoute(route) ? (
          auth.isSignedIn ? (
            route === '/plans' ? (
              <section className="route-shell" aria-labelledby="plans-title">
                <div className="route-heading">
                  <p className="eyebrow">Planning workspace</p>
                  <h1 id="plans-title">Build a plan you can revisit.</h1>
                  <p>Import selected account facts, preserve assumptions as immutable versions, and compare how the plan changes over time.</p>
                </div>
                <SignedInProfileBand auth={auth} />
                <Suspense
                  fallback={
                    <section className="panel planning-loading-panel" aria-label="Planning workspace loading" aria-busy="true">
                      <p className="empty-inline">Loading planning workspace...</p>
                    </section>
                  }
                >
                  <PlanningWorkspace
                    accounts={financialAccounts}
                    activePlanId={activePlanId}
                    auth={auth}
                    canUndoSeed={Boolean(lastSeedImport)}
                    currentPlan={plan}
                    currentResult={result}
                    currentSnapshot={buildSnapshot()}
                    currentTimeline={timeline}
                    normalizeSnapshotPlan={normalizeSnapshotPlan}
                    normalizeSnapshotTimeline={normalizeSnapshotTimeline}
                    deepLinkError={planDeepLinkError}
                    goals={goals}
                    isLoading={isLoadingSavedPlans}
                    isSaving={isSavingPlan}
                    loadedVersionNumber={activePlanVersionNumber}
                    message={planStorageMessage}
                    onApplySeed={applyPlanSeed}
                    onArchive={removeSavedPlan}
                    onClearDeepLinkError={() => {
                      setPlanDeepLinkError(null);
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', '/plans');
                      }
                    }}
                    onDirtyStateChange={setIsPlanningWorkspaceDirty}
                    onLoadPlan={loadSavedPlan}
                    onLoadVersion={loadSavedPlanVersion}
                    onNavigateCalculator={() => navigateTo('/calculators/fire')}
                    onReviewSaved={refreshDueReviews}
                    onSave={savePlanningPlan}
                    onUndoSeed={undoLastPlanSeed}
                    plans={savedPlans}
                    profile={accountProfile}
                  />
                </Suspense>
              </section>
            ) : (
              <Suspense
                fallback={
                  <section className="route-shell" aria-busy="true">
                    <p className="empty-inline" role="status">Loading your workspace…</p>
                  </section>
                }
              >
                <PlatformPage
                  accountDraft={accountDraft}
                  accountMessage={accountMessage}
                  accountSummary={accountSummary}
                  transactionDraft={transactionDraft}
                  transactionCashflow={transactionCashflow}
                  calculatorResultMessage={calculatorResultMessage}
                  transactionCategoryOptions={transactionCategoryOptions}
                  transactionFilters={transactionFilters}
                  transactionMessage={transactionMessage}
                  transactionSummary={transactionSummary}
                  visibleTransactionSummary={filteredTransactionSummary}
                  transactions={filteredTransactions}
                  transactionUpdateDrafts={transactionUpdateDrafts}
                  balanceDrafts={balanceDrafts}
                  auth={auth}
                  dueReviews={dueReviews}
                  dueReviewsError={dueReviewsError}
                  financialAccounts={financialAccounts}
                  financialInsights={financialInsights}
                  reportScope={reportScope}
                analyticsConsent={analyticsConsent}
                isSavingAnalyticsConsent={isSavingAnalyticsConsent}
                analyticsConsentMessage={analyticsConsentMessage}
                onAnalyticsConsentChange={changeAnalyticsConsent}
                  goalDraft={goalDraft}
                  isLoadingDueReviews={isLoadingDueReviews}
                  onRetryDueReviews={refreshDueReviews}
                  plans={savedPlans}
                  goalMessage={goalMessage}
                  goals={goals}
                  goalSummary={goalSummary}
                  goalUpdateDrafts={goalUpdateDrafts}
                  isLoadingAccounts={isLoadingAccounts}
                  isLoadingCalculatorResults={isLoadingCalculatorResults}
                  isLoadingTransactions={isLoadingTransactions}
                  isLoadingGoals={isLoadingGoals}
                  isLoadingProfile={isLoadingProfile}
                  isSavingAccount={isSavingAccount}
                  isSavingTransaction={isSavingTransaction}
                  isSavingGoal={isSavingGoal}
                  isSavingProfile={isSavingProfile}
                  accountDataDeleteConfirmation={accountDataDeleteConfirmation}
                  accountDataPrivacyMessage={accountDataPrivacyMessage}
                  profile={accountProfile}
                  profileDraft={profileDraft}
                  profileMessage={profileMessage}
                  route={route}
                  savedCalculatorResults={savedCalculatorResults}
                  isDeletingAccountData={isDeletingAccountData}
                  isExportingAccountData={isExportingAccountData}
                  onNavigate={navigateTo}
                  onAccountDataDelete={deleteAccountData}
                  onAccountDataDeleteConfirmationChange={setAccountDataDeleteConfirmation}
                  onAccountDataExport={exportAccountData}
                  onAccountDraftChange={updateAccountDraft}
                  onArchiveAccount={archiveFinancialAccount}
                  onArchiveTransaction={archiveTransaction}
                  onBalanceDraftChange={updateBalanceDraft}
                  onCreateAccount={createFinancialAccount}
                  onCreateTransaction={createTransaction}
                  onCreateGoal={createGoal}
                  onGoalDraftChange={updateGoalDraft}
                  onGoalUpdateDraftChange={updateGoalUpdateDraft}
                  onImportComplete={refreshAccountsAfterImport}
                  onProfileDraftChange={updateProfileDraft}
                  onProfileSave={saveAccountProfile}
                  onRecordBalance={recordAccountBalance}
                  onArchiveGoal={archiveGoal}
                  onTransactionDraftChange={updateTransactionDraft}
                  onTransactionFilterChange={updateTransactionFilter}
                  onTransactionFiltersClear={clearTransactionFilters}
                  onTransactionImportComplete={refreshTransactionsAfterImport}
                  onTransactionUpdateDraftChange={updateTransactionUpdateDraft}
                  onUpdateTransaction={updateTransaction}
                  onUpdateGoal={updateGoal}
                />
              </Suspense>
            )
          ) : (
            <AuthGate auth={auth} route={route} onNavigate={navigateTo} />
          )
        ) : (
          <>
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <button onClick={() => navigateTo('/calculators')}>Calculators</button>
          <ChevronRight size={15} />
          <button onClick={() => navigateTo('/calculators/fire')}>FIRE Calculator</button>
        </nav>

        <section className="calculator-intro" aria-labelledby="fire-title">
          <div>
            <p className="eyebrow">Calculator module</p>
            <h1 id="fire-title">FIRE Calculator</h1>
            <p className="calculator-scope-note">
              Answer one retirement planning question at a time. Plan retirement portfolio targets or test sustainable annual withdrawals across customizable inflation and market regimes.
            </p>
          </div>
          <span className="pill">{activeCalculator.shortTitle}</span>
        </section>

        {activeSavedPlan ? (
          <aside className="plan-context-bar" data-testid="calculator-plan-context" role="region" aria-label="Loaded plan context">
            <div className="plan-context-info">
              <FolderKanban size={18} aria-hidden="true" />
              <span>Editing assumptions for plan: <strong>{activeSavedPlan.name}</strong> (Version {activeSavedPlan.versionNumber})</span>
            </div>
            <div className="plan-context-actions">
              <button
                type="button"
                className="secondary-button icon-text-button"
                onClick={() => navigateTo('/plans')}
              >
                Back to Planning Workspace
                <ArrowRight size={16} />
              </button>
            </div>
          </aside>
        ) : null}

        <section className="quick-calculator focused-calculator" aria-labelledby="quick-calculator-title">
          <div className="panel-heading quick-heading">
            <div>
              <p className="eyebrow">{activeCalculator.eyebrow}</p>
              <h2 id="quick-calculator-title">{activeCalculator.title}</h2>
            </div>
            <span className="pill">{duration} years</span>
          </div>

          <div className="form-grid quick-form core-fire-form">
            <div className="field full-field">
              <span className="field-label">
                Planning question
                <InfoTip
                  id="fire-planning-question-help"
                  text="Choose FIRE number to solve for a portfolio target, or withdrawal to solve for annual spending from a portfolio."
                  label="Planning question"
                />
              </span>
              <div className="segmented">
                <button
                  className={calculatorMode === 'fire-number' ? 'active' : ''}
                  onClick={() => chooseCalculatorMode('fire-number')}
                >
                  FIRE number
                </button>
                <button
                  className={calculatorMode === 'withdrawal-income' ? 'active' : ''}
                  onClick={() => chooseCalculatorMode('withdrawal-income')}
                >
                  Withdrawal
                </button>
              </div>
            </div>

            <div className="full-field example-values-note" role="note">
              <Info size={16} aria-hidden="true" />
              <span>
                {calculatorMode === 'fire-number' ? (
                  <>
                    <strong>Starting example values:</strong> {formatFireMoney(initialPlan.annualExpense)} annual spending and {formatFireMoney(initialPlan.initialPortfolio)} current portfolio are starting examples, not personalized recommendations. Replace with your own numbers before calculating.
                  </>
                ) : (
                  <>
                    <strong>Starting example values:</strong> {formatFireMoney(initialPlan.initialPortfolio)} portfolio and {formatFireMoney(initialPlan.annualExpense)} spending benchmark are starting examples, not personalized recommendations. Replace with your own numbers before calculating.
                  </>
                )}
              </span>
            </div>

            <Field
              id="fire-current-age"
              label="Current age"
              suffix="years"
              help="Your age today. It is used to check that the retirement timeline makes sense."
              issue={fireValidation.issues.currentAge}
            >
              <input
                type="number"
                min="0"
                value={timeline.currentAge}
                onChange={setTimelineValue('currentAge')}
              />
            </Field>
            <Field
              id="fire-retirement-age"
              label="Retirement age"
              suffix="years"
              help="The age when withdrawals start in this plan."
              issue={fireValidation.issues.retirementAge}
            >
              <input
                type="number"
                min="0"
                value={timeline.retirementAge}
                onChange={setTimelineValue('retirementAge')}
              />
            </Field>
            <Field
              id="fire-plan-end-age"
              label="Plan end age"
              suffix="years"
              help="The age through which the model should keep funding withdrawals."
              issue={fireValidation.issues.planEndAge}
            >
              <input
                type="number"
                min="0"
                value={timeline.planEndAge}
                onChange={setTimelineValue('planEndAge')}
              />
            </Field>

            {calculatorMode === 'withdrawal-income' && (
              <Field
                id="fire-initial-portfolio"
                label={portfolioLabel}
                prefix={currencySymbol}
                help="The portfolio balance you want to test for retirement income."
                issue={fireValidation.issues.initialPortfolio ?? fieldIssue('initialPortfolio')}
              >
                <input
                  type="number"
                  min="0"
                  value={Number.isFinite(plan.initialPortfolio) ? plan.initialPortfolio : ''}
                  onChange={setMoney('initialPortfolio')}
                />
              </Field>
            )}

            <Field
              id="fire-annual-expense"
              label={annualExpenseLabel}
              prefix={currencySymbol}
              help={
                calculatorMode === 'fire-number'
                  ? "Your yearly spending in retirement, in today's money."
                  : 'An optional spending goal used to show whether the calculated withdrawal covers your need.'
              }
              issue={fireValidation.issues.annualExpense ?? fieldIssue('annualExpense')}
            >
              <input
                type="number"
                min="0"
                value={Number.isFinite(plan.annualExpense) ? plan.annualExpense : ''}
                onChange={setMoney('annualExpense')}
              />
            </Field>

            {calculatorMode === 'fire-number' && (
              <Field
                id="fire-initial-portfolio"
                label={portfolioLabel}
                prefix={currencySymbol}
                help="What you have invested for retirement today (0 is fine)."
                issue={fireValidation.issues.initialPortfolio ?? fieldIssue('initialPortfolio')}
              >
                <input
                  type="number"
                  min="0"
                  value={Number.isFinite(plan.initialPortfolio) ? plan.initialPortfolio : ''}
                  onChange={setMoney('initialPortfolio')}
                />
              </Field>
            )}

            <Field
              id="fire-return"
              label="Expected return"
              suffix="% / yr"
              help="Your assumed average yearly investment return before inflation. Required; 0 is allowed."
              issue={returnPercentText.trim() === '' ? undefined : fireValidation.issues.return}
            >
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="e.g. 7"
                value={returnPercentText}
                onChange={setPrimaryRate('r')}
              />
            </Field>
            <Field
              id="fire-inflation"
              label="Inflation"
              suffix="% / yr"
              help="Your assumed average yearly inflation. Required; 0 is allowed."
              issue={inflationPercentText.trim() === '' ? undefined : fireValidation.issues.inflation}
            >
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="e.g. 2.5"
                value={inflationPercentText}
                onChange={setPrimaryRate('i')}
              />
            </Field>
            <div className="full-field rate-example-note" role="note">
              <Info size={16} aria-hidden="true" />
              <span>
                Not sure? The homepage illustration uses <strong>{EXAMPLE_RATE_ENTRY.r}% return</strong> and{' '}
                <strong>{EXAMPLE_RATE_ENTRY.i}% inflation</strong>. These are illustrative assumptions, not forecasts or historical averages.
                {plan.ratePeriods.length > 1 ? ` These fields set period 1 of ${plan.ratePeriods.length}; edit every period in Advanced assumptions.` : ''}
              </span>
              <button type="button" className="secondary-button" onClick={applyExampleRates}>
                Use example values
              </button>
            </div>

            {calculatorMode === 'fire-number' && (
              <>
                <Field
                  id="fire-annual-savings"
                  label="Annual savings"
                  prefix={currencySymbol}
                  help="How much you add to investments each year until you retire, in today's money. Optional: leave blank to skip the retirement-age estimate."
                  issue={fireValidation.issues.annualSavings}
                >
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={savingsEntry.annualSavings}
                    onChange={setSavingsValue('annualSavings')}
                  />
                </Field>
                <Field
                  id="fire-savings-growth"
                  label="Savings growth"
                  suffix="% / yr"
                  help="Optional: how much your yearly savings rise above inflation (for example with pay rises)."
                  issue={fireValidation.issues.savingsGrowth}
                >
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    value={savingsEntry.savingsGrowth}
                    onChange={setSavingsValue('savingsGrowth')}
                  />
                </Field>
              </>
            )}

            <div className="field full-field">
              <span className="field-label">Currency</span>
              <div className="segmented" role="group" aria-label="Currency">
                {(['USD', 'INR'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={fireCurrency === code ? 'active' : ''}
                    aria-pressed={fireCurrency === code}
                    onClick={() => setFireCurrency(code)}
                  >
                    {code === 'USD' ? 'US dollar ($)' : 'Indian rupee (₹)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <details className="advanced-shell">
            <summary className="advanced-summary">
              <span>
                <strong>Advanced assumptions</strong>
                <small>{advancedSummaryDescription}</small>
              </span>
              <SlidersHorizontal size={18} />
            </summary>
            <div className="planner-grid" id="planner">
              <section className="panel" aria-labelledby="period-title">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Rates</p>
                    <h2 id="period-title">Market periods</h2>
                  </div>
                  <button className="secondary-button" onClick={addPeriod}>
                    Add
                  </button>
                </div>

                {!fireValidation.ratesMissing && plan.ratePeriods.every((p) => p.r === 0 && p.i === 0) && (
                  <div className="assumption-baseline-note" role="note">
                    <Info size={16} />
                    <span>
                      <strong>No growth or inflation assumed</strong> — 0.0% is a transparent baseline simplification, not an economic forecast. Adjust return and inflation for your expected asset allocation.
                    </span>
                  </div>
                )}

                <div className="period-list">
                  {plan.ratePeriods.map((period, index) => (
                    <div className="repeat-row" key={`${index}-${period.duration}`}>
                      <span className="row-number">{index + 1}</span>
                      <Field label="Years" issue={fieldIssue(`ratePeriods.${index}`)}>
                        <input
                          type="number"
                          min="1"
                          value={period.duration}
                          onChange={(event) => {
                            markInputsChanged();
                            setPlan((current) => ({
                              ...current,
                              ratePeriods: updateRatePeriod(
                                current.ratePeriods,
                                index,
                                'duration',
                                numericValue(event.target.value, 1)
                              )
                            }));
                          }}
                        />
                      </Field>
                      <Field label="Return" issue={fieldIssue(`ratePeriods.${index}.r`)}>
                        <input
                          type="number"
                          step="0.1"
                          value={(period.r * 100).toFixed(1)}
                          onChange={(event) => {
                            markInputsChanged();
                            setPlan((current) => ({
                              ...current,
                              ratePeriods: updateRatePeriod(
                                current.ratePeriods,
                                index,
                                'r',
                                numericValue(event.target.value) / 100
                              )
                            }));
                            if (index === 0) {
                              const text = event.target.value;
                              setRateEntry((entry) => (entry ? { ...entry, r: text } : entry));
                            }
                          }}
                        />
                      </Field>
                      <Field label="Inflation" issue={fieldIssue(`ratePeriods.${index}.i`)}>
                        <input
                          type="number"
                          step="0.1"
                          value={(period.i * 100).toFixed(1)}
                          onChange={(event) => {
                            markInputsChanged();
                            setPlan((current) => ({
                              ...current,
                              ratePeriods: updateRatePeriod(
                                current.ratePeriods,
                                index,
                                'i',
                                numericValue(event.target.value) / 100
                              )
                            }));
                            if (index === 0) {
                              const text = event.target.value;
                              setRateEntry((entry) => (entry ? { ...entry, i: text } : entry));
                            }
                          }}
                        />
                      </Field>
                      <button
                        className="icon-button row-action"
                        aria-label="Remove period"
                        onClick={() => removePeriod(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel" aria-labelledby="model-options-title">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Model</p>
                    <h2 id="model-options-title">Retirement model options</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <Field
                    label="Estate target"
                    help="The amount you want remaining at the end of the plan."
                    issue={fieldIssue('desiredFinalValue')}
                  >
                    <input
                      type="number"
                      min="0"
                      value={plan.desiredFinalValue}
                      onChange={setMoney('desiredFinalValue')}
                    />
                  </Field>
                  <div className="field">
                    <span className="field-label">
                      Withdrawal timing
                      <InfoTip text="Start means withdrawals happen before annual growth. End means withdrawals happen after annual growth." />
                    </span>
                    <div className="segmented">
                      <button
                        className={plan.withdrawalTiming === 'end' ? 'active' : ''}
                        onClick={() => setTiming('end')}
                      >
                        End
                      </button>
                      <button
                        className={plan.withdrawalTiming === 'start' ? 'active' : ''}
                        onClick={() => setTiming('start')}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel" aria-labelledby="events-title">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Cash flows</p>
                    <h2 id="events-title">One-off events</h2>
                  </div>
                  <button className="secondary-button" onClick={addEvent}>
                    Add
                  </button>
                </div>

                <div className="event-list">
                  {plan.oneOffEvents.length === 0 && (
                    <article className="scenario-card empty-card">
                      <span>No one-off events</span>
                      <small>Optional: Add home purchases, inheritances, or capital expenses. Never required.</small>
                    </article>
                  )}
                  {plan.oneOffEvents.map((event, index) => (
                    <div className="repeat-row event-row" key={`${index}-${event.label}`}>
                      <Field label="Label">
                        <input
                          type="text"
                          placeholder="e.g. Home upgrade"
                          value={event.label ?? ''}
                          onChange={(changeEvent) => {
                            markInputsChanged();
                            setPlan((current) => ({
                              ...current,
                              oneOffEvents: current.oneOffEvents.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, label: changeEvent.target.value } : item
                              )
                            }));
                          }}
                        />
                      </Field>
                      <Field label="Year" issue={fieldIssue(`oneOffEvents.${index}.year`)}>
                        <input
                          type="number"
                          min="1"
                          value={event.year}
                          onChange={(changeEvent) => {
                            markInputsChanged();
                            setPlan((current) => ({
                              ...current,
                              oneOffEvents: current.oneOffEvents.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, year: Math.trunc(numericValue(changeEvent.target.value, 1)) }
                                  : item
                              )
                            }));
                          }}
                        />
                      </Field>
                      <Field label="Amount" issue={fieldIssue(`oneOffEvents.${index}.amount`)}>
                        <input
                          type="number"
                          value={event.amount}
                          onChange={(changeEvent) => {
                            markInputsChanged();
                            setPlan((current) => ({
                              ...current,
                              oneOffEvents: current.oneOffEvents.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, amount: numericValue(changeEvent.target.value) }
                                  : item
                              )
                            }));
                          }}
                        />
                      </Field>
                      <button
                        className="icon-button row-action"
                        aria-label="Remove event"
                        onClick={() => removeEvent(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel" aria-labelledby="income-title">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Income</p>
                    <h2 id="income-title">Recurring income streams</h2>
                  </div>
                  <button className="secondary-button" onClick={() => addRecurringCashFlow('income')}>
                    Add
                  </button>
                </div>

                <div className="event-list">
                  {incomeStreams.length === 0 && (
                    <article className="scenario-card empty-card">
                      <span>No income streams</span>
                      <small>Optional: Add Social Security, pension, rental, or part-time income. Never required.</small>
                    </article>
                  )}
                  {incomeStreams.map(({ flow, index }) => (
                    <div className="repeat-row recurring-row" key={`income-${index}-${flow.label}`}>
                      <Field label="Label">
                        <input
                          type="text"
                          placeholder="e.g. Social Security"
                          value={flow.label ?? ''}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, { label: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Start" issue={fieldIssue(`recurringCashFlows.${index}.startYear`)}>
                        <input
                          type="number"
                          min="1"
                          value={flow.startYear}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, {
                              startYear: Math.trunc(numericValue(event.target.value, 1))
                            })
                          }
                        />
                      </Field>
                      <Field label="End" issue={fieldIssue(`recurringCashFlows.${index}.endYear`)}>
                        <input
                          type="number"
                          min="1"
                          value={flow.endYear}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, {
                              endYear: Math.trunc(numericValue(event.target.value, duration))
                            })
                          }
                        />
                      </Field>
                      <Field label="Annual" issue={fieldIssue(`recurringCashFlows.${index}.amount`)}>
                        <input
                          type="number"
                          min="0"
                          value={flow.amount}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, { amount: numericValue(event.target.value) })
                          }
                        />
                      </Field>
                      <div className="field">
                        <span>Growth</span>
                        <div className="segmented">
                          <button
                            className={flow.inflationAdjusted !== false ? 'active' : ''}
                            onClick={() => updateRecurringCashFlow(index, { inflationAdjusted: true })}
                          >
                            Inflates
                          </button>
                          <button
                            className={flow.inflationAdjusted === false ? 'active' : ''}
                            onClick={() => updateRecurringCashFlow(index, { inflationAdjusted: false })}
                          >
                            Fixed
                          </button>
                        </div>
                      </div>
                      <button
                        className="icon-button row-action"
                        aria-label="Remove income stream"
                        onClick={() => removeRecurringCashFlow(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel" aria-labelledby="phase-title">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Expense phases</p>
                    <h2 id="phase-title">Recurring spending phases</h2>
                  </div>
                  <button className="secondary-button" onClick={() => addRecurringCashFlow('expense')}>
                    Add
                  </button>
                </div>

                <div className="event-list">
                  {expensePhases.length === 0 && (
                    <article className="scenario-card empty-card">
                      <span>No extra phases</span>
                      <small>Optional: Add healthcare bridge, travel, mortgage, or care phases. Never required.</small>
                    </article>
                  )}
                  {expensePhases.map(({ flow, index }) => (
                    <div className="repeat-row recurring-row" key={`expense-${index}-${flow.label}`}>
                      <Field label="Label">
                        <input
                          type="text"
                          placeholder="e.g. Healthcare bridge"
                          value={flow.label ?? ''}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, { label: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Start" issue={fieldIssue(`recurringCashFlows.${index}.startYear`)}>
                        <input
                          type="number"
                          min="1"
                          value={flow.startYear}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, {
                              startYear: Math.trunc(numericValue(event.target.value, 1))
                            })
                          }
                        />
                      </Field>
                      <Field label="End" issue={fieldIssue(`recurringCashFlows.${index}.endYear`)}>
                        <input
                          type="number"
                          min="1"
                          value={flow.endYear}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, {
                              endYear: Math.trunc(numericValue(event.target.value, duration))
                            })
                          }
                        />
                      </Field>
                      <Field label="Annual" issue={fieldIssue(`recurringCashFlows.${index}.amount`)}>
                        <input
                          type="number"
                          min="0"
                          value={flow.amount}
                          onChange={(event) =>
                            updateRecurringCashFlow(index, { amount: numericValue(event.target.value) })
                          }
                        />
                      </Field>
                      <div className="field">
                        <span>Growth</span>
                        <div className="segmented">
                          <button
                            className={flow.inflationAdjusted !== false ? 'active' : ''}
                            onClick={() => updateRecurringCashFlow(index, { inflationAdjusted: true })}
                          >
                            Inflates
                          </button>
                          <button
                            className={flow.inflationAdjusted === false ? 'active' : ''}
                            onClick={() => updateRecurringCashFlow(index, { inflationAdjusted: false })}
                          >
                            Fixed
                          </button>
                        </div>
                      </div>
                      <button
                        className="icon-button row-action"
                        aria-label="Remove expense phase"
                        onClick={() => removeRecurringCashFlow(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </details>

          <div className="quick-actions">
            <button
              className="primary-button icon-text-button"
              onClick={calculateNow}
              disabled={!fireValidation.ok}
              aria-describedby={fireValidation.ok ? undefined : 'fire-calc-blocker'}
            >
              {isStale ? <RotateCcw size={17} /> : <Calculator size={17} />}
              {isStale ? 'Recalculate' : 'Calculate'}
            </button>
            {!fireValidation.ok ? (
              <p className="calc-blocker" id="fire-calc-blocker" role="status">
                {fireValidation.ratesMissing
                  ? 'Enter expected return and inflation (or use the example values) to see your answer.'
                  : 'Fix the highlighted fields to see your answer.'}
              </p>
            ) : null}
          </div>

          {hasCalculated && (
            <div className={`calculator-result-card hero-result ${isStale ? 'is-stale' : ''}`}>
              {isStale && (
                <div className="stale-result-badge" role="status" aria-live="polite">
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Inputs changed since this result. Select Recalculate to update it.</span>
                </div>
              )}
              <span>{primaryResult.label}</span>
              <strong>{primaryResult.value}</strong>
              <small>{primaryResult.detail}</small>
              <div className="result-facts">
                <span>
                  {secondaryResult.label}: <strong>{secondaryResult.value}</strong>
                </span>
                <span>
                  {supportResult.label}: <strong>{supportResult.value}</strong>
                </span>
              </div>
              {retirementEstimate ? (
                <FireRetirementEstimate
                  estimate={retirementEstimate.estimate}
                  currency={fireCurrency}
                  chosenRetirementAge={activeTimelineForDisplay.retirementAge}
                  planEndAge={activeTimelineForDisplay.planEndAge}
                  projectedAtChosenAge={retirementEstimate.projectedAtChosenAge}
                  neededAtChosenAge={retirementEstimate.neededAtChosenAge}
                  returnRate={retirementEstimate.returnRate}
                  inflationRate={retirementEstimate.inflationRate}
                />
              ) : null}
            </div>
          )}
        </section>

        {hasCalculated && (
          <section className="panel health-panel" aria-labelledby="warnings-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Plan checks</p>
                <h2 id="warnings-title">Plan health</h2>
              </div>
              <span className="pill">{warningNotices.length} checks</span>
            </div>
            <div className="comparison-grid health-grid">
              {warningNotices.length > 0 ? (
                warningNotices.slice(0, 3).map((warning, index) => (
                  <article
                    className={`scenario-card warning-card warning-${warning.severity}`}
                    key={`${warning.title}-${index}`}
                  >
                    <span>{warning.severity.toUpperCase()}</span>
                    <strong>{warning.title}</strong>
                    <small>{warning.message}</small>
                  </article>
                ))
              ) : (
                <article className="scenario-card warning-card warning-ok">
                  <span>OK</span>
                  <strong>Model checks passed</strong>
                  <small>No validation or depletion warnings.</small>
                </article>
              )}
              {warningNotices.length > 3 && (
                <article className="scenario-card warning-card warning-info">
                  <span>MORE</span>
                  <strong>{warningNotices.length - 3} additional checks</strong>
                  <small>Open Results or Compare to inspect the model in more detail.</small>
                </article>
              )}
            </div>
          </section>
        )}







        {hasCalculated && (
          <section className="panel result-tabs-panel" aria-label="Calculated outputs">
            <div className="panel-tabs" role="tablist" aria-label="FIRE result views">
              {calculatorPanels.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={calculatorPanel === item.id ? 'active' : ''}
                    onClick={() => navigate(item.id)}
                    role="tab"
                    aria-selected={calculatorPanel === item.id}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {hasCalculated && calculatorPanel === 'results' && (
          <section className="panel chart-panel" id="results" aria-labelledby="results-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Projection</p>
                <h2 id="results-title">Year-by-year cash flow</h2>
                <p>Switch between the calculated FIRE plan and the entered portfolio stress test.</p>
              </div>
              <div className="topbar-actions">
                <button className="secondary-button" onClick={exportSelectedProjection}>
                  Export CSV
                </button>
                <span className="pill">{activePlanForDisplay.withdrawalTiming === 'start' ? 'Start-year' : 'End-year'}</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <span>Projection basis</span>
                <div className="segmented">
                  <button
                    className={projectionBasis === 'fire-number' ? 'active' : ''}
                    onClick={() => setProjectionBasis('fire-number')}
                  >
                    FIRE number
                  </button>
                  <button
                    className={projectionBasis === 'current-portfolio' ? 'active' : ''}
                    onClick={() => setProjectionBasis('current-portfolio')}
                  >
                    Current
                  </button>
                </div>
              </div>
              <div className="field">
                <span>View</span>
                <div className="segmented">
                  <button
                    className={resultsMode === 'chart' ? 'active' : ''}
                    onClick={() => setResultsMode('chart')}
                  >
                    Chart
                  </button>
                  <button
                    className={resultsMode === 'table' ? 'active' : ''}
                    onClick={() => setResultsMode('table')}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {resultsMode === 'chart' ? (
              <Suspense
                fallback={
                  <div className="chart-frame chart-loading" role="status" aria-live="polite">
                    Loading projection chart...
                  </div>
                }
              >
                <ProjectionChart
                  label={projectionLabel}
                  rows={chartRows}
                  startAge={activeTimelineForDisplay.retirementAge}
                  currency={fireCurrency}
                />
              </Suspense>
            ) : (
              <YearByYearTable
                rows={projectionRows}
                label={projectionLabel}
                startAge={activeTimelineForDisplay.retirementAge}
                currency={fireCurrency}
              />
            )}
          </section>
        )}

        {hasCalculated && calculatorPanel === 'compare' && (
          <section className="panel" id="compare" aria-labelledby="compare-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Scenarios</p>
                <h2 id="compare-title">Three-way assumption comparison</h2>
                <p>Test spending, portfolio, return, and inflation changes against the same timeline.</p>
              </div>
              <span className="pill">3 scenarios</span>
            </div>
            <div className="comparison-grid">
              {comparisonRows.map((row) => (
                <article className="scenario-card" key={row.id}>
                  <Field label="Scenario name">
                    <input type="text" value={row.scenario.label} onChange={setScenarioLabel(row.id)} />
                  </Field>
                  <strong>{formatFireMoney(row.requiredPortfolio)}</strong>
                  <small>FIRE number for {row.label}</small>
                  <small>
                    Vs planner: {row.requiredDelta > 0 ? '+' : ''}
                    {formatFireMoney(row.requiredDelta)}
                  </small>
                  <small>Portfolio income: {formatFireMoney(row.maxAnnualExpense)}</small>
                  <small>Current ending: {formatFireMoney(row.actualFinalBalance)}</small>
                  <small>
                    {row.depletionYear === null
                      ? 'No current-portfolio depletion in this timeline'
                      : `Current portfolio depletes in year ${row.depletionYear}`}
                  </small>
                  <div className="form-grid">
                    <Field label="Spend shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.spendingDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'spendingDelta')}
                      />
                    </Field>
                    <Field label="Portfolio shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.portfolioDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'portfolioDelta')}
                      />
                    </Field>
                    <Field label="Return shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.returnDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'returnDelta')}
                      />
                    </Field>
                    <Field label="Inflation shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.inflationDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'inflationDelta')}
                      />
                    </Field>
                  </div>
                  <small>
                    Return {formatSignedPercent(row.scenario.returnDelta)}; inflation{' '}
                    {formatSignedPercent(row.scenario.inflationDelta)}
                  </small>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="panel utility-panel" id="saved-plans" aria-labelledby="saved-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Scenarios</p>
              <h2 id="saved-title">Save and move plans</h2>
            </div>
            <button className="secondary-button icon-text-button" onClick={resetToFreshPlan}>
              <RotateCcw size={16} />
              New plan
            </button>
          </div>

              <div className="auth-save-note">
                <UserCircle size={17} />
                <span>
                  {auth.isSignedIn
                    ? `Signed in as ${auth.user.displayName}; FIRE plans save to your account.`
                    : 'FIRE drafts stay in this browser. Sign in to save plans to your account.'}
                </span>
              </div>
              {planStorageMessage ? <p className="storage-status" role="status" aria-live="polite">{planStorageMessage}</p> : null}

              <div className="utility-grid">
                <Field label="Plan name">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                  />
                </Field>
                <button
                  className="secondary-button icon-text-button"
                  disabled={isSavingPlan || isLoadingSavedPlans}
                  onClick={saveCurrentPlan}
                >
                  <Save size={16} />
                  {auth.isSignedIn ? 'Save to account' : 'Save'}
                </button>
                <button className="secondary-button icon-text-button" onClick={exportPlanJson}>
                  <Download size={16} />
                  Export JSON
                </button>
                <button
                  className="secondary-button icon-text-button"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload size={16} />
                  Import JSON
                </button>
                <input
                  ref={importInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="application/json"
                  tabIndex={-1}
                  onChange={importPlanJson}
                />
              </div>

              <div className="saved-list">
                {isLoadingSavedPlans ? (
                  <article className="scenario-card empty-card">
                    <span>Loading saved plans</span>
                    <small>Checking your account workspace.</small>
                  </article>
                ) : savedPlans.length === 0 ? (
                  <article className="scenario-card empty-card">
                    <span>No saved plans</span>
                    <small>{auth.isSignedIn ? 'Account plans will appear here.' : 'Saved plans stay in this browser.'}</small>
                  </article>
                ) : (
                  savedPlans.map((item) => (
                    <article className="saved-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{new Date(item.createdAt).toLocaleDateString()}</small>
                      </div>
                      <div className="saved-actions">
                        <button className="secondary-button" onClick={() => loadSavedPlan(item)}>
                          Load
                        </button>
                        <button
                          className="icon-button row-action"
                          disabled={isSavingPlan}
                          aria-label={`Delete ${item.name}`}
                          onClick={() => removeSavedPlan(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
        </section>
          </>
        )}
      </main>

      {pendingNavigation ? (
        <div
          className="modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-nav-changes-title"
        >
          <div className="modal-content planning-unsaved-modal">
            <h3 id="unsaved-nav-changes-title">Unsaved changes</h3>
            <p>
              You have unsaved changes in your current planning assumptions. Navigating away will discard these changes.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingNavigation(null)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const next = pendingNavigation.nextRoute;
                  performNavigateTo(next);
                }}
              >
                Discard and leave
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
