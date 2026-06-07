import {
  ArrowRight,
  BarChart3,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  CircleGauge,
  ClipboardList,
  Download,
  FolderKanban,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Menu,
  Moon,
  PiggyBank,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  annualSimulation,
  calculateFirePlan,
  formatMoney,
  formatPercent,
  totalDuration,
  type FirePlanResult,
  type PlanInput,
  type RatePeriod,
  type RecurringCashFlow,
  type SimulationResult,
  type WithdrawalTiming,
  type YearResult
} from './lib/fire';

type Mood = 'aurora' | 'lagoon' | 'ember';
type Mode = 'light' | 'dark';
type AppRoute =
  | '/'
  | '/dashboard'
  | '/accounts'
  | '/transactions'
  | '/goals'
  | '/plans'
  | '/calculators'
  | '/calculators/fire'
  | '/reports'
  | '/settings';
type PlatformRoute = Exclude<AppRoute, '/' | '/calculators' | '/calculators/fire'>;
type CalculatorPanel = 'planner' | 'results' | 'compare';
type CalculatorMode = 'fire-number' | 'withdrawal-income';
type ResultsMode = 'chart' | 'table';
type ProjectionBasis = 'fire-number' | 'current-portfolio';
type ScenarioField = 'spendingDelta' | 'portfolioDelta' | 'returnDelta' | 'inflationDelta';
type TimelineInput = {
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

type WarningNotice = {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
};

type AppSnapshot = {
  plan: PlanInput;
  timeline: TimelineInput;
  calculatorMode: CalculatorMode;
  scenarios: ScenarioConfig[];
};

type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  snapshot: AppSnapshot;
};

const SAVED_PLANS_KEY = 'firecalc.savedPlans.v1';

const moodLabels: Record<Mood, string> = {
  aurora: 'Aurora',
  lagoon: 'Lagoon',
  ember: 'Ember'
};

const routeItems: Array<{ path: AppRoute; label: string; icon: typeof Calculator }> = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: CircleDollarSign },
  { path: '/transactions', label: 'Transactions', icon: ClipboardList },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/plans', label: 'Plans', icon: FolderKanban },
  { path: '/calculators', label: 'Calculators', icon: Calculator },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings }
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
    primaryHelp: 'First-year retirement spending.',
    secondaryLabel: 'Current portfolio',
    secondaryHelp: 'Used for gap and stress checks.'
  },
  'withdrawal-income': {
    eyebrow: 'Number to income',
    title: 'Find my annual withdrawal',
    shortTitle: 'Withdrawal income',
    primaryLabel: 'FIRE number / portfolio',
    primaryHelp: 'Portfolio amount to test.',
    secondaryLabel: 'Need benchmark',
    secondaryHelp: 'Optional spending goal to compare.'
  }
};

const initialPlan: PlanInput = {
  annualExpense: 80_000,
  initialPortfolio: 750_000,
  withdrawalTiming: 'end',
  desiredFinalValue: 0,
  ratePeriods: [
    { duration: 10, r: 0.075, i: 0.03 },
    { duration: 20, r: 0.06, i: 0.03 }
  ],
  oneOffEvents: [
    { year: 5, amount: 50_000, label: 'Equity vest' },
    { year: 12, amount: -120_000, label: 'Home upgrade' }
  ],
  recurringCashFlows: [
    {
      kind: 'income',
      startYear: 15,
      endYear: 30,
      amount: 24_000,
      label: 'Social Security',
      inflationAdjusted: true
    },
    {
      kind: 'expense',
      startYear: 1,
      endYear: 8,
      amount: 12_000,
      label: 'Healthcare bridge',
      inflationAdjusted: true
    }
  ]
};

const initialTimeline: TimelineInput = {
  currentAge: 40,
  retirementAge: 50,
  planEndAge: 80
};

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
      return '/';
  }
}

function readRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return '/';
  }

  return normalizeRoute(window.location.pathname);
}

function isRouteActive(currentRoute: AppRoute, itemRoute: AppRoute): boolean {
  return currentRoute === itemRoute || currentRoute.startsWith(`${itemRoute}/`);
}

function modeledDurationFromTimeline(timeline: TimelineInput): number {
  return Math.max(1, Math.trunc(timeline.planEndAge) - Math.trunc(timeline.retirementAge));
}

function resizeRatePeriods(periods: RatePeriod[], duration: number): RatePeriod[] {
  const targetDuration = Math.max(1, Math.trunc(duration));
  const source = periods.length > 0 ? periods : [{ duration: targetDuration, r: 0.06, i: 0.03 }];
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

function readSavedPlans(): SavedPlan[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_PLANS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeSavedPlans(plans: SavedPlan[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans.slice(0, 8)));
}

function isAppSnapshot(value: unknown): value is AppSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return isRecord(value.plan) && isRecord(value.timeline);
}

function numericValue(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  id: ScenarioConfig['id'],
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
      flow.kind === 'expense'
        ? { ...flow, amount: Math.max(0, flow.amount * Math.max(0, 1 + scenario.spendingDelta)) }
        : flow
    )
  };
}

function averageRate(periods: RatePeriod[], key: 'r' | 'i'): number {
  const duration = Math.max(totalDuration(periods), 1);
  return periods.reduce((sum, period) => sum + period[key] * period.duration, 0) / duration;
}

function formatSignedPercent(value: number): string {
  const formatted = formatPercent(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildProjectionCsv(label: string, rows: YearResult[]): string {
  const csvRows: Array<Array<string | number>> = [
    [
      'Projection',
      'Year',
      'Starting balance',
      'Base withdrawal',
      'Recurring income',
      'Recurring expense',
      'Net withdrawal',
      'One-off cash flow',
      'Return rate',
      'Inflation rate',
      'Ending balance'
    ],
    ...rows.map((row) => [
      label,
      row.year,
      row.startingBalance.toFixed(2),
      row.baseWithdrawal.toFixed(2),
      row.recurringIncome.toFixed(2),
      row.recurringExpense.toFixed(2),
      row.withdrawal.toFixed(2),
      row.oneOffAmount.toFixed(2),
      (row.returnRate * 100).toFixed(4),
      (row.inflationRate * 100).toFixed(4),
      row.endingBalance.toFixed(2)
    ])
  ];

  return csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeWarning(value: unknown, index: number): WarningNotice | null {
  if (typeof value === 'string') {
    return {
      title: `Model warning ${index + 1}`,
      message: value,
      severity: 'warning'
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const severityText = pickString(value, ['severity', 'level', 'tone', 'kind'])?.toLowerCase() ?? '';
  const severity: WarningNotice['severity'] = severityText.includes('critical') ||
    severityText.includes('error') ||
    severityText.includes('danger')
    ? 'critical'
    : severityText.includes('warning') || severityText.includes('risk') || severityText.includes('caution')
      ? 'warning'
      : 'info';
  const title =
    pickString(value, ['title', 'label', 'name', 'code', 'kind', 'type']) ??
    `Model warning ${index + 1}`;
  const message =
    pickString(value, ['message', 'description', 'detail', 'text', 'body', 'summary']) ?? title;

  return { title, message, severity };
}

function engineWarnings(result: FirePlanResult): WarningNotice[] {
  const warningSource = result as FirePlanResult & {
    warning?: unknown;
    warnings?: unknown;
  };
  const rawWarnings = Array.isArray(warningSource.warnings)
    ? warningSource.warnings
    : warningSource.warning === undefined
      ? []
      : [warningSource.warning];

  return rawWarnings
    .map((warning, index) => normalizeWarning(warning, index))
    .filter((warning): warning is WarningNotice => warning !== null);
}

function firstNegativeYear(rows: YearResult[]): number | null {
  return rows.find((row) => row.endingBalance < 0)?.year ?? null;
}

function stressTestCurrentPortfolio(plan: PlanInput): SimulationResult {
  const fallbackPortfolio = Number.isFinite(plan.initialPortfolio)
    ? Math.max(0, plan.initialPortfolio)
    : 0;

  try {
    return annualSimulation(
      fallbackPortfolio,
      Number.isFinite(plan.annualExpense) ? Math.max(0, plan.annualExpense) : 0,
      plan.withdrawalTiming,
      plan.ratePeriods,
      plan.oneOffEvents,
      plan.recurringCashFlows
    );
  } catch {
    return {
      rows: [],
      years: [0],
      balances: [fallbackPortfolio],
      withdrawals: [],
      finalBalance: fallbackPortfolio,
      warnings: []
    };
  }
}

function planWarnings(
  plan: PlanInput,
  result: FirePlanResult,
  currentRows: YearResult[],
  duration: number
): WarningNotice[] {
  const exportedWarnings = engineWarnings(result);
  const notices: WarningNotice[] = [];
  const depletionYear = firstNegativeYear(currentRows);
  const requiredGap = result.requiredPortfolio - plan.initialPortfolio;
  const withdrawalRate = plan.initialPortfolio > 0 ? plan.annualExpense / plan.initialPortfolio : Infinity;
  const ignoredEvents = plan.oneOffEvents.filter((event) => {
    const year = Math.trunc(event.year);
    return year < 1 || year > duration;
  });

  if (depletionYear !== null) {
    notices.push({
      title: 'Current portfolio drawdown',
      message: `At the entered spending level, the current portfolio crosses below zero in year ${depletionYear}.`,
      severity: 'warning'
    });
  }

  if (Number.isFinite(requiredGap) && requiredGap > 0) {
    notices.push({
      title: 'Funding gap',
      message: `${formatMoney(requiredGap)} separates the current portfolio from the calculated FIRE number.`,
      severity: 'info'
    });
  }

  if (withdrawalRate > 0.06) {
    notices.push({
      title: 'High starting withdrawal',
      message: `The first-year spend is ${formatPercent(withdrawalRate)} of the current portfolio.`,
      severity: 'warning'
    });
  }

  if (ignoredEvents.length > 0) {
    notices.push({
      title: 'Cash flow outside timeline',
      message: `${ignoredEvents.length} one-off event${ignoredEvents.length === 1 ? '' : 's'} fall outside the ${duration}-year model.`,
      severity: 'info'
    });
  }

  if (averageRate(plan.ratePeriods, 'i') >= averageRate(plan.ratePeriods, 'r')) {
    notices.push({
      title: 'Inflation pressure',
      message: 'Average inflation is at or above average return across the modeled periods.',
      severity: 'warning'
    });
  }

  return [...exportedWarnings, ...notices];
}

function Metric({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip">
      <span className="info-dot" tabIndex={0} aria-label={text}>
        ?
      </span>
      <span className="info-popover" role="tooltip">
        {text}
      </span>
    </span>
  );
}

function Field({
  label,
  help,
  issue,
  children
}: {
  label: string;
  help?: string;
  issue?: string;
  children: ReactNode;
}) {
  return (
    <label className={issue ? 'field field-has-issue' : 'field'}>
      <span className="field-label">
        {label}
        {help && <InfoTip text={help} />}
      </span>
      {children}
      {issue && <small className="field-issue">{issue}</small>}
    </label>
  );
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>Year {label}</strong>
      {payload.map((entry: any) => (
        <span key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatMoney(Number(entry.value))}
        </span>
      ))}
    </div>
  );
}

function YearByYearTable({ rows, label }: { rows: YearResult[]; label: string }) {
  return (
    <div className="table-wrap">
      <table aria-label={`${label} year-by-year projection`}>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Start</th>
            <th scope="col">Base</th>
            <th scope="col">Income</th>
            <th scope="col">Extra</th>
            <th scope="col">Net</th>
            <th scope="col">One-off</th>
            <th scope="col">Return</th>
            <th scope="col">Inflation</th>
            <th scope="col">End</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              <td>{formatMoney(row.startingBalance)}</td>
              <td>{formatMoney(row.baseWithdrawal)}</td>
              <td>{formatMoney(row.recurringIncome)}</td>
              <td>{formatMoney(row.recurringExpense)}</td>
              <td>{formatMoney(row.withdrawal)}</td>
              <td>{formatMoney(row.oneOffAmount)}</td>
              <td>{formatPercent(row.returnRate)}</td>
              <td>{formatPercent(row.inflationRate)}</td>
              <td>{formatMoney(row.endingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const landingFeatures = [
  {
    title: 'Track',
    body: 'Bring assets, debt, income, and spending into one private financial profile.',
    icon: CircleDollarSign
  },
  {
    title: 'Plan',
    body: 'Turn goals into dated plans with assumptions you can revisit as life changes.',
    icon: ClipboardList
  },
  {
    title: 'Compare',
    body: 'Model base, guardrail, and upside paths before committing to a decision.',
    icon: BarChart3
  },
  {
    title: 'Improve',
    body: 'See the next action that most changes your plan health and goal progress.',
    icon: CircleGauge
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

const platformPages: Record<
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
    title: 'A signed-in financial snapshot will live here.',
    description:
      'This route establishes the future home for net worth, goal progress, saved plans, and recent account changes.',
    icon: LayoutDashboard,
    cards: [
      { label: 'Net worth', value: '$0', detail: 'Manual accounts and balances arrive in a later phase.' },
      { label: 'Goal progress', value: '0%', detail: 'Goals will roll up into a concise progress view.' },
      { label: 'Saved plans', value: '0', detail: 'FIRE and future planning modules will save here.' }
    ]
  },
  '/accounts': {
    eyebrow: 'Accounts',
    title: 'Accounts will hold the financial profile backbone.',
    description:
      'This route reserves space for manual assets, liabilities, balances, and account history before bank connections or imports are introduced.',
    icon: CircleDollarSign,
    cards: [
      { label: 'Assets', value: 'Planned', detail: 'Cash, brokerage, retirement, property, and other holdings.' },
      { label: 'Liabilities', value: 'Planned', detail: 'Debt balances, rates, payoff schedules, and ownership.' },
      { label: 'Balances', value: 'Planned', detail: 'Snapshot history for dashboard and goal calculations.' }
    ]
  },
  '/transactions': {
    eyebrow: 'Transactions',
    title: 'Transactions get a dedicated review queue.',
    description:
      'This route will eventually handle CSV imports, categorization, recurring spending patterns, and review before data affects reports.',
    icon: ClipboardList,
    cards: [
      { label: 'Import queue', value: 'Future', detail: 'CSV upload and review before saving user-owned records.' },
      { label: 'Categories', value: 'Future', detail: 'Income, expense, transfer, and custom planning categories.' },
      { label: 'Recurring items', value: 'Future', detail: 'Detect subscriptions, paychecks, rent, and debt payments.' }
    ]
  },
  '/goals': {
    eyebrow: 'Goals',
    title: 'Goal tracking gets its own workspace.',
    description:
      'Future users will create targets with dates, funding sources, current balances, and plan links.',
    icon: Target,
    cards: [
      { label: 'Retirement', value: 'Planned', detail: 'Connect FIRE plans to a long-term goal.' },
      { label: 'Home fund', value: 'Planned', detail: 'Track target amount, deadline, and monthly pace.' },
      { label: 'Education', value: 'Planned', detail: 'Reserve space for family or education goals.' }
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
    title: 'Reports will turn tracked data into insight.',
    description:
      'This route keeps net worth, cash flow, spending, and plan-health reporting separate from data entry and calculators.',
    icon: BarChart3,
    cards: [
      { label: 'Net worth', value: 'Planned', detail: 'Trend assets, liabilities, and account balance history.' },
      { label: 'Cash flow', value: 'Planned', detail: 'Summarize income, spending, savings rate, and anomalies.' },
      { label: 'Plan health', value: 'Planned', detail: 'Explain risks, assumptions, and progress against goals.' }
    ]
  },
  '/settings': {
    eyebrow: 'Settings',
    title: 'Profile, privacy, and data controls belong here.',
    description:
      'This placeholder makes room for account settings, export/delete controls, theme, and security notices.',
    icon: Settings,
    cards: [
      { label: 'Profile', value: 'Planned', detail: 'Household and planning defaults.' },
      { label: 'Privacy', value: 'Planned', detail: 'Data export, deletion, and consent controls.' },
      { label: 'Theme', value: 'Ready', detail: 'Light, dark, and mood controls remain global.' }
    ]
  }
};

function isPlatformRoute(route: AppRoute): route is PlatformRoute {
  return route in platformPages;
}

function LandingPage({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">Personal finance tracker and planner</p>
          <h1 id="landing-title">Track the money you have. Plan the choices ahead.</h1>
          <p>
            FinPath is becoming a private planning workspace for accounts, goals, saved plans, and
            calculators. The FIRE calculator is the first module inside the larger platform.
          </p>
          <div className="landing-actions">
            <button className="primary-button icon-text-button" onClick={() => onNavigate('/dashboard')}>
              Create account
              <ArrowRight size={17} />
            </button>
            <button className="secondary-button icon-text-button" onClick={() => onNavigate('/dashboard')}>
              Sign in
            </button>
            <button
              className="secondary-button icon-text-button"
              onClick={() => onNavigate('/calculators/fire')}
            >
              <Calculator size={16} />
              Try FIRE calculator
            </button>
          </div>
        </div>

        <div className="landing-board" aria-label="Financial planning workspace preview">
          <div className="board-toolbar">
            <span>Financial profile</span>
            <strong>Phase 1A shell</strong>
          </div>
          <div className="board-metrics">
            <Metric label="Net worth" value="$1.42M" tone="accent" />
            <Metric label="Goals on track" value="4 of 6" tone="success" />
            <Metric label="Plan runway" value="29 yrs" />
          </div>
          <div className="board-rows" aria-hidden="true">
            <span style={{ width: '78%' }} />
            <span style={{ width: '64%' }} />
            <span style={{ width: '88%' }} />
            <span style={{ width: '52%' }} />
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Platform capabilities">
        {landingFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon">
                <Icon size={20} />
              </span>
              <strong>{feature.title}</strong>
              <small>{feature.body}</small>
            </article>
          );
        })}
      </section>

      <section className="privacy-band" aria-labelledby="privacy-title">
        <ShieldCheck size={22} />
        <div>
          <h2 id="privacy-title">Built around private financial data.</h2>
          <p>
            Account-backed storage, export, deletion, and security controls are planned before the
            product stores sensitive user-owned financial records.
          </p>
        </div>
      </section>
    </>
  );
}

function CalculatorsPage({ onNavigate }: { onNavigate: (route: AppRoute) => void }) {
  return (
    <section className="route-shell" aria-labelledby="calculators-title">
      <div className="route-heading">
        <p className="eyebrow">Calculators</p>
        <h1 id="calculators-title">Planning modules will live here.</h1>
        <p>
          FIRE is available now as the first task-focused calculator. Additional modules are parked
          as clear placeholders so the product no longer depends on one front-page tool.
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

function PlatformPage({
  route,
  onNavigate
}: {
  route: Exclude<AppRoute, '/' | '/calculators' | '/calculators/fire'>;
  onNavigate: (route: AppRoute) => void;
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

      <div className="placeholder-grid">
        {page.cards.map((card) => (
          <article className="scenario-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </div>

      <section className="next-module-band" aria-label={`${page.eyebrow} next action`}>
        <span className="feature-icon">
          <Icon size={20} />
        </span>
        <div>
          <strong>{page.eyebrow} route is wired.</strong>
          <small>
            Continue into the working FIRE module while auth, persistence, and tracker data models
            are still future phases.
          </small>
        </div>
        <button className="secondary-button icon-text-button" onClick={() => onNavigate('/calculators/fire')}>
          Try FIRE
          <ChevronRight size={16} />
        </button>
      </section>
    </section>
  );
}

function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute);
  const [plan, setPlan] = useState<PlanInput>(initialPlan);
  const [timeline, setTimeline] = useState<TimelineInput>(initialTimeline);
  const [mood, setMood] = useState<Mood>('aurora');
  const [mode, setMode] = useState<Mode>('light');
  const [calculatorPanel, setCalculatorPanel] = useState<CalculatorPanel>('planner');
  const [calculatorMode, setCalculatorMode] = useState<CalculatorMode>('fire-number');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [resultsMode, setResultsMode] = useState<ResultsMode>('chart');
  const [projectionBasis, setProjectionBasis] = useState<ProjectionBasis>('fire-number');
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(initialScenarios);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(readSavedPlans);
  const [saveName, setSaveName] = useState('Retirement base');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readRoute());
      setIsMenuOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const result = useMemo<FirePlanResult>(() => calculateFirePlan(plan), [plan]);
  const duration = totalDuration(plan.ratePeriods);
  const timelineDuration = modeledDurationFromTimeline(timeline);
  const currentSimulation = useMemo(() => stressTestCurrentPortfolio(plan), [plan]);
  const incomeStreams = (plan.recurringCashFlows ?? []).map((flow, index) => ({ flow, index })).filter(({ flow }) => flow.kind === 'income');
  const expensePhases = (plan.recurringCashFlows ?? []).map((flow, index) => ({ flow, index })).filter(({ flow }) => flow.kind === 'expense');
  const activeCalculator = calculatorModeCopy[calculatorMode];
  const annualExpenseLabel =
    calculatorMode === 'fire-number'
      ? activeCalculator.primaryLabel
      : activeCalculator.secondaryLabel;
  const portfolioLabel =
    calculatorMode === 'fire-number'
      ? activeCalculator.secondaryLabel
      : activeCalculator.primaryLabel;
  const withdrawalCoverage = result.maxAnnualExpense - plan.annualExpense;
  const requiredWithdrawalRate =
    result.requiredPortfolio > 0 && Number.isFinite(result.requiredPortfolio)
      ? plan.annualExpense / result.requiredPortfolio
      : 0;
  const portfolioWithdrawalRate =
    plan.initialPortfolio > 0 ? result.maxAnnualExpense / plan.initialPortfolio : 0;
  const primaryResult =
    calculatorMode === 'fire-number'
      ? {
          label: 'Required FIRE number',
          value: formatMoney(result.requiredPortfolio),
          tone: 'accent' as const,
          detail: `${formatMoney(plan.annualExpense)} first-year withdrawal need.`
        }
      : {
          label: 'Annual withdrawal',
          value: formatMoney(result.maxAnnualExpense),
          tone: 'success' as const,
          detail: `${formatPercent(portfolioWithdrawalRate)} initial withdrawal rate.`
        };
  const secondaryResult =
    calculatorMode === 'fire-number'
      ? {
          label: 'Withdrawal rate',
          value: formatPercent(requiredWithdrawalRate),
          tone: 'neutral' as const
        }
      : {
          label: 'Need coverage',
          value:
            withdrawalCoverage >= 0
              ? `+${formatMoney(withdrawalCoverage)}`
              : formatMoney(withdrawalCoverage),
          tone: withdrawalCoverage >= 0 ? ('success' as const) : ('warning' as const)
        };
  const fireNumberGap = result.requiredPortfolio - plan.initialPortfolio;
  const supportResult =
    calculatorMode === 'fire-number'
      ? fireNumberGap > 0
        ? {
            label: 'Gap to FIRE number',
            value: formatMoney(fireNumberGap)
          }
        : {
            label: 'Above FIRE number',
            value: `+${formatMoney(Math.abs(fireNumberGap))}`
          }
      : {
          label: 'Portfolio tested',
          value: formatMoney(plan.initialPortfolio)
        };
  const projectionRows =
    projectionBasis === 'fire-number' ? result.expenseMode.rows : currentSimulation.rows;
  const projectionLabel =
    projectionBasis === 'fire-number'
      ? 'FIRE number projection'
      : 'Current portfolio stress test';
  const timelineWarnings: WarningNotice[] = [];

  if (timeline.retirementAge <= timeline.currentAge) {
    timelineWarnings.push({
      title: 'Timeline age range',
      message: 'Retirement age should be higher than current age.',
      severity: 'warning'
    });
  }

  if (timeline.planEndAge <= timeline.retirementAge) {
    timelineWarnings.push({
      title: 'Timeline duration',
      message: 'Plan end age should be higher than retirement age.',
      severity: 'critical'
    });
  }

  if (timelineDuration !== duration) {
    timelineWarnings.push({
      title: 'Timeline mismatch',
      message: `The age timeline implies ${timelineDuration} years while market periods model ${duration} years.`,
      severity: 'info'
    });
  }

  const warningNotices = [
    ...planWarnings(plan, result, currentSimulation.rows, duration),
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
    return scenarios.map((scenario, index) => {
      const adjustedPlan = applyScenario(plan, scenario);
      const adjustedResult = calculateFirePlan(adjustedPlan);
      const adjustedSimulation = stressTestCurrentPortfolio(adjustedPlan);

      return {
        id: scenario.id,
        label: scenario.label.trim() || `Scenario ${index + 1}`,
        scenario,
        requiredPortfolio: adjustedResult.requiredPortfolio,
        requiredDelta: adjustedResult.requiredPortfolio - result.requiredPortfolio,
        maxAnnualExpense: adjustedResult.maxAnnualExpense,
        actualFinalBalance: adjustedSimulation.finalBalance,
        depletionYear: firstNegativeYear(adjustedSimulation.rows)
      };
    });
  }, [plan, result.requiredPortfolio, scenarios]);

  const markInputsChanged = () => {
    setHasCalculated(false);
  };

  const chooseCalculatorMode = (nextMode: CalculatorMode) => {
    setCalculatorMode(nextMode);
    setHasCalculated(false);
  };

  const calculateNow = () => {
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
      setPlan((current) => ({ ...current, [key]: numericValue(event.target.value) }));
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
    plan,
    timeline,
    calculatorMode,
    scenarios
  });

  const applySnapshot = (snapshot: AppSnapshot) => {
    markInputsChanged();
    setPlan({
      ...initialPlan,
      ...snapshot.plan,
      recurringCashFlows: snapshot.plan.recurringCashFlows ?? []
    });
    setTimeline({ ...initialTimeline, ...snapshot.timeline });
    setCalculatorMode(snapshot.calculatorMode ?? 'fire-number');
    setScenarios(Array.isArray(snapshot.scenarios) ? snapshot.scenarios : initialScenarios);
    setHasCalculated(true);
    setCalculatorPanel('planner');
  };

  const saveCurrentPlan = () => {
    const name = saveName.trim() || 'Retirement plan';
    const savedPlan: SavedPlan = {
      id: `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      snapshot: buildSnapshot()
    };
    const nextPlans = [savedPlan, ...savedPlans.filter((item) => item.name !== name)].slice(0, 8);
    setSavedPlans(nextPlans);
    writeSavedPlans(nextPlans);
  };

  const removeSavedPlan = (id: string) => {
    const nextPlans = savedPlans.filter((item) => item.id !== id);
    setSavedPlans(nextPlans);
    writeSavedPlans(nextPlans);
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
      ratePeriods: [...current.ratePeriods, { duration: 10, r: 0.06, i: 0.03 }]
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
      oneOffEvents: [...current.oneOffEvents, { year: 1, amount: 0, label: 'New event' }]
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
          startYear: kind === 'income' ? Math.min(15, duration) : 1,
          endYear: duration,
          amount: kind === 'income' ? 24_000 : 10_000,
          label: kind === 'income' ? 'New income' : 'New expense',
          inflationAdjusted: true
        }
      ]
    }));
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

  const navigateTo = (nextRoute: AppRoute) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', nextRoute);
      window.scrollTo({ top: 0, left: 0 });
    }

    setRoute(nextRoute);
    setIsMenuOpen(false);
  };

  const navigate = (nextPanel: CalculatorPanel) => {
    setCalculatorPanel(nextPanel);
    setIsMenuOpen(false);
  };

  return (
    <div className="app" data-mood={mood} data-mode={mode}>
      <header className="topbar">
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            navigateTo('/');
          }}
        >
          <PiggyBank size={26} />
          <span>FinPath</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary">
          {routeItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                href={item.path}
                className={isRouteActive(route, item.path) ? 'nav-button active' : 'nav-button'}
                onClick={(event) => {
                  event.preventDefault();
                  navigateTo(item.path);
                }}
              >
                <Icon size={17} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="topbar-actions">
          <button className="secondary-button topbar-link" onClick={() => navigateTo('/calculators/fire')}>
            Try FIRE
          </button>
          <button className="secondary-button topbar-link" onClick={() => navigateTo('/dashboard')}>
            Sign in
          </button>
          <button className="primary-button topbar-primary" onClick={() => navigateTo('/dashboard')}>
            Create account
          </button>
          <div className="mood-switcher" aria-label="Mood">
            {(Object.keys(moodLabels) as Mood[]).map((moodName) => (
              <button
                key={moodName}
                className={mood === moodName ? 'mood-dot active' : 'mood-dot'}
                data-mood-name={moodName}
                title={moodLabels[moodName]}
                aria-label={moodLabels[moodName]}
                onClick={() => setMood(moodName)}
              />
            ))}
          </div>
          <button
            className="icon-button"
            aria-label="Toggle light and dark mode"
            onClick={() => setMode((current) => (current === 'light' ? 'dark' : 'light'))}
          >
            {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <nav className="mobile-nav" aria-label="Mobile primary">
          {routeItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={isRouteActive(route, item.path) ? 'nav-button active' : 'nav-button'}
                onClick={() => navigateTo(item.path)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
          <button className="nav-button mobile-cta" onClick={() => navigateTo('/calculators/fire')}>
            <Calculator size={17} />
            Try FIRE Calculator
          </button>
        </nav>
      )}

      <main className={route === '/' ? 'workspace landing-workspace' : 'workspace'}>
        {route === '/' ? (
          <LandingPage onNavigate={navigateTo} />
        ) : route === '/calculators' ? (
          <CalculatorsPage onNavigate={navigateTo} />
        ) : isPlatformRoute(route) ? (
          <PlatformPage route={route} onNavigate={navigateTo} />
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
            <p>
              Answer one retirement planning question at a time. Core inputs stay up front; market
              periods, cash-flow events, and local draft management are tucked below.
            </p>
          </div>
          <span className="pill">{activeCalculator.shortTitle}</span>
        </section>

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
                <InfoTip text="Choose FIRE number to solve for a portfolio target, or withdrawal to solve for annual spending from a portfolio." />
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

            <Field
              label="Current age"
              help="Your age today. It is used to check that the retirement timeline makes sense."
              issue={
                timeline.retirementAge <= timeline.currentAge
                  ? 'Current age should be below retirement age.'
                  : undefined
              }
            >
              <input
                type="number"
                min="0"
                value={timeline.currentAge}
                onChange={setTimelineValue('currentAge')}
              />
            </Field>
            <Field
              label="Retirement age"
              help="The age when withdrawals start in this plan."
              issue={
                timeline.retirementAge <= timeline.currentAge
                  ? 'Retirement age should be higher.'
                  : undefined
              }
            >
              <input
                type="number"
                min="0"
                value={timeline.retirementAge}
                onChange={setTimelineValue('retirementAge')}
              />
            </Field>
            <Field
              label="Plan end age"
              help="The age through which the model should keep funding withdrawals."
              issue={
                timeline.planEndAge <= timeline.retirementAge ? 'End age should be higher.' : undefined
              }
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
                label={portfolioLabel}
                help="The portfolio balance you want to test for retirement income."
                issue={fieldIssue('initialPortfolio')}
              >
                <input
                  type="number"
                  min="0"
                  value={plan.initialPortfolio}
                  onChange={setMoney('initialPortfolio')}
                />
              </Field>
            )}

            <Field
              label={annualExpenseLabel}
              help={
                calculatorMode === 'fire-number'
                  ? 'Your estimated first-year retirement spending before inflation.'
                  : 'An optional spending goal used to show whether the calculated withdrawal covers your need.'
              }
              issue={fieldIssue('annualExpense')}
            >
              <input
                type="number"
                min="0"
                value={plan.annualExpense}
                onChange={setMoney('annualExpense')}
              />
            </Field>

            {calculatorMode === 'fire-number' && (
              <Field
                label={portfolioLabel}
                help="Your current invested assets. This is used for the funding gap and stress test."
                issue={fieldIssue('initialPortfolio')}
              >
                <input
                  type="number"
                  min="0"
                  value={plan.initialPortfolio}
                  onChange={setMoney('initialPortfolio')}
                />
              </Field>
            )}
          </div>

          <div className="quick-actions">
            <button className="primary-button icon-text-button" onClick={calculateNow}>
              <Calculator size={17} />
              Calculate
            </button>
          </div>

          {hasCalculated && (
            <div className="calculator-result-card hero-result">
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

        <details className="advanced-shell">
          <summary className="advanced-summary">
            <span>
              <strong>Advanced assumptions</strong>
              <small>Market periods, withdrawal timing, cash-flow events, and local draft tools</small>
            </span>
            <SlidersHorizontal size={18} />
          </summary>
          <div className="planner-grid" id="planner">
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
                {plan.oneOffEvents.map((event, index) => (
                  <div className="repeat-row event-row" key={`${index}-${event.label}`}>
                    <Field label="Label">
                      <input
                        type="text"
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
                    <small>Add Social Security, pension, rental, or part-time income.</small>
                  </article>
                )}
                {incomeStreams.map(({ flow, index }) => (
                  <div className="repeat-row recurring-row" key={`income-${index}-${flow.label}`}>
                    <Field label="Label">
                      <input
                        type="text"
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
                    <small>Add healthcare, travel, mortgage, or late-life care phases.</small>
                  </article>
                )}
                {expensePhases.map(({ flow, index }) => (
                  <div className="repeat-row recurring-row" key={`expense-${index}-${flow.label}`}>
                    <Field label="Label">
                      <input
                        type="text"
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

            <section className="panel utility-panel" aria-labelledby="saved-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Scenarios</p>
                  <h2 id="saved-title">Save and move plans</h2>
                </div>
              </div>

              <div className="utility-grid">
                <Field label="Plan name">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                  />
                </Field>
                <button className="secondary-button icon-text-button" onClick={saveCurrentPlan}>
                  <Save size={16} />
                  Save
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
                  onChange={importPlanJson}
                />
              </div>

              <div className="saved-list">
                {savedPlans.length === 0 ? (
                  <article className="scenario-card empty-card">
                    <span>No saved plans</span>
                    <small>Saved plans stay in this browser.</small>
                  </article>
                ) : (
                  savedPlans.map((item) => (
                    <article className="saved-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>{new Date(item.createdAt).toLocaleDateString()}</small>
                      </div>
                      <div className="saved-actions">
                        <button className="secondary-button" onClick={() => applySnapshot(item.snapshot)}>
                          Load
                        </button>
                        <button
                          className="icon-button row-action"
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
          </div>
        </details>

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
                <span className="pill">{plan.withdrawalTiming === 'start' ? 'Start-year' : 'End-year'}</span>
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
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={chartRows} margin={{ top: 10, right: 22, left: 8, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} width={72} />
                    <Tooltip content={<MoneyTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name={projectionLabel}
                      stroke="var(--chart-primary)"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="withdrawal"
                      name="Withdrawal"
                      stroke="var(--chart-secondary)"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <YearByYearTable rows={projectionRows} label={projectionLabel} />
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
                  <strong>{formatMoney(row.requiredPortfolio)}</strong>
                  <small>FIRE number for {row.label}</small>
                  <small>
                    Vs planner: {row.requiredDelta > 0 ? '+' : ''}
                    {formatMoney(row.requiredDelta)}
                  </small>
                  <small>Portfolio income: {formatMoney(row.maxAnnualExpense)}</small>
                  <small>Current ending: {formatMoney(row.actualFinalBalance)}</small>
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
          </>
        )}
      </main>
    </div>
  );
}

export default App;
