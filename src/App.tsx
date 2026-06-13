import { SignInButton, SignOutButton, SignUpButton, UserButton } from '@clerk/react';
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
  LockKeyhole,
  LogIn,
  LogOut,
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
  UserCircle,
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
import type { AuthState } from './auth';

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
  updatedAt?: string;
  versionNumber?: number;
  snapshot: AppSnapshot;
};

type AccountProfile = {
  birthYear: number | null;
  defaultCurrency: string;
  displayName: string | null;
  householdName: string | null;
  targetRetirementAge: number | null;
  updatedAt: string;
  userId: string;
};

type AccountProfileDraft = {
  birthYear: string;
  defaultCurrency: string;
  displayName: string;
  householdName: string;
  targetRetirementAge: string;
};

type AccountProfileUpdate = {
  birthYear: number | null;
  defaultCurrency: string;
  displayName: string | null;
  householdName: string | null;
  targetRetirementAge: number | null;
};

type FinancialAccountType =
  | 'cash'
  | 'checking'
  | 'savings'
  | 'investment'
  | 'retirement'
  | 'credit'
  | 'loan'
  | 'mortgage'
  | 'real_estate'
  | 'other_asset'
  | 'other_liability';

type AccountCategory = 'asset' | 'liability';

type AccountBalance = {
  balanceCents: number;
  balanceDate: string;
  createdAt: string;
  id: string;
};

type FinancialAccount = {
  accountType: FinancialAccountType;
  balanceHistory: AccountBalance[];
  category: AccountCategory;
  createdAt: string;
  currency: string;
  id: string;
  institutionName: string | null;
  isActive: boolean;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
  updatedAt: string;
};

type AccountSummary = {
  accountCount: number;
  assetsCents: number;
  liabilityAccountCount: number;
  liabilitiesCents: number;
  netWorthCents: number;
};

type AccountDraft = {
  accountType: FinancialAccountType;
  balanceAmount: string;
  balanceDate: string;
  currency: string;
  institutionName: string;
  name: string;
};

type BalanceDraft = {
  amount: string;
  date: string;
};

const SAVED_PLANS_KEY = 'firecalc.savedPlans.v1';

const accountTypeOptions: Array<{ category: AccountCategory; label: string; value: FinancialAccountType }> = [
  { category: 'asset', label: 'Cash', value: 'cash' },
  { category: 'asset', label: 'Checking', value: 'checking' },
  { category: 'asset', label: 'Savings', value: 'savings' },
  { category: 'asset', label: 'Investment', value: 'investment' },
  { category: 'asset', label: 'Retirement', value: 'retirement' },
  { category: 'asset', label: 'Real estate', value: 'real_estate' },
  { category: 'asset', label: 'Other asset', value: 'other_asset' },
  { category: 'liability', label: 'Credit card', value: 'credit' },
  { category: 'liability', label: 'Loan', value: 'loan' },
  { category: 'liability', label: 'Mortgage', value: 'mortgage' },
  { category: 'liability', label: 'Other liability', value: 'other_liability' }
];

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

async function authenticatedJsonRequest(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await auth.getToken();

  if (!token) {
    throw new Error('No Clerk session token is available.');
  }

  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(path, {
    ...init,
    headers
  });
}

async function loadAccountPlans(auth: Extract<AuthState, { status: 'signed-in' }>): Promise<SavedPlan[]> {
  const response = await authenticatedJsonRequest(auth, '/api/plans');

  if (!response.ok) {
    throw new Error('Unable to load account plans.');
  }

  const body = await response.json();

  if (!isRecord(body) || !Array.isArray(body.plans)) {
    return [];
  }

  return body.plans
    .map(toSavedPlan)
    .filter((plan): plan is SavedPlan => Boolean(plan))
    .slice(0, 8);
}

async function createAccountPlan(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  payload: { name: string; result: FirePlanResult; snapshot: AppSnapshot }
): Promise<SavedPlan> {
  const response = await authenticatedJsonRequest(auth, '/api/plans', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  return readSavedPlanResponse(response, 'Unable to save account plan.');
}

async function updateAccountPlan(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  id: string,
  payload: { name: string; result: FirePlanResult; snapshot: AppSnapshot }
): Promise<SavedPlan> {
  const response = await authenticatedJsonRequest(auth, `/api/plans/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    method: 'PUT'
  });

  return readSavedPlanResponse(response, 'Unable to update account plan.');
}

async function deleteAccountPlan(auth: Extract<AuthState, { status: 'signed-in' }>, id: string): Promise<void> {
  const response = await authenticatedJsonRequest(auth, `/api/plans/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Unable to delete account plan.');
  }
}

async function readSavedPlanResponse(response: Response, errorMessage: string): Promise<SavedPlan> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body = await response.json();
  const plan = isRecord(body) ? toSavedPlan(body.plan) : null;

  if (!plan) {
    throw new Error(errorMessage);
  }

  return plan;
}

function toSavedPlan(value: unknown): SavedPlan | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  if (typeof value.createdAt !== 'string' || !isAppSnapshot(value.snapshot)) {
    return null;
  }

  return {
    createdAt: value.createdAt,
    id: value.id,
    name: value.name,
    snapshot: value.snapshot,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
    versionNumber: typeof value.versionNumber === 'number' ? value.versionNumber : undefined
  };
}

async function loadAccountProfile(auth: Extract<AuthState, { status: 'signed-in' }>): Promise<AccountProfile> {
  const response = await authenticatedJsonRequest(auth, '/api/profile');

  return readProfileResponse(response, 'Unable to load account profile.');
}

async function updateAccountProfile(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  payload: AccountProfileUpdate
): Promise<AccountProfile> {
  const response = await authenticatedJsonRequest(auth, '/api/profile', {
    body: JSON.stringify(payload),
    method: 'PUT'
  });

  return readProfileResponse(response, 'Unable to save account profile.');
}

async function readProfileResponse(response: Response, errorMessage: string): Promise<AccountProfile> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body = await response.json();
  const profile = isRecord(body) ? toAccountProfile(body.profile) : null;

  if (!profile) {
    throw new Error(errorMessage);
  }

  return profile;
}

function toAccountProfile(value: unknown): AccountProfile | null {
  if (!isRecord(value) || typeof value.userId !== 'string' || typeof value.defaultCurrency !== 'string') {
    return null;
  }

  if (typeof value.updatedAt !== 'string') {
    return null;
  }

  return {
    birthYear: typeof value.birthYear === 'number' ? value.birthYear : null,
    defaultCurrency: value.defaultCurrency,
    displayName: typeof value.displayName === 'string' ? value.displayName : null,
    householdName: typeof value.householdName === 'string' ? value.householdName : null,
    targetRetirementAge: typeof value.targetRetirementAge === 'number' ? value.targetRetirementAge : null,
    updatedAt: value.updatedAt,
    userId: value.userId
  };
}

function emptyProfileDraft(): AccountProfileDraft {
  return {
    birthYear: '',
    defaultCurrency: 'USD',
    displayName: '',
    householdName: '',
    targetRetirementAge: ''
  };
}

function profileToDraft(profile: AccountProfile): AccountProfileDraft {
  return {
    birthYear: profile.birthYear === null ? '' : String(profile.birthYear),
    defaultCurrency: profile.defaultCurrency,
    displayName: profile.displayName ?? '',
    householdName: profile.householdName ?? '',
    targetRetirementAge: profile.targetRetirementAge === null ? '' : String(profile.targetRetirementAge)
  };
}

function draftToProfileUpdate(draft: AccountProfileDraft): AccountProfileUpdate {
  return {
    birthYear: optionalIntegerFromDraft(draft.birthYear),
    defaultCurrency: draft.defaultCurrency.trim().toUpperCase() || 'USD',
    displayName: optionalTextFromDraft(draft.displayName),
    householdName: optionalTextFromDraft(draft.householdName),
    targetRetirementAge: optionalIntegerFromDraft(draft.targetRetirementAge)
  };
}

function optionalTextFromDraft(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function optionalIntegerFromDraft(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isInteger(parsed) ? parsed : null;
}

async function loadFinancialAccounts(auth: Extract<AuthState, { status: 'signed-in' }>): Promise<{
  accounts: FinancialAccount[];
  summary: AccountSummary;
}> {
  const response = await authenticatedJsonRequest(auth, '/api/accounts');

  if (!response.ok) {
    throw new Error('Unable to load financial accounts.');
  }

  const body = await response.json();
  const accounts = isRecord(body) && Array.isArray(body.accounts)
    ? body.accounts.map(toFinancialAccount).filter((account): account is FinancialAccount => Boolean(account))
    : [];
  const summary = isRecord(body) ? toAccountSummary(body.summary) : null;

  return {
    accounts,
    summary: summary ?? summarizeAccountList(accounts)
  };
}

async function createFinancialAccountRecord(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  draft: AccountDraft
): Promise<FinancialAccount> {
  const balanceCents = moneyInputToCents(draft.balanceAmount);
  const payload = {
    accountType: draft.accountType,
    balanceCents: balanceCents ?? 0,
    balanceDate: draft.balanceDate,
    currency: draft.currency.trim().toUpperCase() || 'USD',
    institutionName: optionalTextFromDraft(draft.institutionName),
    name: draft.name.trim()
  };
  const response = await authenticatedJsonRequest(auth, '/api/accounts', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  return readFinancialAccountResponse(response, 'Unable to create account.');
}

async function archiveFinancialAccountRecord(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  id: string
): Promise<void> {
  const response = await authenticatedJsonRequest(auth, `/api/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Unable to archive account.');
  }
}

async function addFinancialAccountBalanceRecord(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  id: string,
  draft: BalanceDraft
): Promise<FinancialAccount> {
  const balanceCents = moneyInputToCents(draft.amount);

  if (balanceCents === null) {
    throw new Error('Balance amount is required.');
  }

  const response = await authenticatedJsonRequest(auth, `/api/accounts/${encodeURIComponent(id)}/balances`, {
    body: JSON.stringify({
      balanceCents,
      balanceDate: draft.date
    }),
    method: 'POST'
  });

  return readFinancialAccountResponse(response, 'Unable to save balance.');
}

async function readFinancialAccountResponse(response: Response, errorMessage: string): Promise<FinancialAccount> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body = await response.json();
  const account = isRecord(body) ? toFinancialAccount(body.account) : null;

  if (!account) {
    throw new Error(errorMessage);
  }

  return account;
}

function toFinancialAccount(value: unknown): FinancialAccount | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  if (
    !isFinancialAccountType(value.accountType) ||
    !isAccountCategory(value.category) ||
    typeof value.currency !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  const balances = Array.isArray(value.balanceHistory)
    ? value.balanceHistory.map(toAccountBalance).filter((balance): balance is AccountBalance => Boolean(balance))
    : [];

  return {
    accountType: value.accountType,
    balanceHistory: balances,
    category: value.category,
    createdAt: value.createdAt,
    currency: value.currency,
    id: value.id,
    institutionName: typeof value.institutionName === 'string' ? value.institutionName : null,
    isActive: value.isActive !== false,
    latestBalanceCents: typeof value.latestBalanceCents === 'number' ? value.latestBalanceCents : 0,
    latestBalanceDate: typeof value.latestBalanceDate === 'string' ? value.latestBalanceDate : null,
    name: value.name,
    updatedAt: value.updatedAt
  };
}

function toAccountBalance(value: unknown): AccountBalance | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.balanceCents !== 'number' ||
    typeof value.balanceDate !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    balanceCents: value.balanceCents,
    balanceDate: value.balanceDate,
    createdAt: value.createdAt,
    id: value.id
  };
}

function toAccountSummary(value: unknown): AccountSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.accountCount !== 'number' ||
    typeof value.assetsCents !== 'number' ||
    typeof value.liabilityAccountCount !== 'number' ||
    typeof value.liabilitiesCents !== 'number' ||
    typeof value.netWorthCents !== 'number'
  ) {
    return null;
  }

  return {
    accountCount: value.accountCount,
    assetsCents: value.assetsCents,
    liabilityAccountCount: value.liabilityAccountCount,
    liabilitiesCents: value.liabilitiesCents,
    netWorthCents: value.netWorthCents
  };
}

function summarizeAccountList(accounts: FinancialAccount[]): AccountSummary {
  const summary = accounts.reduce<AccountSummary>(
    (current, account) => {
      if (account.category === 'liability') {
        return {
          ...current,
          liabilitiesCents: current.liabilitiesCents + account.latestBalanceCents,
          liabilityAccountCount: current.liabilityAccountCount + 1
        };
      }

      return {
        ...current,
        assetsCents: current.assetsCents + account.latestBalanceCents
      };
    },
    {
      accountCount: accounts.length,
      assetsCents: 0,
      liabilityAccountCount: 0,
      liabilitiesCents: 0,
      netWorthCents: 0
    }
  );

  return {
    ...summary,
    netWorthCents: summary.assetsCents - summary.liabilitiesCents
  };
}

function emptyAccountDraft(): AccountDraft {
  return {
    accountType: 'checking',
    balanceAmount: '',
    balanceDate: todayInputDate(),
    currency: 'USD',
    institutionName: '',
    name: ''
  };
}

function emptyBalanceDraft(): BalanceDraft {
  return {
    amount: '',
    date: todayInputDate()
  };
}

function buildBalanceDraftMap(accounts: FinancialAccount[]): Record<string, BalanceDraft> {
  return accounts.reduce<Record<string, BalanceDraft>>((drafts, account) => {
    drafts[account.id] = emptyBalanceDraft();
    return drafts;
  }, {});
}

function moneyInputToCents(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, '');

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

function formatCents(value: number): string {
  return formatMoney(value / 100);
}

function accountTypeLabel(value: FinancialAccountType): string {
  return accountTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function isFinancialAccountType(value: unknown): value is FinancialAccountType {
  return typeof value === 'string' && accountTypeOptions.some((option) => option.value === value);
}

function isAccountCategory(value: unknown): value is AccountCategory {
  return value === 'asset' || value === 'liability';
}

function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
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
  document.body.appendChild(link);
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
  document.body.appendChild(link);
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
    title: 'Your financial snapshot starts here.',
    description:
      'Net worth, assets, liabilities, and recent account balance updates roll up from saved tracker data.',
    icon: LayoutDashboard,
    cards: [
      { label: 'Net worth', value: '$0', detail: 'Manual accounts and balances power this number.' },
      { label: 'Goal progress', value: '0%', detail: 'Goals will roll up into a concise progress view.' },
      { label: 'Saved plans', value: '0', detail: 'FIRE and future planning modules will save here.' }
    ]
  },
  '/accounts': {
    eyebrow: 'Accounts',
    title: 'Track manual assets, debt, and balance history.',
    description:
      'Add accounts by hand, record balance snapshots, and keep the first net-worth dashboard current before imports are introduced.',
    icon: CircleDollarSign,
    cards: [
      { label: 'Assets', value: 'Ready', detail: 'Cash, brokerage, retirement, property, and other holdings.' },
      { label: 'Liabilities', value: 'Ready', detail: 'Credit cards, loans, mortgages, and other debt balances.' },
      { label: 'Balances', value: 'Ready', detail: 'Snapshot history for dashboard calculations.' }
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
    <SignInButton mode="redirect" fallbackRedirectUrl="/dashboard">
      {button}
    </SignInButton>
  ) : (
    <SignUpButton mode="redirect" fallbackRedirectUrl="/dashboard">
      {button}
    </SignUpButton>
  );
}

function SignedInProfileBand({ auth }: { auth: Extract<AuthState, { status: 'signed-in' }> }) {
  return (
    <section className="profile-band" aria-label="Signed-in profile">
      <span className="feature-icon">
        <UserCircle size={20} />
      </span>
      <div>
        <span>Signed in as</span>
        <strong>{auth.user.displayName}</strong>
        {auth.user.email && <small>{auth.user.email}</small>}
      </div>
      <code>{auth.user.id}</code>
    </section>
  );
}

function ProfileSettingsPanel({
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
          {message ? <p className="profile-status">{message}</p> : null}
          <button className="primary-button icon-text-button" disabled={isLoading || isSaving} type="submit">
            <Save size={16} />
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}

function DashboardPanel({
  accounts,
  isLoading,
  message,
  onNavigate,
  summary
}: {
  accounts: FinancialAccount[];
  isLoading: boolean;
  message: string;
  onNavigate: (route: AppRoute) => void;
  summary: AccountSummary;
}) {
  const recentAccounts = accounts.slice(0, 5);

  return (
    <section className="financial-dashboard" aria-labelledby="dashboard-summary-title">
      <div className="dashboard-summary-grid">
        <article className="tracker-metric tracker-metric-primary">
          <span>Net worth</span>
          <strong>{formatCents(summary.netWorthCents)}</strong>
          <small>{summary.accountCount} active accounts</small>
        </article>
        <article className="tracker-metric">
          <span>Assets</span>
          <strong>{formatCents(summary.assetsCents)}</strong>
          <small>Cash, investments, property, and other assets</small>
        </article>
        <article className="tracker-metric">
          <span>Liabilities</span>
          <strong>{formatCents(summary.liabilitiesCents)}</strong>
          <small>{summary.liabilityAccountCount} debt accounts</small>
        </article>
      </div>

      <section className="account-panel" aria-labelledby="dashboard-summary-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Balance rollup</p>
            <h2 id="dashboard-summary-title">Latest account snapshot</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/accounts')}>
            Accounts
            <ChevronRight size={16} />
          </button>
        </div>

        {message ? <p className="account-status">{message}</p> : null}

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
                    {account.latestBalanceDate ? ` - ${account.latestBalanceDate}` : ''}
                  </small>
                </div>
                <span className={account.category === 'liability' ? 'amount-negative' : 'amount-positive'}>
                  {account.category === 'liability' ? '-' : ''}
                  {formatCents(account.latestBalanceCents)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function AccountsPanel({
  accounts,
  balanceDrafts,
  draft,
  isLoading,
  isSaving,
  message,
  onArchiveAccount,
  onBalanceDraftChange,
  onCreateAccount,
  onDraftChange,
  onRecordBalance,
  summary
}: {
  accounts: FinancialAccount[];
  balanceDrafts: Record<string, BalanceDraft>;
  draft: AccountDraft;
  isLoading: boolean;
  isSaving: boolean;
  message: string;
  onArchiveAccount: (id: string) => void;
  onBalanceDraftChange: (id: string, field: keyof BalanceDraft, value: string) => void;
  onCreateAccount: () => void;
  onDraftChange: (field: keyof AccountDraft, value: string) => void;
  onRecordBalance: (id: string) => void;
  summary: AccountSummary;
}) {
  return (
    <section className="account-workspace" aria-labelledby="accounts-workspace-title">
      <div className="account-overview-strip">
        <article>
          <span>Net worth</span>
          <strong>{formatCents(summary.netWorthCents)}</strong>
        </article>
        <article>
          <span>Assets</span>
          <strong>{formatCents(summary.assetsCents)}</strong>
        </article>
        <article>
          <span>Liabilities</span>
          <strong>{formatCents(summary.liabilitiesCents)}</strong>
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

        {message ? <p className="account-status">{message}</p> : null}
      </section>

      <section className="account-panel" aria-label="Saved accounts">
        {isLoading ? (
          <article className="scenario-card empty-card">
            <span>Loading accounts</span>
            <small>Checking saved account balances.</small>
          </article>
        ) : accounts.length === 0 ? (
          <article className="scenario-card empty-card">
            <span>No accounts yet</span>
            <small>Assets and debt balances will appear here.</small>
          </article>
        ) : (
          <div className="account-card-list">
            {accounts.map((account) => {
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
                      <span>{account.latestBalanceDate ?? 'No balance date'}</span>
                      <strong>{formatCents(account.latestBalanceCents)}</strong>
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
                          <strong>{formatCents(balance.balanceCents)}</strong>
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

function AuthGate({
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
      ? 'Connect Clerk before opening account routes.'
      : auth.status === 'loading'
        ? 'Checking your session.'
        : `Sign in to open ${page.eyebrow}.`;
  const description =
    auth.status === 'not-configured'
      ? 'The app is wired for Clerk, but this environment is missing the public browser key. The FIRE calculator demo remains available without an account.'
      : auth.status === 'loading'
        ? 'FinPath is confirming whether there is an active Clerk session for this browser.'
        : `${page.eyebrow} is part of the account-backed planning shell. You can still use the public FIRE calculator demo without signing in.`;

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

        {auth.status === 'not-configured' && (
          <div className="auth-env-list" aria-label="Required Clerk environment variables">
            <span>Required before production auth can run</span>
            <code>VITE_CLERK_PUBLISHABLE_KEY</code>
            <code>CLERK_PUBLISHABLE_KEY</code>
            <code>CLERK_SECRET_KEY</code>
            <code>CLERK_AUTHORIZED_PARTIES</code>
          </div>
        )}

        <div className="auth-gate-actions">
          {auth.status === 'loading' ? (
            <button className="primary-button icon-text-button" disabled>
              <LogIn size={17} />
              Checking session
            </button>
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
            </>
          ) : (
            <button className="primary-button icon-text-button" disabled>
              <LockKeyhole size={17} />
              Auth not configured
            </button>
          )}
          <button className="secondary-button icon-text-button" onClick={() => onNavigate('/calculators/fire')}>
            <Calculator size={16} />
            Try FIRE calculator
          </button>
        </div>
      </div>
    </section>
  );
}

function LandingPage({ auth, onNavigate }: { auth: AuthState; onNavigate: (route: AppRoute) => void }) {
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
            {auth.isSignedIn ? (
              <>
                <button className="primary-button icon-text-button" onClick={() => onNavigate('/dashboard')}>
                  Open dashboard
                  <ArrowRight size={17} />
                </button>
                <SignOutButton redirectUrl="/">
                  <button className="secondary-button icon-text-button">
                    <LogOut size={16} />
                    Sign out
                  </button>
                </SignOutButton>
              </>
            ) : (
              <>
                <AuthActionButton
                  auth={auth}
                  kind="sign-up"
                  className="primary-button icon-text-button"
                  onUnavailable={() => onNavigate('/dashboard')}
                >
                  Create account
                  <ArrowRight size={17} />
                </AuthActionButton>
                <AuthActionButton
                  auth={auth}
                  kind="sign-in"
                  className="secondary-button icon-text-button"
                  onUnavailable={() => onNavigate('/dashboard')}
                >
                  <LogIn size={16} />
                  Sign in
                </AuthActionButton>
              </>
            )}
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
  accountDraft,
  accountMessage,
  accountSummary,
  balanceDrafts,
  auth,
  financialAccounts,
  isLoadingProfile,
  isLoadingAccounts,
  isSavingAccount,
  isSavingProfile,
  onAccountDraftChange,
  onArchiveAccount,
  onBalanceDraftChange,
  onCreateAccount,
  onProfileDraftChange,
  onProfileSave,
  onRecordBalance,
  route,
  onNavigate,
  profile,
  profileDraft,
  profileMessage
}: {
  accountDraft: AccountDraft;
  accountMessage: string;
  accountSummary: AccountSummary;
  balanceDrafts: Record<string, BalanceDraft>;
  auth: Extract<AuthState, { status: 'signed-in' }>;
  financialAccounts: FinancialAccount[];
  isLoadingAccounts: boolean;
  isLoadingProfile: boolean;
  isSavingAccount: boolean;
  isSavingProfile: boolean;
  onAccountDraftChange: (field: keyof AccountDraft, value: string) => void;
  onArchiveAccount: (id: string) => void;
  onBalanceDraftChange: (id: string, field: keyof BalanceDraft, value: string) => void;
  onCreateAccount: () => void;
  onProfileDraftChange: (field: keyof AccountProfileDraft, value: string) => void;
  onProfileSave: () => void;
  onRecordBalance: (id: string) => void;
  route: Exclude<AppRoute, '/' | '/calculators' | '/calculators/fire'>;
  onNavigate: (route: AppRoute) => void;
  profile: AccountProfile | null;
  profileDraft: AccountProfileDraft;
  profileMessage: string;
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
          isLoading={isLoadingAccounts}
          message={accountMessage}
          summary={accountSummary}
          onNavigate={onNavigate}
        />
      ) : null}

      {route === '/accounts' ? (
        <AccountsPanel
          accounts={financialAccounts}
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
          onRecordBalance={onRecordBalance}
        />
      ) : null}

      {route === '/settings' ? (
        <ProfileSettingsPanel
          draft={profileDraft}
          isLoading={isLoadingProfile}
          isSaving={isSavingProfile}
          message={profileMessage}
          profile={profile}
          onChange={onProfileDraftChange}
          onSave={onProfileSave}
        />
      ) : null}

      {route === '/dashboard' || route === '/accounts' ? null : (
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
          <strong>{page.eyebrow} route is wired.</strong>
          <small>
            {route === '/dashboard' || route === '/accounts'
              ? 'Account balances now power the tracker MVP while goals and imports remain future phases.'
              : 'Continue into the working FIRE module while future platform modules are still being built.'}
          </small>
        </div>
        <button
          className="secondary-button icon-text-button"
          onClick={() => onNavigate(route === '/dashboard' ? '/accounts' : '/calculators/fire')}
        >
          {route === '/dashboard' ? 'Accounts' : 'Try FIRE'}
          <ChevronRight size={16} />
        </button>
      </section>
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
        <button className="secondary-button topbar-link" onClick={() => onNavigate('/calculators/fire')}>
          Try FIRE
        </button>
        <button className="secondary-button topbar-link" onClick={() => onNavigate('/dashboard')}>
          Dashboard
        </button>
        <div className="topbar-profile" aria-label="Current user">
          <UserButton userProfileMode="modal" />
          <span>{auth.user.displayName}</span>
        </div>
        <SignOutButton redirectUrl="/">
          <button className="secondary-button topbar-link icon-text-button">
            <LogOut size={16} />
            Sign out
          </button>
        </SignOutButton>
      </>
    );
  }

  return (
    <>
      <button className="secondary-button topbar-link" onClick={() => onNavigate('/calculators/fire')}>
        Try FIRE
      </button>
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
  const [isLoadingSavedPlans, setIsLoadingSavedPlans] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planStorageMessage, setPlanStorageMessage] = useState('');
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<AccountProfileDraft>(emptyProfileDraft);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [accountDraft, setAccountDraft] = useState<AccountDraft>(emptyAccountDraft);
  const [balanceDrafts, setBalanceDrafts] = useState<Record<string, BalanceDraft>>({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');
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

  useEffect(() => {
    let isCancelled = false;

    if (auth.status !== 'signed-in') {
      setSavedPlans(readSavedPlans());
      setIsLoadingSavedPlans(false);
      setPlanStorageMessage('');
      return () => {
        isCancelled = true;
      };
    }

    setIsLoadingSavedPlans(true);
    setPlanStorageMessage('Loading account plans...');

    loadAccountPlans(auth)
      .then((plans) => {
        if (isCancelled) {
          return;
        }

        setSavedPlans(plans);
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

  const result = useMemo<FirePlanResult>(() => calculateFirePlan(plan), [plan]);
  const accountSummary = useMemo<AccountSummary>(() => summarizeAccountList(financialAccounts), [financialAccounts]);
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

  const saveCurrentPlan = async () => {
    const name = saveName.trim() || 'Retirement plan';
    const snapshot = buildSnapshot();

    if (auth.status === 'signed-in') {
      const existingPlan = savedPlans.find((item) => item.name.toLowerCase() === name.toLowerCase());

      setIsSavingPlan(true);
      setPlanStorageMessage(existingPlan ? 'Updating account plan...' : 'Saving account plan...');

      try {
        const savedPlan = existingPlan
          ? await updateAccountPlan(auth, existingPlan.id, { name, result, snapshot })
          : await createAccountPlan(auth, { name, result, snapshot });
        const nextPlans = [
          savedPlan,
          ...savedPlans.filter((item) => item.id !== savedPlan.id && item.name.toLowerCase() !== name.toLowerCase())
        ].slice(0, 8);

        setSavedPlans(nextPlans);
        setPlanStorageMessage('Saved to your account.');
      } catch {
        setPlanStorageMessage('Plan could not be saved to your account. Export JSON still works.');
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

  const removeSavedPlan = async (id: string) => {
    if (auth.status === 'signed-in') {
      setIsSavingPlan(true);
      setPlanStorageMessage('Deleting account plan...');

      try {
        await deleteAccountPlan(auth, id);
        setSavedPlans((current) => current.filter((item) => item.id !== id));
        setPlanStorageMessage('Plan deleted from your account.');
      } catch {
        setPlanStorageMessage('Plan could not be deleted from your account.');
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
          <TopbarAuthActions auth={auth} onNavigate={navigateTo} />
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
          {auth.isSignedIn ? (
            <>
              <button className="nav-button mobile-cta" onClick={() => navigateTo('/dashboard')}>
                <LayoutDashboard size={17} />
                Open dashboard
              </button>
              <SignOutButton redirectUrl="/">
                <button className="nav-button mobile-cta">
                  <LogOut size={17} />
                  Sign out
                </button>
              </SignOutButton>
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

      <main className={route === '/' ? 'workspace landing-workspace' : 'workspace'}>
        {route === '/' ? (
          <LandingPage auth={auth} onNavigate={navigateTo} />
        ) : route === '/calculators' ? (
          <CalculatorsPage onNavigate={navigateTo} />
        ) : isPlatformRoute(route) ? (
          auth.isSignedIn ? (
            <PlatformPage
              accountDraft={accountDraft}
              accountMessage={accountMessage}
              accountSummary={accountSummary}
              balanceDrafts={balanceDrafts}
              auth={auth}
              financialAccounts={financialAccounts}
              isLoadingAccounts={isLoadingAccounts}
              isLoadingProfile={isLoadingProfile}
              isSavingAccount={isSavingAccount}
              isSavingProfile={isSavingProfile}
              profile={accountProfile}
              profileDraft={profileDraft}
              profileMessage={profileMessage}
              route={route}
              onNavigate={navigateTo}
              onAccountDraftChange={updateAccountDraft}
              onArchiveAccount={archiveFinancialAccount}
              onBalanceDraftChange={updateBalanceDraft}
              onCreateAccount={createFinancialAccount}
              onProfileDraftChange={updateProfileDraft}
              onProfileSave={saveAccountProfile}
              onRecordBalance={recordAccountBalance}
            />
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

              <div className="auth-save-note">
                <UserCircle size={17} />
                <span>
                  {auth.isSignedIn
                    ? `Signed in as ${auth.user.displayName}; FIRE plans save to your account.`
                    : 'FIRE drafts stay in this browser. Sign in to save plans to your account.'}
                </span>
              </div>
              {planStorageMessage ? <p className="storage-status">{planStorageMessage}</p> : null}

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
                        <button className="secondary-button" onClick={() => applySnapshot(item.snapshot)}>
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
