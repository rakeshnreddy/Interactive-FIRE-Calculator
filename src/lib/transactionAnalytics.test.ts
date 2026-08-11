import { describe, expect, it } from 'vitest';

import {
  buildTransactionCashflowRollup,
  emptyTransactionFilters,
  filterTransactions,
  getTransactionCategoryOptions,
  normalizeTransactionCategoryInput,
  transactionCategoryLabel,
  type TransactionAnalyticsRow
} from './transactionAnalytics';

function row(overrides: Partial<TransactionAnalyticsRow> = {}): TransactionAnalyticsRow {
  return {
    account: null,
    accountId: null,
    amountCents: 10_000,
    category: 'Dining',
    description: 'Dinner',
    id: 'transaction-1',
    notes: null,
    transactionDate: '2026-07-02',
    transactionType: 'expense',
    ...overrides
  };
}

describe('transaction filtering', () => {
  it('filters by query, type, account, category, and date range', () => {
    const transactions = [
      row({
        account: { id: 'checking', name: 'Checking' },
        accountId: 'checking',
        category: 'Groceries',
        description: 'Market run',
        id: 'groceries',
        transactionDate: '2026-07-03'
      }),
      row({
        account: { id: 'card', name: 'Travel Card' },
        accountId: 'card',
        category: 'Travel',
        description: 'Hotel',
        id: 'hotel',
        transactionDate: '2026-06-29'
      }),
      row({ category: null, description: 'Cash adjustment', id: 'adjustment', transactionType: 'adjustment' })
    ];

    expect(
      filterTransactions(transactions, {
        ...emptyTransactionFilters(),
        accountId: 'checking',
        category: 'Groceries',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        query: 'market',
        transactionType: 'expense'
      }).map((transaction) => transaction.id)
    ).toEqual(['groceries']);
  });

  it('can isolate unlinked and uncategorized rows', () => {
    const transactions = [
      row({ accountId: 'checking', category: 'Dining', id: 'linked' }),
      row({ accountId: null, category: null, id: 'unlinked' })
    ];

    expect(
      filterTransactions(transactions, {
        ...emptyTransactionFilters(),
        accountId: 'unlinked',
        category: 'uncategorized'
      }).map((transaction) => transaction.id)
    ).toEqual(['unlinked']);
  });
});

describe('transaction category helpers', () => {
  it('normalizes known categories and preserves custom categories as title case', () => {
    expect(normalizeTransactionCategoryInput('  groceries  ')).toBe('Groceries');
    expect(normalizeTransactionCategoryInput('side quest money')).toBe('Side Quest Money');
    expect(transactionCategoryLabel(null)).toBe('Uncategorized');
  });

  it('combines starter suggestions with saved transaction categories', () => {
    const options = getTransactionCategoryOptions([
      row({ category: 'book clubs' }),
      row({ category: 'Dining' })
    ]);

    expect(options).toContain('Book Clubs');
    expect(options).toContain('Groceries');
    expect(options.filter((category) => category === 'Dining')).toHaveLength(1);
  });
});

describe('transaction cashflow rollups', () => {
  it('builds current month, prior month, category, recent, and uncategorized summaries', () => {
    const rollup = buildTransactionCashflowRollup(
      [
        row({ amountCents: 500_000, category: 'Income', id: 'paycheck', transactionDate: '2026-07-01', transactionType: 'income' }),
        row({ amountCents: 125_000, category: 'Housing', id: 'rent', transactionDate: '2026-07-02' }),
        row({ amountCents: 25_000, category: 'Dining', id: 'dining', transactionDate: '2026-07-03' }),
        row({ amountCents: 5_000, category: null, id: 'misc', transactionDate: '2026-07-04' }),
        row({ amountCents: 20_000, category: 'Dining', id: 'old-dining', transactionDate: '2026-06-20' }),
        row({ amountCents: 40_000, category: 'Transfer', id: 'transfer', transactionDate: '2026-07-04', transactionType: 'transfer' })
      ],
      '2026-07-04'
    );

    expect(rollup.currentMonth).toBe('2026-07');
    expect(rollup.previousMonth).toBe('2026-06');
    expect(rollup.currentMonthIncomeCents).toBe(500_000);
    expect(rollup.currentMonthExpenseCents).toBe(155_000);
    expect(rollup.currentMonthNetCashFlowCents).toBe(345_000);
    expect(rollup.previousMonthExpenseCents).toBe(20_000);
    expect(rollup.totalTransferCents).toBe(40_000);
    expect(rollup.uncategorizedExpenseCount).toBe(1);
    expect(rollup.topExpenseCategories[0]).toMatchObject({
      amountCents: 125_000,
      category: 'Housing',
      count: 1
    });
    expect(rollup.recentTransactions.map((transaction) => transaction.id)).toEqual([
      'transfer',
      'misc',
      'dining',
      'rent',
      'paycheck'
    ]);
  });
});
