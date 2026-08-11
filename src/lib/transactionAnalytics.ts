export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment';

export type TransactionAnalyticsAccount = {
  id: string;
  name: string;
} | null;

export type TransactionAnalyticsRow = {
  account: TransactionAnalyticsAccount;
  accountId: string | null;
  amountCents: number;
  category: string | null;
  description: string;
  id: string;
  notes: string | null;
  transactionDate: string;
  transactionType: TransactionType;
};

export type TransactionFilters = {
  accountId: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  query: string;
  transactionType: 'all' | TransactionType;
};

export type TransactionCategoryRollup = {
  amountCents: number;
  category: string;
  count: number;
  shareOfExpenses: number;
};

export type TransactionCashflowRollup = {
  currentMonth: string;
  currentMonthExpenseCents: number;
  currentMonthIncomeCents: number;
  currentMonthNetCashFlowCents: number;
  currentMonthTransactionCount: number;
  latestTransactionDate: string | null;
  previousMonth: string;
  previousMonthExpenseCents: number;
  previousMonthIncomeCents: number;
  previousMonthNetCashFlowCents: number;
  recentTransactions: TransactionAnalyticsRow[];
  topExpenseCategories: TransactionCategoryRollup[];
  totalAdjustmentCents: number;
  totalExpenseCents: number;
  totalIncomeCents: number;
  totalNetCashFlowCents: number;
  totalTransactionCount: number;
  totalTransferCents: number;
  uncategorizedExpenseCount: number;
};

export const allTransactionCategoryFilter = 'all';
export const uncategorizedTransactionCategoryFilter = 'uncategorized';
export const allTransactionAccountFilter = 'all';
export const unlinkedTransactionAccountFilter = 'unlinked';

export const transactionCategorySuggestions = [
  'Housing',
  'Groceries',
  'Dining',
  'Transportation',
  'Utilities',
  'Income',
  'Healthcare',
  'Subscriptions',
  'Debt',
  'Transfer',
  'Taxes',
  'Travel',
  'Education',
  'Savings',
  'Other'
] as const;

export function emptyTransactionFilters(): TransactionFilters {
  return {
    accountId: allTransactionAccountFilter,
    category: allTransactionCategoryFilter,
    dateFrom: '',
    dateTo: '',
    query: '',
    transactionType: 'all'
  };
}

export function filterTransactions<T extends TransactionAnalyticsRow>(
  transactions: T[],
  filters: TransactionFilters
): T[] {
  const query = filters.query.trim().toLowerCase();
  const categoryFilter = normalizeCategoryKey(filters.category);

  return transactions.filter((transaction) => {
    if (filters.transactionType !== 'all' && transaction.transactionType !== filters.transactionType) {
      return false;
    }

    if (filters.accountId === unlinkedTransactionAccountFilter && transaction.accountId !== null) {
      return false;
    }

    if (
      filters.accountId !== allTransactionAccountFilter &&
      filters.accountId !== unlinkedTransactionAccountFilter &&
      transaction.accountId !== filters.accountId
    ) {
      return false;
    }

    if (filters.category === uncategorizedTransactionCategoryFilter && transaction.category) {
      return false;
    }

    if (
      filters.category !== allTransactionCategoryFilter &&
      filters.category !== uncategorizedTransactionCategoryFilter &&
      normalizeCategoryKey(transaction.category) !== categoryFilter
    ) {
      return false;
    }

    if (filters.dateFrom && transaction.transactionDate < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && transaction.transactionDate > filters.dateTo) {
      return false;
    }

    if (query && !transactionMatchesQuery(transaction, query)) {
      return false;
    }

    return true;
  });
}

export function getTransactionCategoryOptions(transactions: TransactionAnalyticsRow[]): string[] {
  const categories = new Map<string, string>();

  for (const category of transactionCategorySuggestions) {
    categories.set(normalizeCategoryKey(category), category);
  }

  for (const transaction of transactions) {
    const normalized = normalizeTransactionCategoryInput(transaction.category ?? '');

    if (normalized) {
      categories.set(normalizeCategoryKey(normalized), normalized);
    }
  }

  return Array.from(categories.values()).sort((left, right) => left.localeCompare(right));
}

export function normalizeTransactionCategoryInput(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return '';
  }

  const suggestion = transactionCategorySuggestions.find(
    (category) => normalizeCategoryKey(category) === normalizeCategoryKey(trimmed)
  );

  if (suggestion) {
    return suggestion;
  }

  return trimmed
    .split(' ')
    .map((part) => {
      if (part.length <= 2 && part === part.toUpperCase()) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

export function transactionCategoryLabel(category: string | null): string {
  return category ? normalizeTransactionCategoryInput(category) : 'Uncategorized';
}

export function buildTransactionCashflowRollup(
  transactions: TransactionAnalyticsRow[],
  today = new Date().toISOString().slice(0, 10)
): TransactionCashflowRollup {
  const currentMonth = monthKey(today);
  const previousMonth = previousMonthKey(currentMonth);
  const currentMonthRows = transactions.filter((transaction) => monthKey(transaction.transactionDate) === currentMonth);
  const previousMonthRows = transactions.filter((transaction) => monthKey(transaction.transactionDate) === previousMonth);
  const totalIncomeCents = sumByType(transactions, 'income');
  const totalExpenseCents = sumByType(transactions, 'expense');

  return {
    currentMonth,
    currentMonthExpenseCents: sumByType(currentMonthRows, 'expense'),
    currentMonthIncomeCents: sumByType(currentMonthRows, 'income'),
    currentMonthNetCashFlowCents: netCashFlow(currentMonthRows),
    currentMonthTransactionCount: currentMonthRows.length,
    latestTransactionDate: latestTransactionDate(transactions),
    previousMonth,
    previousMonthExpenseCents: sumByType(previousMonthRows, 'expense'),
    previousMonthIncomeCents: sumByType(previousMonthRows, 'income'),
    previousMonthNetCashFlowCents: netCashFlow(previousMonthRows),
    recentTransactions: transactions
      .slice()
      .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate) || right.id.localeCompare(left.id))
      .slice(0, 5),
    topExpenseCategories: topExpenseCategories(transactions),
    totalAdjustmentCents: sumByType(transactions, 'adjustment'),
    totalExpenseCents,
    totalIncomeCents,
    totalNetCashFlowCents: totalIncomeCents - totalExpenseCents,
    totalTransactionCount: transactions.length,
    totalTransferCents: sumByType(transactions, 'transfer'),
    uncategorizedExpenseCount: transactions.filter(
      (transaction) => transaction.transactionType === 'expense' && !transaction.category
    ).length
  };
}

function transactionMatchesQuery(transaction: TransactionAnalyticsRow, query: string): boolean {
  const searchable = [
    transaction.description,
    transaction.category ?? '',
    transaction.notes ?? '',
    transaction.account?.name ?? '',
    transaction.transactionType
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(query);
}

function normalizeCategoryKey(value: string | null): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function monthKey(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : '';
}

function previousMonthKey(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);

  if (!year || !monthIndex) {
    return '';
  }

  const previous = new Date(Date.UTC(year, monthIndex - 2, 1));
  return previous.toISOString().slice(0, 7);
}

function sumByType(transactions: TransactionAnalyticsRow[], transactionType: TransactionType): number {
  return transactions
    .filter((transaction) => transaction.transactionType === transactionType)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

function netCashFlow(transactions: TransactionAnalyticsRow[]): number {
  return sumByType(transactions, 'income') - sumByType(transactions, 'expense');
}

function latestTransactionDate(transactions: TransactionAnalyticsRow[]): string | null {
  return transactions.reduce<string | null>(
    (latest, transaction) =>
      latest === null || transaction.transactionDate > latest ? transaction.transactionDate : latest,
    null
  );
}

function topExpenseCategories(transactions: TransactionAnalyticsRow[]): TransactionCategoryRollup[] {
  const expenseRows = transactions.filter((transaction) => transaction.transactionType === 'expense');
  const totalExpenseCents = expenseRows.reduce((total, transaction) => total + transaction.amountCents, 0);
  const byCategory = new Map<string, TransactionCategoryRollup>();

  for (const transaction of expenseRows) {
    const category = transactionCategoryLabel(transaction.category);
    const current = byCategory.get(category) ?? {
      amountCents: 0,
      category,
      count: 0,
      shareOfExpenses: 0
    };

    byCategory.set(category, {
      ...current,
      amountCents: current.amountCents + transaction.amountCents,
      count: current.count + 1
    });
  }

  return Array.from(byCategory.values())
    .map((category) => ({
      ...category,
      shareOfExpenses: totalExpenseCents > 0 ? category.amountCents / totalExpenseCents : 0
    }))
    .sort((left, right) => right.amountCents - left.amountCents || left.category.localeCompare(right.category))
    .slice(0, 5);
}
