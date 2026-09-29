import type { AuthState } from '../auth';
import type {
  AccountDraft,
  AccountProfile,
  AccountProfileDraft,
  AccountSummary,
  BalanceDraft,
  FinancialAccount,
  Goal,
  GoalDraft,
  GoalSummary,
  GoalUpdateDraft,
  SavedCalculatorResult,
  Transaction,
  TransactionDraft,
  TransactionSummary
} from '../App';
import type {
  PlanningSavedPlan,
  PlanningScenario,
  PlanningSnapshot,
  PlanningTimeline,
  PlanVersionDetail,
  PlanVersionSummary
} from '../PlanningWorkspace';
import type { FinancialInsight } from '../lib/insights';
import {
  buildTransactionCashflowRollup,
  type TransactionCashflowRollup,
  type TransactionFilters
} from '../lib/transactionAnalytics';
import { calculateFirePlan, type FirePlanResult, type PlanInput } from '../lib/fire';

export const SYNTHETIC_FIXTURE_MARKER = 'FINPATH_SYNTHETIC_FIXTURE_ISOLATED_HARNESS_DATA';
export const SYNTHETIC_USER_ID = 'usr_synthetic_alex_mercer_95';

export type FixtureStateName = 'empty' | 'populated' | 'stale' | 'loading' | 'failure' | 'long-value';
export type FixtureComponentName =
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'goals'
  | 'plans'
  | 'reports'
  | 'settings';

export const syntheticAuth: Extract<AuthState, { status: 'signed-in' }> = {
  getToken: async () => 'synthetic_mock_fixture_token_do_not_use',
  isConfigured: true,
  isSignedIn: true,
  provider: 'clerk',
  status: 'signed-in',
  user: {
    displayName: 'Alex Mercer (Synthetic Demo)',
    email: 'alex.mercer.synthetic@example.org',
    id: SYNTHETIC_USER_ID
  }
};

const defaultPlanInput: PlanInput = {
  annualExpense: 64000,
  desiredFinalValue: 0,
  initialPortfolio: 508500,
  oneOffEvents: [],
  ratePeriods: [{ duration: 35, i: 0.025, r: 0.07 }],
  recurringCashFlows: [],
  withdrawalTiming: 'start'
};

const longPlanInput: PlanInput = {
  annualExpense: 4200000,
  desiredFinalValue: 100000000,
  initialPortfolio: 1234567890,
  oneOffEvents: [{ amount: 50000000, label: 'Superyacht & Sovereign Endowment', year: 10 }],
  ratePeriods: [{ duration: 45, i: 0.03, r: 0.085 }],
  recurringCashFlows: [{ amount: 1500000, endYear: 20, inflationAdjusted: true, kind: 'income', label: 'Holding Company Royalties', startYear: 1 }],
  withdrawalTiming: 'start'
};

export const populatedPlanResult: FirePlanResult = calculateFirePlan(defaultPlanInput);
export const longPlanResult: FirePlanResult = calculateFirePlan(longPlanInput);

const standardTimeline: PlanningTimeline = {
  currentAge: 35,
  planEndAge: 90,
  retirementAge: 55
};

const standardScenarios: PlanningScenario[] = [
  { id: 'base', inflationDelta: 0, label: 'Base plan', portfolioDelta: 0, returnDelta: 0, spendingDelta: 0 },
  { id: 'guardrail', inflationDelta: 0.01, label: 'Cautious market (-1% return, +1% inflation)', portfolioDelta: 0, returnDelta: -0.01, spendingDelta: -5000 },
  { id: 'upside', inflationDelta: 0, label: 'Strong compound (+1.5% return)', portfolioDelta: 0, returnDelta: 0.015, spendingDelta: 0 }
];

const standardSnapshot: PlanningSnapshot = {
  calculatorMode: 'fire-number',
  plan: defaultPlanInput,
  scenarios: standardScenarios,
  timeline: standardTimeline
};

// ============================================================================
// 1. ACCOUNTS FIXTURES
// ============================================================================

export const populatedAccounts: FinancialAccount[] = [
  {
    accountType: 'checking',
    balanceHistory: [
      { balanceCents: 1245000, balanceDate: '2026-08-01', createdAt: '2026-08-01T10:00:00Z', id: 'bal_1' },
      { balanceCents: 1425000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_2' }
    ],
    category: 'asset',
    createdAt: '2026-01-15T08:00:00Z',
    currency: 'USD',
    id: 'acc_chk_01',
    institutionName: 'Apex Federal Credit Union',
    isActive: true,
    latestBalanceCents: 1425000,
    latestBalanceDate: '2026-09-01',
    name: 'Primary Household Checking',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'savings',
    balanceHistory: [
      { balanceCents: 4500000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_3' }
    ],
    category: 'asset',
    createdAt: '2026-01-15T08:00:00Z',
    currency: 'USD',
    id: 'acc_sav_01',
    institutionName: 'Cascade High Yield Bank',
    isActive: true,
    latestBalanceCents: 4500000,
    latestBalanceDate: '2026-09-01',
    name: 'Emergency Reserve Fund',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'investment',
    balanceHistory: [
      { balanceCents: 19500000, balanceDate: '2026-08-01', createdAt: '2026-08-01T10:00:00Z', id: 'bal_4' },
      { balanceCents: 21050000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_5' }
    ],
    category: 'asset',
    createdAt: '2026-02-01T08:00:00Z',
    currency: 'USD',
    id: 'acc_inv_01',
    institutionName: 'Vanguard Group',
    isActive: true,
    latestBalanceCents: 21050000,
    latestBalanceDate: '2026-09-01',
    name: 'Total Stock Market Index (VTSAX)',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'retirement',
    balanceHistory: [
      { balanceCents: 18500000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_6' }
    ],
    category: 'asset',
    createdAt: '2026-02-01T08:00:00Z',
    currency: 'USD',
    id: 'acc_ret_401k',
    institutionName: 'Fidelity Investments',
    isActive: true,
    latestBalanceCents: 18500000,
    latestBalanceDate: '2026-09-01',
    name: 'Employer Traditional 401(k)',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'retirement',
    balanceHistory: [
      { balanceCents: 6800000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_7' }
    ],
    category: 'asset',
    createdAt: '2026-02-01T08:00:00Z',
    currency: 'USD',
    id: 'acc_ret_roth',
    institutionName: 'Charles Schwab',
    isActive: true,
    latestBalanceCents: 6800000,
    latestBalanceDate: '2026-09-01',
    name: 'Backdoor Roth IRA',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'credit',
    balanceHistory: [
      { balanceCents: 245000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_8' }
    ],
    category: 'liability',
    createdAt: '2026-01-20T08:00:00Z',
    currency: 'USD',
    id: 'acc_crd_01',
    institutionName: 'Chase Card Services',
    isActive: true,
    latestBalanceCents: 245000,
    latestBalanceDate: '2026-09-01',
    name: 'Sapphire Preferred Credit Card',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'mortgage',
    balanceHistory: [
      { balanceCents: 32000000, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'bal_9' }
    ],
    category: 'liability',
    createdAt: '2026-01-20T08:00:00Z',
    currency: 'USD',
    id: 'acc_mor_01',
    institutionName: 'Rocket Mortgage',
    isActive: true,
    latestBalanceCents: 32000000,
    latestBalanceDate: '2026-09-01',
    name: '30-Yr Fixed Primary Residence',
    updatedAt: '2026-09-01T10:00:00Z'
  }
];

export const staleAccounts: FinancialAccount[] = populatedAccounts.map((acc, index) => ({
  ...acc,
  latestBalanceDate: '2025-06-15',
  updatedAt: '2025-06-15T12:00:00Z',
  balanceHistory: [{ balanceCents: acc.latestBalanceCents, balanceDate: '2025-06-15', createdAt: '2025-06-15T12:00:00Z', id: `stale_bal_${index}` }]
}));

export const longValueAccounts: FinancialAccount[] = [
  {
    accountType: 'investment',
    balanceHistory: [{ balanceCents: 123456789012, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'long_bal_1' }],
    category: 'asset',
    createdAt: '2026-01-01T00:00:00Z',
    currency: 'USD',
    id: 'acc_long_asset_01',
    institutionName: 'Consolidated Global Offshore & Swiss Private Wealth Asset Trust AG',
    isActive: true,
    latestBalanceCents: 123456789012,
    latestBalanceDate: '2026-09-01',
    name: 'Sovereign Multigenerational Dynasty Core Diversified Allocation Portfolio #994817029',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    accountType: 'mortgage',
    balanceHistory: [{ balanceCents: 9876543210, balanceDate: '2026-09-01', createdAt: '2026-09-01T10:00:00Z', id: 'long_bal_2' }],
    category: 'liability',
    createdAt: '2026-01-01T00:00:00Z',
    currency: 'USD',
    id: 'acc_long_liab_01',
    institutionName: 'International Real Estate Development Structured Finance Consortium',
    isActive: true,
    latestBalanceCents: 9876543210,
    latestBalanceDate: '2026-09-01',
    name: 'Commercial Real Estate Syndication Structured Mortgage Loan Note 2026-Series-B',
    updatedAt: '2026-09-01T10:00:00Z'
  }
];

export const emptyAccountSummary: AccountSummary = {
  accountCount: 0,
  assetsCents: 0,
  byCurrency: {},
  currencies: [],
  hasMixedCurrencies: false,
  liabilitiesCents: 0,
  liabilityAccountCount: 0,
  netWorthCents: 0,
  primaryCurrency: 'USD'
};

export const populatedAccountSummary: AccountSummary = {
  accountCount: 7,
  assetsCents: 52275000,
  byCurrency: {
    USD: {
      accountCount: 7,
      assetsCents: 52275000,
      currency: 'USD',
      liabilitiesCents: 32245000,
      liabilityAccountCount: 2,
      netWorthCents: 20030000
    }
  },
  currencies: ['USD'],
  hasMixedCurrencies: false,
  liabilitiesCents: 32245000,
  liabilityAccountCount: 2,
  netWorthCents: 20030000,
  primaryCurrency: 'USD'
};

export const longValueAccountSummary: AccountSummary = {
  accountCount: 2,
  assetsCents: 123456789012,
  byCurrency: {
    USD: {
      accountCount: 2,
      assetsCents: 123456789012,
      currency: 'USD',
      liabilitiesCents: 9876543210,
      liabilityAccountCount: 1,
      netWorthCents: 113580245802
    }
  },
  currencies: ['USD'],
  hasMixedCurrencies: false,
  liabilitiesCents: 9876543210,
  liabilityAccountCount: 1,
  netWorthCents: 113580245802,
  primaryCurrency: 'USD'
};

// ============================================================================
// 2. TRANSACTIONS FIXTURES
// ============================================================================

export const populatedTransactions: Transaction[] = [
  {
    account: { accountType: 'checking', currency: 'USD', id: 'acc_chk_01', name: 'Primary Household Checking' },
    accountId: 'acc_chk_01',
    amountCents: 450000,
    category: 'Income',
    createdAt: '2026-09-01T09:00:00Z',
    description: 'Bi-Weekly Employer Direct Deposit',
    id: 'tx_01',
    notes: 'Regular salary payroll credit',
    signedCashFlowCents: 450000,
    transactionDate: '2026-09-01',
    transactionType: 'income',
    updatedAt: '2026-09-01T09:00:00Z'
  },
  {
    account: { accountType: 'checking', currency: 'USD', id: 'acc_chk_01', name: 'Primary Household Checking' },
    accountId: 'acc_chk_01',
    amountCents: 185000,
    category: 'Housing',
    createdAt: '2026-09-02T10:30:00Z',
    description: 'Residential Mortgage Monthly Escrow',
    id: 'tx_02',
    notes: 'Principal, interest, and property tax escrow',
    signedCashFlowCents: -185000,
    transactionDate: '2026-09-02',
    transactionType: 'expense',
    updatedAt: '2026-09-02T10:30:00Z'
  },
  {
    account: { accountType: 'checking', currency: 'USD', id: 'acc_chk_01', name: 'Primary Household Checking' },
    accountId: 'acc_chk_01',
    amountCents: 14260,
    category: 'Groceries',
    createdAt: '2026-09-03T16:15:00Z',
    description: 'Fresh Market Organic Groceries',
    id: 'tx_03',
    notes: 'Weekly family household sustenance',
    signedCashFlowCents: -14260,
    transactionDate: '2026-09-03',
    transactionType: 'expense',
    updatedAt: '2026-09-03T16:15:00Z'
  },
  {
    account: { accountType: 'checking', currency: 'USD', id: 'acc_chk_01', name: 'Primary Household Checking' },
    accountId: 'acc_chk_01',
    amountCents: 150000,
    category: 'Savings Transfer',
    createdAt: '2026-09-04T11:00:00Z',
    description: 'Monthly Automated Savings Transfer',
    id: 'tx_04',
    notes: 'Transferred to Vanguard Taxable Brokerage',
    signedCashFlowCents: -150000,
    transactionDate: '2026-09-04',
    transactionType: 'transfer',
    updatedAt: '2026-09-04T11:00:00Z'
  },
  {
    account: { accountType: 'investment', currency: 'USD', id: 'acc_inv_01', name: 'Total Stock Market Index (VTSAX)' },
    accountId: 'acc_inv_01',
    amountCents: 32000,
    category: 'Dividends',
    createdAt: '2026-09-05T08:00:00Z',
    description: 'VTSAX Q3 Reinvested Dividend Distribution',
    id: 'tx_05',
    notes: 'Automatic dividend reinvestment (DRIP)',
    signedCashFlowCents: 32000,
    transactionDate: '2026-09-05',
    transactionType: 'income',
    updatedAt: '2026-09-05T08:00:00Z'
  }
];

export const staleTransactions: Transaction[] = populatedTransactions.map((tx, idx) => ({
  ...tx,
  createdAt: '2025-05-10T12:00:00Z',
  id: `stale_tx_${idx}`,
  transactionDate: '2025-05-10',
  updatedAt: '2025-05-10T12:00:00Z'
}));

export const longValueTransactions: Transaction[] = [
  {
    account: { accountType: 'investment', currency: 'USD', id: 'acc_long_asset_01', name: 'Sovereign Multigenerational Dynasty Core Diversified Allocation Portfolio #994817029' },
    accountId: 'acc_long_asset_01',
    amountCents: 1250000000,
    category: 'Liquidity Event',
    createdAt: '2026-09-01T00:00:00Z',
    description: 'Enterprise Tech Unicorn Secondary Market Liquidity Distribution Tranche Alpha',
    id: 'long_tx_01',
    notes: 'Comprehensive cross-border institutionalwire transfer subject to capital gains tax provisions',
    signedCashFlowCents: 1250000000,
    transactionDate: '2026-09-01',
    transactionType: 'income',
    updatedAt: '2026-09-01T00:00:00Z'
  },
  {
    account: { accountType: 'mortgage', currency: 'USD', id: 'acc_long_liab_01', name: 'Commercial Real Estate Syndication Structured Mortgage Loan Note 2026-Series-B' },
    accountId: 'acc_long_liab_01',
    amountCents: 450000000,
    category: 'Commercial Debt',
    createdAt: '2026-09-02T00:00:00Z',
    description: 'Metropolitan Commercial Tower Structured Debt Senior Tranche Principal Amortization',
    id: 'long_tx_02',
    notes: 'Structured principal paydown via syndicated banking facility',
    signedCashFlowCents: -450000000,
    transactionDate: '2026-09-02',
    transactionType: 'expense',
    updatedAt: '2026-09-02T00:00:00Z'
  }
];

export const emptyTransactionSummary: TransactionSummary = {
  adjustmentCents: 0,
  expenseCents: 0,
  incomeCents: 0,
  latestTransactionDate: null,
  netCashFlowCents: 0,
  transactionCount: 0,
  transferCents: 0
};

export const populatedTransactionSummary: TransactionSummary = {
  adjustmentCents: 0,
  expenseCents: 199260,
  incomeCents: 482000,
  latestTransactionDate: '2026-09-05',
  netCashFlowCents: 132740,
  transactionCount: 5,
  transferCents: 150000
};

export const staleTransactionSummary: TransactionSummary = {
  adjustmentCents: 0,
  expenseCents: 199260,
  incomeCents: 482000,
  latestTransactionDate: '2025-06-15',
  netCashFlowCents: 132740,
  transactionCount: 5,
  transferCents: 150000
};

export const longValueTransactionSummary: TransactionSummary = {
  adjustmentCents: 0,
  expenseCents: 450000000,
  incomeCents: 1250000000,
  latestTransactionDate: '2026-09-02',
  netCashFlowCents: 800000000,
  transactionCount: 2,
  transferCents: 0
};

export const populatedCashflow: TransactionCashflowRollup = buildTransactionCashflowRollup(populatedTransactions, '2026-09-05');
export const emptyCashflow: TransactionCashflowRollup = buildTransactionCashflowRollup([], '2026-09-05');
export const longValueCashflow: TransactionCashflowRollup = buildTransactionCashflowRollup(longValueTransactions, '2026-09-02');

export const defaultTransactionFilters: TransactionFilters = {
  accountId: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
  query: '',
  transactionType: 'all'
};

// ============================================================================
// 3. GOALS FIXTURES
// ============================================================================

export const populatedGoals: Goal[] = [
  {
    createdAt: '2026-01-10T10:00:00Z',
    currentAmountCents: 21050000,
    daysUntilTarget: 7300,
    goalType: 'retirement',
    id: 'goal_01',
    isOverdue: false,
    name: 'Coast FIRE Portfolio Baseline',
    progressPercent: 60.1,
    remainingAmountCents: 13950000,
    status: 'active',
    targetAmountCents: 35000000,
    targetDate: '2046-09-01',
    updatedAt: '2026-09-01T12:00:00Z'
  },
  {
    createdAt: '2026-01-10T10:00:00Z',
    currentAmountCents: 4500000,
    daysUntilTarget: 0,
    goalType: 'emergency_fund',
    id: 'goal_02',
    isOverdue: false,
    name: '6-Month Safe Liquid Emergency Reserve',
    progressPercent: 100,
    remainingAmountCents: 0,
    status: 'completed',
    targetAmountCents: 4500000,
    targetDate: '2026-06-01',
    updatedAt: '2026-06-01T12:00:00Z'
  },
  {
    createdAt: '2026-03-01T10:00:00Z',
    currentAmountCents: 2400000,
    daysUntilTarget: 730,
    goalType: 'home',
    id: 'goal_03',
    isOverdue: false,
    name: 'Down Payment for Pacific Northwest Homestead',
    progressPercent: 30,
    remainingAmountCents: 5600000,
    status: 'active',
    targetAmountCents: 8000000,
    targetDate: '2028-09-01',
    updatedAt: '2026-09-01T12:00:00Z'
  }
];

export const staleGoals: Goal[] = populatedGoals.map((g) => ({
  ...g,
  daysUntilTarget: -90,
  isOverdue: true,
  targetDate: '2025-12-01',
  updatedAt: '2025-06-01T00:00:00Z'
}));

export const longValueGoals: Goal[] = [
  {
    createdAt: '2026-01-01T00:00:00Z',
    currentAmountCents: 4500000000,
    daysUntilTarget: 14600,
    goalType: 'retirement',
    id: 'long_goal_01',
    isOverdue: false,
    name: 'Multigenerational Family Endowment & Coastal Sanctuary Acquisition Capital Fund',
    progressPercent: 45,
    remainingAmountCents: 5500000000,
    status: 'active',
    targetAmountCents: 10000000000,
    targetDate: '2066-01-01',
    updatedAt: '2026-09-01T00:00:00Z'
  }
];

export const emptyGoalSummary: GoalSummary = {
  activeGoalCount: 0,
  completedGoalCount: 0,
  fundedPercent: 0,
  goalCount: 0,
  nextGoal: null,
  overdueGoalCount: 0,
  pausedGoalCount: 0,
  totalCurrentCents: 0,
  totalTargetCents: 0
};

export const populatedGoalSummary: GoalSummary = {
  activeGoalCount: 2,
  completedGoalCount: 1,
  fundedPercent: 59.9,
  goalCount: 3,
  nextGoal: populatedGoals[0],
  overdueGoalCount: 0,
  pausedGoalCount: 0,
  totalCurrentCents: 27950000,
  totalTargetCents: 47500000
};

export const staleGoalSummary: GoalSummary = {
  activeGoalCount: 2,
  completedGoalCount: 1,
  fundedPercent: 59.9,
  goalCount: 3,
  nextGoal: staleGoals[0],
  overdueGoalCount: 2,
  pausedGoalCount: 0,
  totalCurrentCents: 27950000,
  totalTargetCents: 47500000
};

export const longValueGoalSummary: GoalSummary = {
  activeGoalCount: 1,
  completedGoalCount: 0,
  fundedPercent: 45.0,
  goalCount: 1,
  nextGoal: longValueGoals[0],
  overdueGoalCount: 0,
  pausedGoalCount: 0,
  totalCurrentCents: 4500000000,
  totalTargetCents: 10000000000
};

// ============================================================================
// 4. PLANS FIXTURES
// ============================================================================

export const populatedSavedPlans: PlanningSavedPlan[] = [
  {
    createdAt: '2026-07-01T12:00:00Z',
    goalId: 'goal_01',
    id: 'plan_fire_01',
    label: 'Primary FIRE Baseline v2',
    name: 'Age 55 Lean/Chubby FIRE Roadmap',
    notes: 'Targets 3.5% safe withdrawal rate with 508k invested assets and 64k annual expenses.',
    result: populatedPlanResult,
    snapshot: standardSnapshot,
    updatedAt: '2026-09-01T14:00:00Z',
    versionCreatedAt: '2026-09-01T14:00:00Z',
    versionNumber: 2
  }
];

export const longValueSavedPlans: PlanningSavedPlan[] = [
  {
    createdAt: '2026-01-01T00:00:00Z',
    goalId: 'long_goal_01',
    id: 'plan_long_01',
    label: 'Dynasty Capital Preservation Allocation Master Model v1',
    name: 'Sovereign Ultra-High-Net-Worth Family Office Capital Preservation & Philanthropic Succession Plan',
    notes: 'Comprehensive multi-asset simulation supporting $4.2M annual family office distributions through age 95.',
    result: longPlanResult,
    snapshot: {
      calculatorMode: 'fire-number',
      plan: longPlanInput,
      scenarios: standardScenarios,
      timeline: { currentAge: 40, planEndAge: 95, retirementAge: 50 }
    },
    updatedAt: '2026-09-01T00:00:00Z',
    versionCreatedAt: '2026-09-01T00:00:00Z',
    versionNumber: 5
  }
];

export const planVersionSummaries: PlanVersionSummary[] = [
  { createdAt: '2026-09-01T14:00:00Z', label: 'Added guardrail scenario with 1% inflation shock', notes: 'Version 2 with revised inflation expectations', versionNumber: 2 },
  { createdAt: '2026-07-01T12:00:00Z', label: 'Initial baseline draft', notes: 'Standard 7% return assumption', versionNumber: 1 }
];

export const planVersionDetails: Record<number, PlanVersionDetail> = {
  1: {
    createdAt: '2026-07-01T12:00:00Z',
    label: 'Initial baseline draft',
    notes: 'Standard 7% return assumption',
    result: populatedPlanResult,
    snapshot: standardSnapshot,
    versionNumber: 1
  },
  2: {
    createdAt: '2026-09-01T14:00:00Z',
    label: 'Added guardrail scenario with 1% inflation shock',
    notes: 'Version 2 with revised inflation expectations',
    result: populatedPlanResult,
    snapshot: standardSnapshot,
    versionNumber: 2
  }
};

// ============================================================================
// 5. INSIGHTS / REPORTS FIXTURES
// ============================================================================

export const populatedInsights: FinancialInsight[] = [
  {
    action: 'Increase taxable brokerage automated deposits by $250/month',
    area: 'plan',
    assumptions: ['Assumes regular payroll remains consistent', 'Assumes current expense rate of $1,992/mo'],
    category: 'recommendation',
    evidence: [
      { label: 'Current Net Savings', value: '$2,827 / mo' },
      { label: 'Target Coast FIRE', value: '$350,000' }
    ],
    id: 'insight_sav_01',
    priority: 'high',
    rationale: 'Your monthly cashflow generates an average surplus of $2,827. Directing an additional $250/month advances your Coast FIRE date by 14 months.',
    route: '/plans',
    title: 'Surplus Cashflow Acceleration Opportunity',
    uncertainty: 'Market returns vary across economic cycles; historical average of 7% real return used.'
  },
  {
    action: 'Review emergency fund allocation in Cascade High Yield Bank',
    area: 'accounts',
    assumptions: ['6 months of living expenses equals $27,000'],
    category: 'recommendation',
    evidence: [
      { label: 'Reserve Balance', value: '$45,000' },
      { label: '6-Mo Requirement', value: '$27,000' }
    ],
    id: 'insight_acc_01',
    priority: 'medium',
    rationale: 'Your emergency fund holds $45,000, which provides 10 months of runway. The surplus $18,000 could be invested in index funds to outpace inflation.',
    route: '/accounts',
    title: 'Excess Liquid Cash Drag',
    uncertainty: 'Keep higher reserves if freelance or single-income household risks exist.'
  },
  {
    action: 'Confirm privacy safeguards and client-side draft protection',
    area: 'privacy',
    assumptions: ['FinPath95 operates on zero-retention client drafts'],
    category: 'observation',
    evidence: [
      { label: 'Cloudflare D1 Storage', value: 'Isolated per-tenant schema' },
      { label: 'Local Drafts', value: 'Explicit clearLocalDrafts() on deletion' }
    ],
    id: 'insight_priv_01',
    priority: 'low',
    rationale: 'Your financial plans and account balances are bound strictly to your authenticated session. Deletion triggers complete child-table erasure.',
    route: '/reports',
    title: 'Tenant Isolation and Privacy Boundary Audit',
    uncertainty: 'Clerk identity authentication is decoupled from application database records.'
  }
];

export const longValueInsights: FinancialInsight[] = [
  {
    action: 'Implement cross-border tax treaty optimization strategy across institutional holding entities',
    area: 'plan',
    assumptions: ['Assumes top-bracket federal, state, and foreign dividend withholding rates apply unconditionally'],
    category: 'recommendation',
    evidence: [
      { detail: 'Multi-jurisdictional private wealth advisory audit', label: 'Tax Efficiency Differential', value: '$1,450,000 annually' },
      { detail: 'Gross capital distribution schedule', label: 'Total Exposure', value: '$123,456,789.12' }
    ],
    id: 'long_insight_01',
    priority: 'high',
    rationale: 'Detailed quantitative analysis reveals that structuring passive distributions via pass-through entities mitigates multi-state tax drag by 3.8% across thirty fiscal calendar quarters.',
    route: '/plans',
    title: 'Institutional Wealth Succession and Tax-Loss Harvesting Restructuring Opportunity',
    uncertainty: 'Legislative changes to the unified estate tax exemption threshold may require structural restructuring.'
  }
];

// ============================================================================
// 6. PROFILE & SETTINGS FIXTURES
// ============================================================================

export const populatedProfile: AccountProfile = {
  birthYear: 1991,
  defaultCurrency: 'USD',
  displayName: 'Alex Mercer',
  householdName: 'Mercer Household',
  targetRetirementAge: 55,
  updatedAt: '2026-09-01T10:00:00Z',
  userId: SYNTHETIC_USER_ID
};

export const populatedProfileDraft: AccountProfileDraft = {
  birthYear: '1991',
  defaultCurrency: 'USD',
  displayName: 'Alex Mercer',
  householdName: 'Mercer Household',
  targetRetirementAge: '55'
};

export const longValueProfile: AccountProfile = {
  birthYear: 1975,
  defaultCurrency: 'USD',
  displayName: 'Lord Alexander Bartholomew Montgomery-Featherstonehaugh III of Kensington',
  householdName: 'The Montgomery-Featherstonehaugh Sovereign Family Trust & Estates Office',
  targetRetirementAge: 50,
  updatedAt: '2026-09-01T00:00:00Z',
  userId: SYNTHETIC_USER_ID
};

export const longValueProfileDraft: AccountProfileDraft = {
  birthYear: '1975',
  defaultCurrency: 'USD',
  displayName: 'Lord Alexander Bartholomew Montgomery-Featherstonehaugh III of Kensington',
  householdName: 'The Montgomery-Featherstonehaugh Sovereign Family Trust & Estates Office',
  targetRetirementAge: '50'
};

export const emptyProfileDraft: AccountProfileDraft = {
  birthYear: '',
  defaultCurrency: 'USD',
  displayName: '',
  householdName: '',
  targetRetirementAge: ''
};

// ============================================================================
// 7. SAVED CALCULATOR RUNS FIXTURES
// ============================================================================

export const populatedSavedCalculatorResults: SavedCalculatorResult[] = [
  {
    calculatorCategory: 'Retirement',
    calculatorRegion: 'US',
    calculatorSlug: 'compound-interest',
    calculatorTitle: 'Compound Interest Growth Engine',
    conversionLabel: 'Save as Retirement Goal',
    conversionRoute: '/goals',
    createdAt: '2026-08-15T14:30:00Z',
    createdEntityId: 'goal_01',
    createdEntityType: 'goal',
    currency: 'USD',
    destinationType: 'goal',
    id: 'calc_res_01',
    inputValues: { initialDeposit: 50000, monthlyContribution: 1000, rate: 7, years: 20 },
    result: {
      assumptions: ['7% annual return', 'monthly compounding'],
      metrics: [
        { label: 'Future Value', tone: 'positive', value: 710892, valueType: 'currency' },
        { label: 'Total Contributions', tone: 'neutral', value: 290000, valueType: 'currency' },
        { label: 'Compound Interest Earned', tone: 'positive', value: 420892, valueType: 'currency' }
      ],
      narrative: 'A \$50,000 starting deposit compounded with \$1,000/month contributions grows to \$710,892 in 20 years.'
    },
    updatedAt: '2026-08-15T14:30:00Z'
  }
];

export const longValueSavedCalculatorResults: SavedCalculatorResult[] = [
  {
    calculatorCategory: 'Institutional Finance',
    calculatorRegion: 'US',
    calculatorSlug: 'net-worth',
    calculatorTitle: 'Sovereign Global Asset Aggregation & Risk Projection Model',
    conversionLabel: 'Sync to Master Balance Sheet',
    conversionRoute: '/accounts',
    createdAt: '2026-09-01T00:00:00Z',
    createdEntityId: 'acc_long_asset_01',
    createdEntityType: 'account',
    currency: 'USD',
    destinationType: 'account',
    id: 'calc_long_01',
    inputValues: { assetTotal: 1234567890, liabilityTotal: 98765432 },
    result: {
      assumptions: ['Cross-border risk-weighted capital adequacy tier 1 ratios maintained'],
      metrics: [
        { label: 'Net Liquid Worth', tone: 'positive', value: 1135802458, valueType: 'currency' },
        { label: 'Leverage Ratio', tone: 'neutral', value: 8.0, valueType: 'percent' }
      ],
      narrative: 'Total consolidated capital position evaluated at \$1.13B net assets.'
    },
    updatedAt: '2026-09-01T00:00:00Z'
  }
];

// ============================================================================
// 8. SYNTHETIC IMPORT FIXTURES
// ============================================================================

export type SyntheticBalanceImportRecord = {
  createdAt: string;
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  id: string;
  importedRows: number;
  totalRows: number;
};

export type SyntheticTransactionImportRecord = {
  createdAt: string;
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  id: string;
  importedRows: number;
  totalRows: number;
};

export const populatedBalanceImports: SyntheticBalanceImportRecord[] = [
  {
    createdAt: '2026-09-01T10:00:00Z',
    duplicateRows: 0,
    errorRows: 0,
    fileName: 'apex_credit_union_balances_20260901.csv',
    id: 'imp_bal_01',
    importedRows: 2,
    totalRows: 2
  }
];

export const populatedTransactionImports: SyntheticTransactionImportRecord[] = [
  {
    createdAt: '2026-09-02T14:30:00Z',
    duplicateRows: 0,
    errorRows: 0,
    fileName: 'chase_checking_transactions_aug2026.csv',
    id: 'imp_tx_01',
    importedRows: 5,
    totalRows: 5
  }
];

export const syntheticBalancePreview = {
  rows: [
    {
      accountId: 'acc_chk_01',
      accountName: 'Primary Household Checking',
      balanceCents: 1425000,
      balanceDate: '2026-09-01',
      currency: 'USD',
      message: 'Ready to import',
      rowNumber: 1,
      status: 'ready' as const
    },
    {
      accountId: 'acc_sav_01',
      accountName: 'Emergency Reserve Fund',
      balanceCents: 4500000,
      balanceDate: '2026-09-01',
      currency: 'USD',
      message: 'Ready to import',
      rowNumber: 2,
      status: 'ready' as const
    }
  ],
  summary: {
    duplicateRows: 0,
    errorRows: 0,
    readyRows: 2,
    totalRows: 2
  }
};

export const syntheticTransactionPreview = {
  rows: [
    {
      accountId: 'acc_chk_01',
      accountName: 'Primary Household Checking',
      amountCents: 450000,
      category: 'Income',
      description: 'Bi-Weekly Employer Direct Deposit',
      message: 'Ready to import',
      notes: null,
      rowNumber: 1,
      status: 'ready' as const,
      transactionDate: '2026-09-01',
      transactionType: 'income' as const
    },
    {
      accountId: 'acc_chk_01',
      accountName: 'Primary Household Checking',
      amountCents: 185000,
      category: 'Housing',
      description: 'Residential Mortgage Monthly Escrow',
      message: 'Ready to import',
      notes: null,
      rowNumber: 2,
      status: 'ready' as const,
      transactionDate: '2026-09-02',
      transactionType: 'expense' as const
    }
  ],
  summary: {
    duplicateRows: 0,
    errorRows: 0,
    readyRows: 2,
    totalRows: 2
  }
};

