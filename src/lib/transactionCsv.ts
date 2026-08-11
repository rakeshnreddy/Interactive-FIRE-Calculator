import Papa from 'papaparse';

export const TRANSACTION_CSV_HEADERS = [
  'transaction_date',
  'description',
  'amount',
  'type',
  'category',
  'account',
  'notes'
] as const;
export const TRANSACTION_CSV_MAX_BYTES = 256 * 1024;
export const TRANSACTION_CSV_MAX_ROWS = 500;

export type TransactionCsvRow = {
  account: string;
  amount: string;
  category: string;
  description: string;
  notes: string;
  rowNumber: number;
  transactionDate: string;
  type: string;
};

export type TransactionCsvParseResult =
  | { error: string; ok: false }
  | { ok: true; rows: TransactionCsvRow[] };

export function parseTransactionCsv(csv: string): TransactionCsvParseResult {
  if (new TextEncoder().encode(csv).byteLength > TRANSACTION_CSV_MAX_BYTES) {
    return { error: 'CSV files must be 256 KB or smaller.', ok: false };
  }

  const result = Papa.parse<string[]>(csv, {
    delimiter: ',',
    skipEmptyLines: 'greedy'
  });

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    return {
      error: `CSV parsing failed${typeof firstError.row === 'number' ? ` near row ${firstError.row + 1}` : ''}: ${firstError.message}`,
      ok: false
    };
  }

  if (result.data.length === 0) {
    return { error: 'CSV file is empty.', ok: false };
  }

  const headers = result.data[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toLowerCase()
  );
  const uniqueHeaders = new Set(headers);

  if (
    headers.length !== TRANSACTION_CSV_HEADERS.length ||
    uniqueHeaders.size !== TRANSACTION_CSV_HEADERS.length ||
    TRANSACTION_CSV_HEADERS.some((header) => !uniqueHeaders.has(header))
  ) {
    return { error: `CSV headers must be exactly: ${TRANSACTION_CSV_HEADERS.join(', ')}.`, ok: false };
  }

  const dataRows = result.data.slice(1);

  if (dataRows.length === 0) {
    return { error: 'CSV must include at least one transaction row.', ok: false };
  }

  if (dataRows.length > TRANSACTION_CSV_MAX_ROWS) {
    return { error: `CSV files may contain at most ${TRANSACTION_CSV_MAX_ROWS} transaction rows.`, ok: false };
  }

  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const rows: TransactionCsvRow[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const values = dataRows[index];

    if (values.length !== headers.length) {
      return { error: `CSV row ${index + 2} must contain exactly seven values.`, ok: false };
    }

    rows.push({
      account: values[indexByHeader.get('account') ?? -1] ?? '',
      amount: values[indexByHeader.get('amount') ?? -1] ?? '',
      category: values[indexByHeader.get('category') ?? -1] ?? '',
      description: values[indexByHeader.get('description') ?? -1] ?? '',
      notes: values[indexByHeader.get('notes') ?? -1] ?? '',
      rowNumber: index + 2,
      transactionDate: values[indexByHeader.get('transaction_date') ?? -1] ?? '',
      type: values[indexByHeader.get('type') ?? -1] ?? ''
    });
  }

  return { ok: true, rows };
}

export function buildTransactionCsvTemplate(
  accounts: Array<{ id: string; name: string }>,
  transactionDate = new Date().toISOString().slice(0, 10)
): string {
  const rows = accounts.length > 0
    ? accounts.slice(0, 3).map((account) => ({
        transaction_date: transactionDate,
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        account: account.name,
        notes: ''
      }))
    : [{
        transaction_date: transactionDate,
        description: '',
        amount: '',
        type: 'expense',
        category: '',
        account: '',
        notes: ''
      }];

  return Papa.unparse(rows, {
    columns: [...TRANSACTION_CSV_HEADERS],
    escapeFormulae: true,
    header: true,
    newline: '\n'
  });
}
