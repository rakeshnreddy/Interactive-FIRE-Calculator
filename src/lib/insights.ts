import { formatMoney, type FirePlanResult, type PlanInput } from './fire';
import { derivePlanHealthActions, type PlanHealthAction } from './planHealth';
import {
  buildTransactionCashflowRollup,
  type TransactionAnalyticsRow,
  type TransactionCashflowRollup
} from './transactionAnalytics';

export type InsightArea = 'accounts' | 'goals' | 'plan' | 'privacy' | 'transactions';
export type InsightCategory = 'observation' | 'recommendation' | 'setup';
export type InsightPriority = 'high' | 'medium' | 'low';
export type InsightRoute = '/accounts' | '/calculators/fire' | '/goals' | '/plans' | '/reports' | '/transactions';

export type InsightEvidence = {
  detail?: string;
  label: string;
  value: string;
};

export type FinancialInsight = {
  action: string;
  area: InsightArea;
  assumptions: string[];
  category: InsightCategory;
  evidence: InsightEvidence[];
  id: string;
  priority: InsightPriority;
  rationale: string;
  route: InsightRoute;
  title: string;
  uncertainty: string;
};

export type InsightAccountBalance = {
  balanceCents: number;
  balanceDate: string;
};

export type InsightAccount = {
  balanceHistory: InsightAccountBalance[];
  category: 'asset' | 'liability';
  currency: string;
  id: string;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
};

export type InsightGoal = {
  currentAmountCents: number;
  daysUntilTarget: number | null;
  goalType: string;
  id: string;
  isOverdue: boolean;
  name: string;
  progressPercent: number;
  remainingAmountCents: number;
  status: 'active' | 'paused' | 'completed';
  targetAmountCents: number | null;
  targetDate: string | null;
};

export type InsightGoalSummary = {
  activeGoalCount: number;
  fundedPercent: number;
  goalCount: number;
  overdueGoalCount: number;
  pausedGoalCount: number;
  totalCurrentCents: number;
  totalTargetCents: number;
};

export type InsightPlan = {
  name: string;
  plan: PlanInput;
  result: FirePlanResult;
  versionNumber?: number;
};

export type FinancialInsightInput = {
  accounts: InsightAccount[];
  goalSummary: InsightGoalSummary;
  goals: InsightGoal[];
  plan: InsightPlan | null;
  today?: string;
  transactions?: TransactionAnalyticsRow[];
};

type AccountTrend = {
  account: InsightAccount;
  latest: InsightAccountBalance;
  netWorthDeltaCents: number;
  previous: InsightAccountBalance;
};

const staleBalanceDays = 45;

export function buildFinancialInsights(input: FinancialInsightInput): FinancialInsight[] {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const insights = [
    ...buildPlanInsights(input.plan),
    ...buildGoalInsights(input.goals, input.goalSummary),
    ...buildTransactionInsights(input.transactions ?? [], today),
    ...buildAccountInsights(input.accounts, today),
    buildPrivacyInsight()
  ];

  return insights.sort(compareInsights);
}

export function topFinancialInsights(
  input: FinancialInsightInput,
  limit: number
): FinancialInsight[] {
  return buildFinancialInsights(input).slice(0, Math.max(0, limit));
}

function buildPlanInsights(plan: InsightPlan | null): FinancialInsight[] {
  if (!plan) {
    return [
      {
        action:
          'Save a FIRE plan once your first account and goal data are in place so plan-health checks can create versioned next actions.',
        area: 'plan',
        assumptions: ['No signed-in FIRE plan is selected in the current workspace.'],
        category: 'setup',
        evidence: [{ label: 'Saved plan', value: 'Missing' }],
        id: 'plan-setup-save-version',
        priority: 'medium',
        rationale:
          'Recommendations are more useful when they can point to a saved set of assumptions instead of a temporary calculator draft.',
        route: '/plans',
        title: 'Save a plan for traceable recommendations',
        uncertainty:
          'The public calculator can still be used without signing in, but account-backed recommendations need saved plan context.'
      }
    ];
  }

  return derivePlanHealthActions(plan.plan, plan.result).map((action) =>
    planHealthActionToInsight(plan, action)
  );
}

function planHealthActionToInsight(plan: InsightPlan, action: PlanHealthAction): FinancialInsight {
  return {
    action: action.action,
    area: 'plan',
    assumptions: action.assumptions,
    category: action.code === 'preserve_healthy_version' ? 'observation' : 'recommendation',
    evidence: [
      { label: 'Plan', value: plan.name },
      ...(plan.versionNumber ? [{ label: 'Version', value: String(plan.versionNumber) }] : []),
      ...Object.entries(action.evidence).map(([label, value]) => ({
        label: sentenceLabel(label),
        value: formatEvidenceNumber(label, value)
      }))
    ],
    id: `plan-${action.code}`,
    priority: action.priority,
    rationale: action.rationale,
    route: '/plans',
    title: action.title,
    uncertainty: action.uncertainty
  };
}

function buildGoalInsights(goals: InsightGoal[], summary: InsightGoalSummary): FinancialInsight[] {
  if (goals.length === 0) {
    return [
      {
        action: 'Create at least one dated goal so the dashboard can separate urgent targets from long-range planning.',
        area: 'goals',
        assumptions: ['No active, paused, or completed goals are stored for this account.'],
        category: 'setup',
        evidence: [{ label: 'Goals', value: '0' }],
        id: 'goals-setup-create-first',
        priority: 'medium',
        rationale:
          'Goal insights need target amounts and dates before they can explain funding gaps or deadline pressure.',
        route: '/goals',
        title: 'Add a goal with a target date',
        uncertainty:
          'A goal target is a planning benchmark; it should be revised when real priorities or timelines change.'
      }
    ];
  }

  const insights: FinancialInsight[] = [];
  const overdueGoals = goals.filter((goal) => goal.isOverdue && goal.status !== 'completed');
  const nextFundedGoal = goals
    .filter(
      (goal) =>
        goal.status === 'active' &&
        goal.targetAmountCents !== null &&
        goal.remainingAmountCents > 0 &&
        goal.daysUntilTarget !== null &&
        goal.daysUntilTarget >= 0
    )
    .sort((left, right) => {
      const leftDays = left.daysUntilTarget ?? Number.POSITIVE_INFINITY;
      const rightDays = right.daysUntilTarget ?? Number.POSITIVE_INFINITY;
      return leftDays - rightDays || left.remainingAmountCents - right.remainingAmountCents;
    })[0];

  if (overdueGoals.length > 0) {
    const mostOverdue = overdueGoals
      .slice()
      .sort((left, right) => (left.daysUntilTarget ?? 0) - (right.daysUntilTarget ?? 0))[0];

    insights.push({
      action:
        'Update the target date, mark completed goals complete, or pause goals that are no longer active before using them in plan decisions.',
      area: 'goals',
      assumptions: ['Overdue means the target date is in the past and the goal is not fully funded.'],
      category: 'recommendation',
      evidence: [
        { label: 'Overdue goals', value: String(overdueGoals.length) },
        {
          label: 'Most overdue',
          value: mostOverdue.name,
          detail:
            mostOverdue.daysUntilTarget === null
              ? undefined
              : `${Math.abs(mostOverdue.daysUntilTarget)} days past target`
        }
      ],
      id: 'goals-review-overdue',
      priority: 'high',
      rationale:
        'Past-due goals make the dashboard less trustworthy because the target may no longer represent an active decision.',
      route: '/goals',
      title: 'Review overdue goals',
      uncertainty:
        'This rule does not know whether a missed target is intentional, complete outside the app, or no longer relevant.'
    });
  }

  if (nextFundedGoal) {
    const monthsRemaining = Math.max(1, Math.ceil((nextFundedGoal.daysUntilTarget ?? 0) / 30));
    const monthlyNeed = nextFundedGoal.remainingAmountCents / monthsRemaining;

    insights.push({
      action:
        'Decide whether this target still deserves priority, then update the current amount or adjust the deadline before comparing plans.',
      area: 'goals',
      assumptions: [
        'The goal has a target amount, current amount, and future target date.',
        'Monthly pace is a straight-line estimate from remaining amount to target date.'
      ],
      category: 'recommendation',
      evidence: [
        { label: 'Goal', value: nextFundedGoal.name },
        { label: 'Remaining', value: formatCents(nextFundedGoal.remainingAmountCents) },
        { label: 'Months left', value: String(monthsRemaining) },
        { label: 'Monthly pace', value: formatCents(monthlyNeed) }
      ],
      id: `goal-pace-${nextFundedGoal.id}`,
      priority:
        nextFundedGoal.daysUntilTarget !== null && nextFundedGoal.daysUntilTarget <= 30
          ? 'high'
          : 'medium',
      rationale:
        'The nearest active goal with a remaining balance sets the clearest short-term funding pressure.',
      route: '/goals',
      title: 'Check the next goal pace',
      uncertainty:
        'This pace does not include income timing, interest, or spending tradeoffs; it is a simple deadline check.'
    });
  }

  if (summary.goalCount > 0 && summary.totalTargetCents > 0) {
    insights.push({
      action:
        'Use the funded percentage as context, then inspect individual goals before moving money or changing a plan.',
      area: 'goals',
      assumptions: ['Only goals with target amounts contribute to the funded percentage.'],
      category: 'observation',
      evidence: [
        { label: 'Funded', value: `${Math.round(summary.fundedPercent)}%` },
        { label: 'Current', value: formatCents(summary.totalCurrentCents) },
        { label: 'Target', value: formatCents(summary.totalTargetCents) },
        { label: 'Paused', value: String(summary.pausedGoalCount) }
      ],
      id: 'goals-funded-rollup',
      priority: 'low',
      rationale:
        'The goal rollup summarizes progress, but individual deadlines and target quality matter more than the aggregate.',
      route: '/goals',
      title: 'Goal funding is measurable',
      uncertainty:
        'The aggregate can hide an urgent underfunded goal behind overfunded or long-range goals.'
    });
  }

  return insights;
}

function buildTransactionInsights(transactions: TransactionAnalyticsRow[], today: string): FinancialInsight[] {
  if (transactions.length === 0) {
    return [
      {
        action:
          'Add a few income and expense rows so Reports can separate cash-flow pressure from balance movement.',
        area: 'transactions',
        assumptions: ['No manual transaction rows are stored for this signed-in user.'],
        category: 'setup',
        evidence: [{ label: 'Transactions', value: '0' }],
        id: 'transactions-setup-add-rows',
        priority: 'medium',
        rationale:
          'Cash-flow guidance needs dated income and expense rows before it can say whether spending is covered.',
        route: '/transactions',
        title: 'Add transaction history',
        uncertainty:
          'Manual transaction rows are not reconciled against imported account balances yet.'
      }
    ];
  }

  const rollup = buildTransactionCashflowRollup(transactions, today);
  const insights: FinancialInsight[] = [];
  const topCategory = rollup.topExpenseCategories[0] ?? null;

  if (rollup.currentMonthExpenseCents > 0 && rollup.currentMonthIncomeCents === 0) {
    insights.push({
      action:
        'Add income rows for the same month or treat the cash-flow panel as expense-only until income is captured.',
      area: 'transactions',
      assumptions: [`Current month is ${rollup.currentMonth}.`, 'Only manual transaction rows are included.'],
      category: 'setup',
      evidence: [
        { label: 'Current income', value: formatCents(rollup.currentMonthIncomeCents) },
        { label: 'Current expenses', value: formatCents(rollup.currentMonthExpenseCents) }
      ],
      id: 'transactions-missing-income',
      priority: 'medium',
      rationale:
        'Expenses without income make the net cash-flow number incomplete instead of truly negative.',
      route: '/transactions',
      title: 'Income rows are missing this month',
      uncertainty:
        'The app cannot infer paychecks, transfers from external accounts, or other income until rows are entered.'
    });
  } else if (rollup.currentMonthNetCashFlowCents < 0) {
    insights.push({
      action:
        'Review the largest expense categories and decide whether the month is unusual before using this run rate in a plan.',
      area: 'transactions',
      assumptions: [`Current month is ${rollup.currentMonth}.`, 'Transfers and adjustments do not count toward net cash flow.'],
      category: 'recommendation',
      evidence: [
        { label: 'Income', value: formatCents(rollup.currentMonthIncomeCents) },
        { label: 'Expenses', value: formatCents(rollup.currentMonthExpenseCents) },
        { label: 'Net cash flow', value: formatSignedCents(rollup.currentMonthNetCashFlowCents) }
      ],
      id: 'transactions-negative-cashflow',
      priority: 'high',
      rationale:
        'This month has more manual expenses than manual income, which can pressure account balances if it repeats.',
      route: '/transactions',
      title: 'Cash flow is negative this month',
      uncertainty:
        'The rule does not know whether missing income, one-off spending, or timing differences explain the gap.'
    });
  }

  if (topCategory && topCategory.category !== 'Uncategorized') {
    insights.push(topExpenseCategoryInsight(rollup, topCategory));
  }

  if (rollup.uncategorizedExpenseCount > 0) {
    insights.push({
      action:
        'Categorize the uncategorized expense rows before relying on top-spend insights or month-end reports.',
      area: 'transactions',
      assumptions: ['Only expense rows are counted for uncategorized spending cleanup.'],
      category: 'recommendation',
      evidence: [
        { label: 'Uncategorized expenses', value: String(rollup.uncategorizedExpenseCount) },
        { label: 'Total expenses', value: formatCents(rollup.totalExpenseCents) }
      ],
      id: 'transactions-categorize-expenses',
      priority: rollup.uncategorizedExpenseCount >= 3 ? 'medium' : 'low',
      rationale:
        'Category-level reports get less useful when manual expenses stay uncategorized.',
      route: '/transactions',
      title: 'Clean up transaction categories',
      uncertainty:
        'A category is a reporting label only; it does not prove merchant type or tax treatment.'
    });
  }

  if (insights.length === 0) {
    insights.push({
      action:
        'Keep adding dated rows through the month so the cash-flow view can stay useful for planning decisions.',
      area: 'transactions',
      assumptions: ['Transfers and adjustments are tracked, but net cash flow uses income minus expenses.'],
      category: 'observation',
      evidence: [
        { label: 'Current month net', value: formatSignedCents(rollup.currentMonthNetCashFlowCents) },
        { label: 'Rows', value: String(rollup.totalTransactionCount) },
        { label: 'Latest row', value: rollup.latestTransactionDate ?? 'None' }
      ],
      id: 'transactions-cashflow-current',
      priority: 'low',
      rationale:
        'Manual rows now give Reports a basic cash-flow read without importing or categorizing statements automatically.',
      route: '/transactions',
      title: 'Cash flow is being tracked',
      uncertainty:
        'The rollup is only as complete as the manual rows entered in the Transactions workspace.'
    });
  }

  return insights;
}

function topExpenseCategoryInsight(
  rollup: TransactionCashflowRollup,
  topCategory: TransactionCashflowRollup['topExpenseCategories'][number]
): FinancialInsight {
  return {
    action:
      topCategory.shareOfExpenses >= 0.4
        ? 'Review this category first when checking whether spending is intentional or temporary.'
        : 'Use this category as the first drill-down before comparing smaller spending groups.',
    area: 'transactions',
    assumptions: ['Top category uses manual expense rows only.', 'Uncategorized expenses are reported separately.'],
    category: topCategory.shareOfExpenses >= 0.4 ? 'recommendation' : 'observation',
    evidence: [
      { label: 'Category', value: topCategory.category },
      { label: 'Amount', value: formatCents(topCategory.amountCents) },
      { label: 'Share', value: formatPercent(topCategory.shareOfExpenses) },
      { label: 'Rows', value: String(topCategory.count) }
    ],
    id: `transactions-top-category-${topCategory.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    priority: topCategory.shareOfExpenses >= 0.4 ? 'medium' : 'low',
    rationale:
      `${topCategory.category} is the largest manual expense category in the current transaction set.`,
    route: '/transactions',
    title: `${topCategory.category} leads expense categories`,
    uncertainty:
      'This does not include uncaptured transactions, account balance imports, or merchant-level reconciliation.'
  };
}

function buildAccountInsights(accounts: InsightAccount[], today: string): FinancialInsight[] {
  if (accounts.length === 0) {
    return [
      {
        action:
          'Add an account with a dated balance or import a bounded account-balance CSV before relying on net-worth recommendations.',
        area: 'accounts',
        assumptions: ['No active financial accounts are stored for this signed-in user.'],
        category: 'setup',
        evidence: [{ label: 'Accounts', value: '0' }],
        id: 'accounts-setup-add-balance',
        priority: 'medium',
        rationale:
          'Account and net-worth trend insights require at least one persisted dated balance.',
        route: '/accounts',
        title: 'Add account history',
        uncertainty:
          'Manual balances are only as current as the date entered or imported.'
      }
    ];
  }

  const insights: FinancialInsight[] = [];
  const trends = accounts
    .map(toAccountTrend)
    .filter((trend): trend is AccountTrend => trend !== null);
  const staleAccounts = accounts.filter((account) => {
    if (!account.latestBalanceDate) return true;
    return daysBetween(account.latestBalanceDate, today) > staleBalanceDays;
  });

  if (trends.length > 0) {
    const netDelta = trends.reduce((total, trend) => total + trend.netWorthDeltaCents, 0);
    const largestMove = trends
      .slice()
      .sort((left, right) => Math.abs(right.netWorthDeltaCents) - Math.abs(left.netWorthDeltaCents))[0];

    insights.push({
      action:
        netDelta < 0
          ? 'Open the accounts with the largest changes and decide whether the movement is expected before using net worth in a plan.'
          : 'Keep this trend current by recording another dated balance after the next statement or import.',
      area: 'accounts',
      assumptions: [
        'Trend uses only active accounts with at least two distinct balance dates.',
        'Liability reductions count as positive net-worth movement.'
      ],
      category: 'observation',
      evidence: [
        { label: 'Accounts with history', value: String(trends.length) },
        { label: 'Net movement', value: formatSignedCents(netDelta) },
        {
          label: 'Largest move',
          value: largestMove.account.name,
          detail: formatSignedCents(largestMove.netWorthDeltaCents)
        }
      ],
      id: 'accounts-net-worth-trend',
      priority: netDelta < 0 ? 'medium' : 'low',
      rationale:
        'Dated balance history can explain whether the latest net-worth snapshot moved up or down.',
      route: '/accounts',
      title: netDelta < 0 ? 'Net worth moved down in recent history' : 'Net worth has a dated trend',
      uncertainty:
        'The trend is not calendar-normalized across accounts and does not include transactions or market attribution yet.'
    });
  } else {
    insights.push({
      action:
        'Record a second dated balance for at least one account to unlock real trend observations.',
      area: 'accounts',
      assumptions: ['Current account data has fewer than two distinct balance dates per active account.'],
      category: 'setup',
      evidence: [
        { label: 'Accounts', value: String(accounts.length) },
        { label: 'Trend-ready accounts', value: '0' }
      ],
      id: 'accounts-setup-second-balance',
      priority: 'medium',
      rationale:
        'Trend recommendations should not be generated from a single point-in-time balance.',
      route: '/accounts',
      title: 'Add one more balance date',
      uncertainty:
        'A second balance creates a direction, but longer history is needed for stronger patterns.'
    });
  }

  if (staleAccounts.length > 0) {
    insights.push({
      action:
        'Update stale balances before importing them into a plan or treating dashboard totals as current.',
      area: 'accounts',
      assumptions: [`A stale balance is older than ${staleBalanceDays} days or has no balance date.`],
      category: 'recommendation',
      evidence: [
        { label: 'Stale accounts', value: String(staleAccounts.length) },
        { label: 'Oldest', value: staleAccounts[0].name }
      ],
      id: 'accounts-refresh-stale-balances',
      priority: 'medium',
      rationale:
        'Old balances weaken plan imports and dashboard summaries because the account value may have changed materially.',
      route: '/accounts',
      title: 'Refresh stale balances',
      uncertainty:
        'Some low-volatility accounts may not need frequent updates, but the app cannot infer that yet.'
    });
  }

  return insights;
}

function toAccountTrend(account: InsightAccount): AccountTrend | null {
  const balancesByDate = uniqueBalancesByDate(account.balanceHistory);

  if (balancesByDate.length < 2) {
    return null;
  }

  const [latest, previous] = balancesByDate;
  const latestNet = account.category === 'liability' ? -latest.balanceCents : latest.balanceCents;
  const previousNet = account.category === 'liability' ? -previous.balanceCents : previous.balanceCents;

  return {
    account,
    latest,
    netWorthDeltaCents: latestNet - previousNet,
    previous
  };
}

function uniqueBalancesByDate(balances: InsightAccountBalance[]): InsightAccountBalance[] {
  const seen = new Set<string>();

  return balances
    .filter((balance) => /^\d{4}-\d{2}-\d{2}$/.test(balance.balanceDate))
    .slice()
    .sort((left, right) => right.balanceDate.localeCompare(left.balanceDate))
    .filter((balance) => {
      if (seen.has(balance.balanceDate)) {
        return false;
      }

      seen.add(balance.balanceDate);
      return true;
    });
}

function buildPrivacyInsight(): FinancialInsight {
  return {
    action:
      'Treat each recommendation as a checklist item. Review the cited evidence and edit the underlying account, goal, or plan before acting.',
    area: 'privacy',
    assumptions: [
      'Insights are generated locally in the React app from data already loaded for signed-in routes.',
      'No AI summary, external account connection, transaction import, or third-party financial analysis is used in this phase.'
    ],
    category: 'observation',
    evidence: [
      { label: 'Method', value: 'Rule-based' },
      { label: 'Data scope', value: 'Saved account, goal, plan, and transaction data only' }
    ],
    id: 'privacy-rule-based-guidance',
    priority: 'low',
    rationale:
      'Financial guidance should be explainable before the product introduces richer automation or AI-assisted summaries.',
    route: '/reports',
    title: 'How these insights are produced',
    uncertainty:
      'The app does not know taxes, account restrictions, household income, or external balances unless you model them.'
  };
}

function compareInsights(left: FinancialInsight, right: FinancialInsight): number {
  const priorityDifference = priorityRank(left.priority) - priorityRank(right.priority);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const categoryDifference = categoryRank(left.category) - categoryRank(right.category);

  if (categoryDifference !== 0) {
    return categoryDifference;
  }

  return areaRank(left.area) - areaRank(right.area);
}

function priorityRank(priority: InsightPriority): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function categoryRank(category: InsightCategory): number {
  if (category === 'recommendation') return 0;
  if (category === 'setup') return 1;
  return 2;
}

function areaRank(area: InsightArea): number {
  if (area === 'plan') return 0;
  if (area === 'goals') return 1;
  if (area === 'transactions') return 2;
  if (area === 'accounts') return 3;
  return 4;
}

function formatEvidenceNumber(label: string, value: number): string {
  if (
    label.toLowerCase().includes('portfolio') ||
    label.toLowerCase().includes('balance') ||
    label.toLowerCase().includes('expense') ||
    label.toLowerCase().includes('coverage')
  ) {
    return formatMoney(value);
  }

  if (label.toLowerCase().includes('ratio')) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
      style: 'percent'
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1
  }).format(value);
}

function formatCents(cents: number): string {
  return formatMoney(cents / 100);
}

function formatSignedCents(cents: number): string {
  if (cents === 0) {
    return formatCents(0);
  }

  return `${cents > 0 ? '+' : '-'}${formatCents(Math.abs(cents))}`;
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    style: 'percent'
  }).format(value);
}

function sentenceLabel(label: string): string {
  const spaced = label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ');

  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}
