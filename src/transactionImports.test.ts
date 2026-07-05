import { describe, expect, it } from 'vitest';

import {
  parseTransactionImportPayload,
  validateTransactionImportRows,
  type ImportAccount,
  type RawTransactionImportRow
} from '../functions/_lib/transactionImports';

const accounts: ImportAccount[] = [
  { id: 'checking-1', name: 'Checking' },
  { id: 'card-1', name: 'Travel Card' },
  { id: 'shared-1', name: 'Shared' },
  { id: 'shared-2', name: 'Shared' }
];

const row = (overrides: Partial<RawTransactionImportRow> = {}): RawTransactionImportRow => ({
  account: 'Checking',
  amount: '1,234.56',
  category: 'Housing',
  description: 'Rent',
  notes: 'Imported from bank',
  rowNumber: 2,
  transactionDate: '2026-07-01',
  type: 'expense',
  ...overrides
});

describe('transaction import payload validation', () => {
  it('accepts a bounded raw-row payload', () => {
    expect(parseTransactionImportPayload({ fileName: 'transactions.csv', rows: [row()] })).toEqual({
      ok: true,
      value: { fileName: 'transactions.csv', rows: [row()] }
    });
  });

  it('rejects missing rows and malformed row fields', () => {
    expect(parseTransactionImportPayload({ fileName: 'transactions.csv', rows: [] })).toEqual({
      error: 'rows must contain between 1 and 500 entries.',
      ok: false
    });

    expect(parseTransactionImportPayload({ fileName: 'transactions.csv', rows: [{ ...row(), rowNumber: 1 }] })).toEqual({
      error: 'Each rowNumber must be an integer greater than or equal to 2.',
      ok: false
    });

    expect(parseTransactionImportPayload({ fileName: 'transactions.csv', rows: [row(), row()] })).toEqual({
      error: 'Each rowNumber must be unique.',
      ok: false
    });
  });
});

describe('transaction import review', () => {
  it('matches accounts by exact name or id and converts decimal amounts to cents', () => {
    const preview = validateTransactionImportRows(
      [row(), row({ account: 'card-1', amount: '500', rowNumber: 3, type: 'income' })],
      accounts,
      []
    );

    expect(preview.summary).toEqual({ duplicateRows: 0, errorRows: 0, readyRows: 2, totalRows: 2 });
    expect(preview.rows).toMatchObject([
      { accountId: 'checking-1', amountCents: 123_456, status: 'ready', transactionType: 'expense' },
      { accountId: 'card-1', amountCents: 50_000, status: 'ready', transactionType: 'income' }
    ]);
  });

  it('allows intentionally unlinked rows', () => {
    const preview = validateTransactionImportRows(
      [row({ account: '', rowNumber: 2 })],
      accounts,
      []
    );

    expect(preview.summary.readyRows).toBe(1);
    expect(preview.rows[0]).toMatchObject({ accountId: null, accountName: 'No account link', status: 'ready' });
  });

  it('marks existing transactions and repeated file rows as duplicates', () => {
    const preview = validateTransactionImportRows(
      [row(), row({ rowNumber: 3 })],
      accounts,
      [
        {
          account_id: 'checking-1',
          amount_cents: 123_456,
          category: 'Housing',
          description: 'Rent',
          notes: 'Imported from bank',
          transaction_date: '2026-07-01',
          transaction_type: 'expense'
        }
      ]
    );

    expect(preview.summary).toEqual({ duplicateRows: 2, errorRows: 0, readyRows: 0, totalRows: 2 });
    expect(preview.rows.map((item) => item.status)).toEqual(['duplicate', 'duplicate']);
  });

  it('rejects ambiguous accounts, invalid dates, invalid amounts, and invalid types', () => {
    const preview = validateTransactionImportRows(
      [
        row({ account: 'Shared' }),
        row({ transactionDate: '07/01/2026', rowNumber: 3 }),
        row({ amount: '-1', rowNumber: 4 }),
        row({ rowNumber: 5, type: 'refund' })
      ],
      accounts,
      []
    );

    expect(preview.summary).toEqual({ duplicateRows: 0, errorRows: 4, readyRows: 0, totalRows: 4 });
    expect(preview.rows.map((item) => item.message)).toEqual([
      'Account name is ambiguous; use the account ID.',
      'Transaction date must use YYYY-MM-DD.',
      'Amount must be a positive amount with at most two decimals.',
      'Type must be income, expense, transfer, or adjustment.'
    ]);
  });
});
