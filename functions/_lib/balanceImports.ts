/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

export const BALANCE_IMPORT_MAX_ROWS = 500;
export const BALANCE_IMPORT_MAX_FILE_NAME_LENGTH = 160;

const maxMoneyCents = 999_999_999_999_99;
const insertChunkSize = 16;

export type RawBalanceImportRow = {
  account: string;
  balance: string;
  balanceDate: string;
  currency: string;
  rowNumber: number;
};

export type BalanceImportPayload = {
  fileName: string;
  rows: RawBalanceImportRow[];
};

export type BalanceImportRowStatus = 'ready' | 'duplicate' | 'error';

export type BalanceImportPreviewRow = {
  accountId: string | null;
  accountName: string;
  balanceCents: number | null;
  balanceDate: string;
  currency: string;
  message: string;
  rowNumber: number;
  status: BalanceImportRowStatus;
};

export type BalanceImportSummary = {
  duplicateRows: number;
  errorRows: number;
  readyRows: number;
  totalRows: number;
};

export type BalanceImportPreview = {
  rows: BalanceImportPreviewRow[];
  summary: BalanceImportSummary;
};

export type BalanceImportRecord = {
  createdAt: string;
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  id: string;
  importedRows: number;
  totalRows: number;
};

export type ImportAccount = {
  currency: string;
  id: string;
  name: string;
};

export type ExistingBalanceSnapshot = {
  accountId: string;
  balanceCents: number;
  balanceDate: string;
};

type AccountRow = {
  currency: string;
  id: string;
  name: string;
};

type ExistingBalanceRow = {
  account_id: string;
  balance_cents: number;
  balance_date: string;
};

type BalanceImportRecordRow = {
  created_at: string;
  duplicate_rows: number;
  error_rows: number;
  file_name: string;
  id: string;
  imported_rows: number;
  total_rows: number;
};

type ValidatedRow = {
  account: ImportAccount;
  balanceCents: number;
  balanceDate: string;
  currency: string;
  rowNumber: number;
};

export class DuplicateBalanceImportError extends Error {
  constructor() {
    super('This reviewed import has already been committed.');
    this.name = 'DuplicateBalanceImportError';
  }
}

export function parseBalanceImportPayload(value: unknown):
  | { ok: true; value: BalanceImportPayload }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  if (typeof value.fileName !== 'string') {
    return { error: 'fileName must be a string.', ok: false };
  }

  const fileName = value.fileName.trim();

  if (!fileName || fileName.length > BALANCE_IMPORT_MAX_FILE_NAME_LENGTH) {
    return { error: `fileName must be between 1 and ${BALANCE_IMPORT_MAX_FILE_NAME_LENGTH} characters.`, ok: false };
  }

  if (!Array.isArray(value.rows) || value.rows.length === 0 || value.rows.length > BALANCE_IMPORT_MAX_ROWS) {
    return { error: `rows must contain between 1 and ${BALANCE_IMPORT_MAX_ROWS} entries.`, ok: false };
  }

  const rows: RawBalanceImportRow[] = [];
  const rowNumbers = new Set<number>();

  for (const row of value.rows) {
    if (!isRecord(row)) {
      return { error: 'Each import row must be an object.', ok: false };
    }

    if (!Number.isSafeInteger(row.rowNumber) || (row.rowNumber as number) < 2) {
      return { error: 'Each rowNumber must be an integer greater than or equal to 2.', ok: false };
    }

    if (rowNumbers.has(row.rowNumber as number)) {
      return { error: 'Each rowNumber must be unique.', ok: false };
    }

    rowNumbers.add(row.rowNumber as number);

    const fields = ['account', 'balanceDate', 'balance', 'currency'] as const;

    for (const field of fields) {
      if (typeof row[field] !== 'string' || row[field].length > 180) {
        return { error: `${field} must be a string no longer than 180 characters.`, ok: false };
      }
    }

    rows.push({
      account: row.account as string,
      balance: row.balance as string,
      balanceDate: row.balanceDate as string,
      currency: row.currency as string,
      rowNumber: row.rowNumber as number
    });
  }

  return { ok: true, value: { fileName, rows } };
}

export async function previewBalanceImport(
  database: D1Database,
  userId: string,
  payload: BalanceImportPayload
): Promise<BalanceImportPreview> {
  await ensureUserProfile(database, userId);
  const accounts = await readImportAccounts(database, userId);
  const validDates = payload.rows.map((row) => normalizeDate(row.balanceDate)).filter((date): date is string => Boolean(date));
  const existing = validDates.length > 0
    ? await readExistingBalances(database, userId, validDates.sort()[0], validDates.sort().at(-1) ?? validDates[0])
    : [];

  return validateBalanceImportRows(payload.rows, accounts, existing);
}

export function validateBalanceImportRows(
  rows: RawBalanceImportRow[],
  accounts: ImportAccount[],
  existingBalances: ExistingBalanceSnapshot[]
): BalanceImportPreview {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const accountsByName = new Map<string, ImportAccount[]>();

  for (const account of accounts) {
    const key = account.name.trim().toLocaleLowerCase();
    accountsByName.set(key, [...(accountsByName.get(key) ?? []), account]);
  }

  const previewByRow = new Map<number, BalanceImportPreviewRow>();
  const validated: ValidatedRow[] = [];

  for (const row of rows) {
    const accountValue = row.account.trim();
    const accountMatches = accountsByName.get(accountValue.toLocaleLowerCase()) ?? [];
    const account = accountById.get(accountValue) ?? (accountMatches.length === 1 ? accountMatches[0] : null);
    const balanceDate = normalizeDate(row.balanceDate);
    const balanceCents = parseDecimalCents(row.balance);
    const currency = row.currency.trim().toUpperCase();

    if (!accountValue) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Account is required.'));
    } else if (!account && accountMatches.length > 1) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Account name is ambiguous; use the account ID.'));
    } else if (!account) {
      previewByRow.set(row.rowNumber, errorRow(row, 'No active account matches this value.'));
    } else if (!balanceDate) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Balance date must use YYYY-MM-DD.'));
    } else if (balanceCents === null) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Balance must be a non-negative amount with at most two decimals.'));
    } else if (!/^[A-Z]{3}$/.test(currency)) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Currency must be a three-letter code.'));
    } else if (currency !== account.currency.toUpperCase()) {
      previewByRow.set(row.rowNumber, errorRow(row, `Currency must match ${account.currency.toUpperCase()} for ${account.name}.`));
    } else {
      validated.push({ account, balanceCents, balanceDate, currency, rowNumber: row.rowNumber });
    }
  }

  const grouped = new Map<string, ValidatedRow[]>();

  for (const row of validated) {
    const key = `${row.account.id}|${row.balanceDate}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  const existingByDate = new Map<string, ExistingBalanceSnapshot[]>();
  for (const existing of existingBalances) {
    const key = `${existing.accountId}|${existing.balanceDate}`;
    existingByDate.set(key, [...(existingByDate.get(key) ?? []), existing]);
  }

  for (const [key, group] of grouped) {
    const distinctAmounts = new Set(group.map((row) => row.balanceCents));

    if (distinctAmounts.size > 1) {
      for (const row of group) {
        previewByRow.set(row.rowNumber, previewRow(row, 'error', 'Multiple balances in this file use the same account and date.'));
      }
      continue;
    }

    const existing = existingByDate.get(key) ?? [];
    const first = group[0];

    if (existing.some((item) => item.balanceCents === first.balanceCents)) {
      previewByRow.set(first.rowNumber, previewRow(first, 'duplicate', 'This balance snapshot already exists.'));
    } else if (existing.length > 0) {
      previewByRow.set(first.rowNumber, previewRow(first, 'error', 'A different balance already exists for this account and date.'));
    } else {
      previewByRow.set(first.rowNumber, previewRow(first, 'ready', 'Ready to import.'));
    }

    for (const repeated of group.slice(1)) {
      previewByRow.set(repeated.rowNumber, previewRow(repeated, 'duplicate', 'Repeated row in this file.'));
    }
  }

  const previewRows = rows
    .map((row) => previewByRow.get(row.rowNumber) ?? errorRow(row, 'Row could not be validated.'))
    .sort((left, right) => left.rowNumber - right.rowNumber);

  return {
    rows: previewRows,
    summary: summarizePreviewRows(previewRows)
  };
}

export async function commitBalanceImport(
  database: D1Database,
  userId: string,
  payload: BalanceImportPayload
): Promise<{ importRecord: BalanceImportRecord; preview: BalanceImportPreview }> {
  const preview = await previewBalanceImport(database, userId, payload);
  const readyRows = preview.rows.filter(
    (row): row is BalanceImportPreviewRow & { accountId: string; balanceCents: number } =>
      row.status === 'ready' && row.accountId !== null && row.balanceCents !== null
  );

  if (readyRows.length === 0) {
    throw new Error('No reviewed rows are ready to import.');
  }

  const sourceHash = await hashReadyRows(readyRows);
  const existingImport = await database
    .prepare('SELECT id FROM balance_imports WHERE user_id = ? AND source_hash = ?')
    .bind(userId, sourceHash)
    .first<{ id: string }>();

  if (existingImport) {
    throw new DuplicateBalanceImportError();
  }

  const importId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `
          INSERT INTO balance_imports (
            id, user_id, file_name, source_hash, total_rows,
            imported_rows, duplicate_rows, error_rows, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        importId,
        userId,
        payload.fileName,
        sourceHash,
        preview.summary.totalRows,
        readyRows.length,
        preview.summary.duplicateRows,
        preview.summary.errorRows,
        now
      )
  ];

  for (let index = 0; index < readyRows.length; index += insertChunkSize) {
    const chunk = readyRows.slice(index, index + insertChunkSize);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = chunk.flatMap((row) => [
      crypto.randomUUID(),
      row.accountId,
      userId,
      row.balanceDate,
      row.balanceCents,
      now
    ]);

    statements.push(
      database
        .prepare(
          `
            INSERT INTO account_balances (
              id, account_id, user_id, balance_date, balance_cents, created_at
            ) VALUES ${placeholders}
          `
        )
        .bind(...values)
    );
  }

  try {
    await database.batch(statements);
  } catch (error) {
    if (error instanceof Error && /balance_imports\.user_id, balance_imports\.source_hash/i.test(error.message)) {
      throw new DuplicateBalanceImportError();
    }
    throw error;
  }

  return {
    importRecord: {
      createdAt: now,
      duplicateRows: preview.summary.duplicateRows,
      errorRows: preview.summary.errorRows,
      fileName: payload.fileName,
      id: importId,
      importedRows: readyRows.length,
      totalRows: preview.summary.totalRows
    },
    preview
  };
}

export async function listBalanceImports(
  database: D1Database,
  userId: string
): Promise<BalanceImportRecord[]> {
  await ensureUserProfile(database, userId);
  const result = await database
    .prepare(
      `
        SELECT id, file_name, total_rows, imported_rows, duplicate_rows, error_rows, created_at
        FROM balance_imports
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 12
      `
    )
    .bind(userId)
    .all<BalanceImportRecordRow>();

  return result.results.map(toBalanceImportRecord);
}

async function readImportAccounts(database: D1Database, userId: string): Promise<ImportAccount[]> {
  const result = await database
    .prepare(
      `
        SELECT id, name, currency
        FROM financial_accounts
        WHERE user_id = ? AND is_active = 1 AND archived_at IS NULL
        ORDER BY name ASC
        LIMIT 100
      `
    )
    .bind(userId)
    .all<AccountRow>();

  return result.results;
}

async function readExistingBalances(
  database: D1Database,
  userId: string,
  firstDate: string,
  lastDate: string
): Promise<ExistingBalanceSnapshot[]> {
  const result = await database
    .prepare(
      `
        SELECT account_id, balance_date, balance_cents
        FROM account_balances
        WHERE user_id = ? AND balance_date BETWEEN ? AND ?
      `
    )
    .bind(userId, firstDate, lastDate)
    .all<ExistingBalanceRow>();

  return result.results.map((row) => ({
    accountId: row.account_id,
    balanceCents: row.balance_cents,
    balanceDate: row.balance_date
  }));
}

function previewRow(
  row: ValidatedRow,
  status: BalanceImportRowStatus,
  message: string
): BalanceImportPreviewRow {
  return {
    accountId: row.account.id,
    accountName: row.account.name,
    balanceCents: row.balanceCents,
    balanceDate: row.balanceDate,
    currency: row.currency,
    message,
    rowNumber: row.rowNumber,
    status
  };
}

function errorRow(row: RawBalanceImportRow, message: string): BalanceImportPreviewRow {
  return {
    accountId: null,
    accountName: row.account.trim() || 'Unknown account',
    balanceCents: null,
    balanceDate: row.balanceDate.trim(),
    currency: row.currency.trim().toUpperCase(),
    message,
    rowNumber: row.rowNumber,
    status: 'error'
  };
}

function summarizePreviewRows(rows: BalanceImportPreviewRow[]): BalanceImportSummary {
  return {
    duplicateRows: rows.filter((row) => row.status === 'duplicate').length,
    errorRows: rows.filter((row) => row.status === 'error').length,
    readyRows: rows.filter((row) => row.status === 'ready').length,
    totalRows: rows.length
  };
}

function parseDecimalCents(value: string): number | null {
  const normalized = value.trim();

  if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ''] = normalized.replaceAll(',', '').split('.');
  const cents = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0'));

  return Number.isSafeInteger(cents) && cents <= maxMoneyCents ? cents : null;
}

function normalizeDate(value: string): string | null {
  const date = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

async function hashReadyRows(
  rows: Array<BalanceImportPreviewRow & { accountId: string; balanceCents: number }>
): Promise<string> {
  const canonical = rows
    .map((row) => `${row.accountId}|${row.balanceDate}|${row.balanceCents}|${row.currency}`)
    .sort()
    .join('\n');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBalanceImportRecord(row: BalanceImportRecordRow): BalanceImportRecord {
  return {
    createdAt: row.created_at,
    duplicateRows: row.duplicate_rows,
    errorRows: row.error_rows,
    fileName: row.file_name,
    id: row.id,
    importedRows: row.imported_rows,
    totalRows: row.total_rows
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
