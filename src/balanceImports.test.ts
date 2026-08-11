import { describe, expect, it } from 'vitest';

import {
  parseBalanceImportPayload,
  validateBalanceImportRows,
  type ImportAccount,
  type RawBalanceImportRow
} from '../functions/_lib/balanceImports';

const accounts: ImportAccount[] = [
  { currency: 'USD', id: 'brokerage-1', name: 'Brokerage' },
  { currency: 'USD', id: 'cash-1', name: 'Everyday Cash' },
  { currency: 'USD', id: 'duplicate-name-1', name: 'Shared' },
  { currency: 'USD', id: 'duplicate-name-2', name: 'Shared' }
];

const row = (overrides: Partial<RawBalanceImportRow> = {}): RawBalanceImportRow => ({
  account: 'Brokerage',
  balance: '12,345.67',
  balanceDate: '2026-06-22',
  currency: 'usd',
  rowNumber: 2,
  ...overrides
});

describe('balance import payload validation', () => {
  it('accepts a bounded raw-row payload', () => {
    expect(parseBalanceImportPayload({ fileName: 'balances.csv', rows: [row()] })).toEqual({
      ok: true,
      value: { fileName: 'balances.csv', rows: [row()] }
    });
  });

  it('rejects missing rows and malformed row fields', () => {
    expect(parseBalanceImportPayload({ fileName: 'balances.csv', rows: [] })).toEqual({
      error: 'rows must contain between 1 and 500 entries.',
      ok: false
    });
    expect(parseBalanceImportPayload({ fileName: 'balances.csv', rows: [{ ...row(), rowNumber: 1 }] })).toEqual({
      error: 'Each rowNumber must be an integer greater than or equal to 2.',
      ok: false
    });
    expect(parseBalanceImportPayload({ fileName: 'balances.csv', rows: [row(), row()] })).toEqual({
      error: 'Each rowNumber must be unique.',
      ok: false
    });
  });
});

describe('balance import review', () => {
  it('matches by exact account name or id and converts decimal amounts to cents', () => {
    const preview = validateBalanceImportRows(
      [row(), row({ account: 'cash-1', balance: '500', rowNumber: 3 })],
      accounts,
      []
    );

    expect(preview.summary).toEqual({ duplicateRows: 0, errorRows: 0, readyRows: 2, totalRows: 2 });
    expect(preview.rows).toMatchObject([
      { accountId: 'brokerage-1', balanceCents: 1_234_567, status: 'ready' },
      { accountId: 'cash-1', balanceCents: 50_000, status: 'ready' }
    ]);
  });

  it('marks existing snapshots and repeated file rows as duplicates', () => {
    const preview = validateBalanceImportRows(
      [row(), row({ rowNumber: 3 })],
      accounts,
      [{ accountId: 'brokerage-1', balanceCents: 1_234_567, balanceDate: '2026-06-22' }]
    );

    expect(preview.summary).toEqual({ duplicateRows: 2, errorRows: 0, readyRows: 0, totalRows: 2 });
    expect(preview.rows.map((item) => item.status)).toEqual(['duplicate', 'duplicate']);
  });

  it('rejects conflicting balances for the same account and date', () => {
    const preview = validateBalanceImportRows(
      [row(), row({ balance: '15,000', rowNumber: 3 })],
      accounts,
      []
    );

    expect(preview.summary).toEqual({ duplicateRows: 0, errorRows: 2, readyRows: 0, totalRows: 2 });
    expect(preview.rows.every((item) => item.message.includes('Multiple balances'))).toBe(true);
  });

  it('rejects ambiguous accounts, currency mismatches, invalid dates, and invalid money', () => {
    const preview = validateBalanceImportRows(
      [
        row({ account: 'Shared' }),
        row({ currency: 'EUR', rowNumber: 3 }),
        row({ balanceDate: '06/22/2026', rowNumber: 4 }),
        row({ balance: '-1', rowNumber: 5 })
      ],
      accounts,
      []
    );

    expect(preview.summary).toEqual({ duplicateRows: 0, errorRows: 4, readyRows: 0, totalRows: 4 });
    expect(preview.rows.map((item) => item.message)).toEqual([
      'Account name is ambiguous; use the account ID.',
      'Currency must match USD for Brokerage.',
      'Balance date must use YYYY-MM-DD.',
      'Balance must be a non-negative amount with at most two decimals.'
    ]);
  });

  it('rejects a different existing balance on the same date', () => {
    const preview = validateBalanceImportRows(
      [row()],
      accounts,
      [{ accountId: 'brokerage-1', balanceCents: 2_000_000, balanceDate: '2026-06-22' }]
    );

    expect(preview.rows[0]).toMatchObject({ status: 'error' });
    expect(preview.rows[0].message).toContain('different balance already exists');
  });
});
