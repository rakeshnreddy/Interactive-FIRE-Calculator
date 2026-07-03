import { describe, expect, it } from 'vitest';

import {
  parseTransactionCreatePayload,
  parseTransactionUpdatePayload,
  summarizeTransactions,
  type Transaction
} from '../functions/_lib/transactions';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    account: null,
    accountId: null,
    amountCents: 10_000,
    category: 'Dining',
    createdAt: '2026-07-01T00:00:00.000Z',
    description: 'Dinner',
    id: 'transaction-1',
    notes: null,
    signedCashFlowCents: -10_000,
    transactionDate: '2026-07-01',
    transactionType: 'expense',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides
  };
}

describe('transaction payload validation', () => {
  it('normalizes a valid create payload', () => {
    expect(
      parseTransactionCreatePayload({
        accountId: '  account-1  ',
        amountCents: 12_345,
        category: '  Salary  ',
        description: '  Paycheck  ',
        notes: '  July payroll  ',
        transactionDate: '2026-07-01',
        transactionType: 'income'
      })
    ).toEqual({
      ok: true,
      value: {
        accountId: 'account-1',
        amountCents: 12_345,
        category: 'Salary',
        description: 'Paycheck',
        notes: 'July payroll',
        transactionDate: '2026-07-01',
        transactionType: 'income'
      }
    });
  });

  it('rejects invalid dates, money, and transaction types', () => {
    expect(
      parseTransactionCreatePayload({
        amountCents: 0,
        description: 'Bad row',
        transactionDate: '2026-07-01',
        transactionType: 'expense'
      })
    ).toEqual({
      error: 'amountCents must be a positive integer number of cents.',
      ok: false
    });

    expect(
      parseTransactionCreatePayload({
        amountCents: 100,
        description: 'Bad row',
        transactionDate: '2026-02-30',
        transactionType: 'expense'
      })
    ).toEqual({
      error: 'transactionDate must be a real calendar date.',
      ok: false
    });

    expect(
      parseTransactionCreatePayload({
        amountCents: 100,
        description: 'Bad row',
        transactionDate: '2026-07-01',
        transactionType: 'refund'
      })
    ).toEqual({
      error: 'transactionType must be income, expense, transfer, or adjustment.',
      ok: false
    });
  });

  it('normalizes nullable account/category fields and rejects empty updates', () => {
    expect(parseTransactionUpdatePayload({ accountId: '', category: '  ' })).toEqual({
      ok: true,
      value: {
        accountId: null,
        category: null
      }
    });

    expect(parseTransactionUpdatePayload({})).toEqual({
      error: 'At least one valid transaction field is required.',
      ok: false
    });
  });
});

describe('transaction summaries', () => {
  it('keeps income, expense, transfer, adjustment, and net cash flow separate', () => {
    const summary = summarizeTransactions([
      transaction({ amountCents: 500_000, id: 'income', signedCashFlowCents: 500_000, transactionType: 'income' }),
      transaction({ amountCents: 125_000, id: 'expense', signedCashFlowCents: -125_000, transactionType: 'expense' }),
      transaction({ amountCents: 80_000, id: 'transfer', signedCashFlowCents: 0, transactionType: 'transfer' }),
      transaction({ amountCents: 20_000, id: 'adjustment', signedCashFlowCents: 0, transactionType: 'adjustment' })
    ]);

    expect(summary).toEqual({
      adjustmentCents: 20_000,
      expenseCents: 125_000,
      incomeCents: 500_000,
      latestTransactionDate: '2026-07-01',
      netCashFlowCents: 375_000,
      transactionCount: 4,
      transferCents: 80_000
    });
  });
});
