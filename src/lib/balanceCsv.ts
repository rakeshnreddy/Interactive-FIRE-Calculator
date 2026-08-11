import Papa from 'papaparse';

export const BALANCE_CSV_HEADERS = ['account', 'balance_date', 'balance', 'currency'] as const;
export const BALANCE_CSV_MAX_BYTES = 256 * 1024;
export const BALANCE_CSV_MAX_ROWS = 500;

export type BalanceCsvRow = {
  account: string;
  balance: string;
  balanceDate: string;
  currency: string;
  rowNumber: number;
};

export type BalanceCsvParseResult =
  | { error: string; ok: false }
  | { ok: true; rows: BalanceCsvRow[] };

export function parseBalanceCsv(csv: string): BalanceCsvParseResult {
  if (new TextEncoder().encode(csv).byteLength > BALANCE_CSV_MAX_BYTES) {
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
    headers.length !== BALANCE_CSV_HEADERS.length ||
    uniqueHeaders.size !== BALANCE_CSV_HEADERS.length ||
    BALANCE_CSV_HEADERS.some((header) => !uniqueHeaders.has(header))
  ) {
    return { error: `CSV headers must be exactly: ${BALANCE_CSV_HEADERS.join(', ')}.`, ok: false };
  }

  const dataRows = result.data.slice(1);

  if (dataRows.length === 0) {
    return { error: 'CSV must include at least one balance row.', ok: false };
  }

  if (dataRows.length > BALANCE_CSV_MAX_ROWS) {
    return { error: `CSV files may contain at most ${BALANCE_CSV_MAX_ROWS} balance rows.`, ok: false };
  }

  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const rows: BalanceCsvRow[] = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const values = dataRows[index];

    if (values.length !== headers.length) {
      return { error: `CSV row ${index + 2} must contain exactly four values.`, ok: false };
    }

    rows.push({
      account: values[indexByHeader.get('account') ?? -1] ?? '',
      balance: values[indexByHeader.get('balance') ?? -1] ?? '',
      balanceDate: values[indexByHeader.get('balance_date') ?? -1] ?? '',
      currency: values[indexByHeader.get('currency') ?? -1] ?? '',
      rowNumber: index + 2
    });
  }

  return { ok: true, rows };
}

export function buildBalanceCsvTemplate(
  accounts: Array<{ currency: string; id: string; name: string }>,
  balanceDate = new Date().toISOString().slice(0, 10)
): string {
  const rows = accounts.length > 0
    ? accounts.map((account) => ({
        account: account.name,
        balance_date: balanceDate,
        balance: '',
        currency: account.currency.toUpperCase()
      }))
    : [{ account: '', balance_date: balanceDate, balance: '', currency: 'USD' }];

  return Papa.unparse(rows, {
    columns: [...BALANCE_CSV_HEADERS],
    escapeFormulae: true,
    header: true,
    newline: '\n'
  });
}
