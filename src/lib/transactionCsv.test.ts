import { describe, expect, it } from 'vitest';

import { buildTransactionCsvTemplate, parseTransactionCsv } from './transactionCsv';

describe('parseTransactionCsv', () => {
  it('parses quoted values and header columns in any order', () => {
    const result = parseTransactionCsv(
      'notes,type,amount,description,transaction_date,account,category\n"Imported, reviewed",expense,"1,234.56","Rent",2026-07-01,"Checking","Housing"\n'
    );

    expect(result).toEqual({
      ok: true,
      rows: [
        {
          account: 'Checking',
          amount: '1,234.56',
          category: 'Housing',
          description: 'Rent',
          notes: 'Imported, reviewed',
          rowNumber: 2,
          transactionDate: '2026-07-01',
          type: 'expense'
        }
      ]
    });
  });

  it('rejects missing, duplicate, and extra headers', () => {
    expect(parseTransactionCsv('transaction_date,description,amount,type\n2026-07-01,Rent,100,expense\n')).toEqual({
      error: 'CSV headers must be exactly: transaction_date, description, amount, type, category, account, notes.',
      ok: false
    });

    expect(parseTransactionCsv('transaction_date,description,amount,type,category,account,account\n2026-07-01,Rent,100,expense,Housing,Cash,Cash\n')).toEqual({
      error: 'CSV headers must be exactly: transaction_date, description, amount, type, category, account, notes.',
      ok: false
    });
  });

  it('rejects empty and oversized row sets', () => {
    expect(parseTransactionCsv('transaction_date,description,amount,type,category,account,notes\n')).toEqual({
      error: 'CSV must include at least one transaction row.',
      ok: false
    });

    const body = Array.from({ length: 501 }, (_, index) => `2026-07-01,Row ${index},1,expense,,,`).join('\n');
    expect(parseTransactionCsv(`transaction_date,description,amount,type,category,account,notes\n${body}`)).toEqual({
      error: 'CSV files may contain at most 500 transaction rows.',
      ok: false
    });
  });
});

describe('buildTransactionCsvTemplate', () => {
  it('creates a parseable account template', () => {
    const csv = buildTransactionCsvTemplate([{ id: 'cash-1', name: 'Everyday Cash' }], '2026-07-05');

    expect(csv).toContain('transaction_date,description,amount,type,category,account,notes');
    expect(csv).toContain('2026-07-05,,,expense,,Everyday Cash,');
  });
});
