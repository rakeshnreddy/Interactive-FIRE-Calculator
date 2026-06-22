import { describe, expect, it } from 'vitest';
import { buildBalanceCsvTemplate, parseBalanceCsv } from './balanceCsv';

describe('parseBalanceCsv', () => {
  it('parses quoted values and header columns in any order', () => {
    const result = parseBalanceCsv(
      'currency,balance,account,balance_date\nUSD,"12,345.67","Brokerage, Joint",2026-06-22\n'
    );

    expect(result).toEqual({
      ok: true,
      rows: [
        {
          account: 'Brokerage, Joint',
          balance: '12,345.67',
          balanceDate: '2026-06-22',
          currency: 'USD',
          rowNumber: 2
        }
      ]
    });
  });

  it('rejects missing, duplicate, and extra headers', () => {
    expect(parseBalanceCsv('account,balance_date,balance\nCash,2026-06-22,100\n')).toEqual({
      error: 'CSV headers must be exactly: account, balance_date, balance, currency.',
      ok: false
    });
    expect(parseBalanceCsv('account,balance_date,balance,balance\nCash,2026-06-22,100,USD\n')).toEqual({
      error: 'CSV headers must be exactly: account, balance_date, balance, currency.',
      ok: false
    });
  });

  it('rejects empty and oversized row sets', () => {
    expect(parseBalanceCsv('account,balance_date,balance,currency\n')).toEqual({
      error: 'CSV must include at least one balance row.',
      ok: false
    });

    const body = Array.from({ length: 501 }, (_, index) => `Cash,2026-06-22,${index},USD`).join('\n');
    expect(parseBalanceCsv(`account,balance_date,balance,currency\n${body}`)).toEqual({
      error: 'CSV files may contain at most 500 balance rows.',
      ok: false
    });
  });
});

describe('buildBalanceCsvTemplate', () => {
  it('creates a parseable account template', () => {
    const csv = buildBalanceCsvTemplate(
      [{ currency: 'usd', id: 'cash-1', name: 'Everyday Cash' }],
      '2026-06-22'
    );

    expect(csv).toContain('account,balance_date,balance,currency');
    expect(csv).toContain('Everyday Cash,2026-06-22,,USD');
  });
});
