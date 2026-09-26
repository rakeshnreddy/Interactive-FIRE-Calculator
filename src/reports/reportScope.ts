import type { FinancialInsight, InsightAccount, InsightArea, InsightGoal, InsightPriority } from '../lib/insights';
import type { TransactionAnalyticsRow } from '../lib/transactionAnalytics';
import { escapeCsvCell } from '../lib/csv';

// What a report is based on, stated before any conclusion (B29). Missing history is reported as a
// gap, never as a zero value.
export type ReportScope = {
  asOf: string;
  planLabel: string;
  accountCount: number;
  staleAccountCount: number;
  currencies: string[];
  goalCount: number;
  transactionCount: number;
  transactionPeriod: { from: string; to: string } | null;
  gaps: string[];
};

const STALE_BALANCE_DAYS = 45;

function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function buildReportScope(input: {
  accounts: Array<InsightAccount & { isActive?: boolean }>;
  goals: InsightGoal[];
  transactions: TransactionAnalyticsRow[];
  planLabel: string | null;
  today: string;
}): ReportScope {
  const activeAccounts = input.accounts.filter((account) => account.isActive !== false);
  const staleAccountCount = activeAccounts.filter(
    (account) => !account.latestBalanceDate || daysBetween(account.latestBalanceDate, input.today) > STALE_BALANCE_DAYS
  ).length;
  const currencies = [...new Set(activeAccounts.map((account) => account.currency.toUpperCase()))].sort();
  const dates = input.transactions.map((row) => row.transactionDate).filter(Boolean).sort();
  const transactionPeriod = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null;
  const activeGoals = input.goals.filter((goal) => goal.status === 'active');

  const gaps: string[] = [];
  if (!input.planLabel) gaps.push('No FIRE plan is included, so plan-health guidance is limited to setup steps.');
  if (activeAccounts.length === 0) gaps.push('No accounts recorded: net worth and balance trends are unavailable, not zero.');
  if (staleAccountCount > 0) {
    gaps.push(`${staleAccountCount} of ${activeAccounts.length} account balance${activeAccounts.length === 1 ? ' is' : 's are'} older than ${STALE_BALANCE_DAYS} days or undated.`);
  }
  if (currencies.length > 1) gaps.push(`Balances are in ${currencies.join(' and ')}; amounts are shown per currency and never added across currencies.`);
  if (activeGoals.length === 0) gaps.push('No active goals: goal funding guidance is unavailable.');
  if (!transactionPeriod) gaps.push('No transactions recorded: cash-flow insights are unavailable, not zero.');
  else if (daysBetween(transactionPeriod.from, transactionPeriod.to) < 28) {
    gaps.push('Less than a month of transactions: cash-flow patterns may not be representative.');
  }

  return {
    asOf: input.today,
    planLabel: input.planLabel ?? 'None',
    accountCount: activeAccounts.length,
    staleAccountCount,
    currencies,
    goalCount: activeGoals.length,
    transactionCount: input.transactions.length,
    transactionPeriod,
    gaps
  };
}

export const PRIORITY_LABEL: Record<InsightPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' };
export const AREA_LABEL: Record<InsightArea, string> = { accounts: 'Accounts', goals: 'Goals', plan: 'Plan', transactions: 'Transactions', privacy: 'Method' };

// One row per evidence item, using exactly the strings the report shows on screen.
export function buildReportCsv(insights: FinancialInsight[], scope: ReportScope): string {
  const rows: Array<Array<string | number>> = [
    ['FinPath report', `As of ${scope.asOf}`],
    ['Plan', scope.planLabel],
    ['Accounts', scope.accountCount, 'Stale balances', scope.staleAccountCount, 'Currencies', scope.currencies.join(' ') || 'None'],
    ['Goals', scope.goalCount],
    ['Transactions', scope.transactionCount, 'Period', scope.transactionPeriod ? `${scope.transactionPeriod.from} to ${scope.transactionPeriod.to}` : 'None'],
    ...scope.gaps.map((gap) => ['Data gap', gap]),
    [],
    ['Priority', 'Area', 'Insight', 'Evidence', 'Value', 'Detail', 'Suggested next step']
  ];
  for (const insight of insights) {
    const evidence = insight.evidence.length ? insight.evidence : [{ label: '', value: '', detail: '' }];
    for (const item of evidence) {
      rows.push([PRIORITY_LABEL[insight.priority], AREA_LABEL[insight.area], insight.title, item.label, item.value, item.detail ?? '', insight.action]);
    }
  }
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}
