/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';
import { transactionTypes, type Transaction, type TransactionCreatePayload, summarizeTransactions } from './transactions';

export const TRANSACTION_IMPORT_MAX_ROWS = 500;
export const TRANSACTION_IMPORT_MAX_FILE_NAME_LENGTH = 160;

const maxMoneyCents = 99_999_999_999_999;
const insertChunkSize = 16;

type TransactionType = TransactionCreatePayload['transactionType'];

export type RawTransactionImportRow = {
  account: string;
  amount: string;
  category: string;
  description: string;
  notes: string;
  rowNumber: number;
  transactionDate: string;
  type: string;
};

export type TransactionImportPayload = {
  fileName: string;
  rows: RawTransactionImportRow[];
};

export type TransactionImportRowStatus = 'ready' | 'duplicate' | 'error';

export type TransactionImportPreviewRow = {
  accountId: string | null;
  accountName: string;
  amountCents: number | null;
  category: string | null;
  description: string;
  message: string;
  notes: string | null;
  rowNumber: number;
  status: TransactionImportRowStatus;
  transactionDate: string;
  transactionType: TransactionType | null;
};

export type TransactionImportSummary = {
  duplicateRows: number;
  errorRows: number;
  readyRows: number;
  totalRows: number;
};

export type TransactionImportPreview = {
  rows: TransactionImportPreviewRow[];
  summary: TransactionImportSummary;
};

export type TransactionImportRecord = {
  createdAt: string;
  duplicateRows: number;
  errorRows: number;
  fileName: string;
  id: string;
  importedRows: number;
  totalRows: number;
};

export type ImportAccount = {
  id: string;
  name: string;
};

type AccountRow = {
  id: string;
  name: string;
};

type ExistingTransactionRow = {
  account_id: string | null;
  amount_cents: number;
  category: string | null;
  description: string;
  notes: string | null;
  transaction_date: string;
  transaction_type: TransactionType;
};

type TransactionImportRecordRow = {
  created_at: string;
  duplicate_rows: number;
  error_rows: number;
  file_name: string;
  id: string;
  imported_rows: number;
  total_rows: number;
};

type ValidatedRow = {
  account: ImportAccount | null;
  amountCents: number;
  category: string | null;
  description: string;
  notes: string | null;
  rowNumber: number;
  transactionDate: string;
  transactionType: TransactionType;
};

export class DuplicateTransactionImportError extends Error {
  constructor() {
    super('This reviewed transaction import has already been committed.');
    this.name = 'DuplicateTransactionImportError';
  }
}

export function parseTransactionImportPayload(value: unknown):
  | { ok: true; value: TransactionImportPayload }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  if (typeof value.fileName !== 'string') {
    return { error: 'fileName must be a string.', ok: false };
  }

  const fileName = value.fileName.trim();

  if (!fileName || fileName.length > TRANSACTION_IMPORT_MAX_FILE_NAME_LENGTH) {
    return { error: `fileName must be between 1 and ${TRANSACTION_IMPORT_MAX_FILE_NAME_LENGTH} characters.`, ok: false };
  }

  if (!Array.isArray(value.rows) || value.rows.length === 0 || value.rows.length > TRANSACTION_IMPORT_MAX_ROWS) {
    return { error: `rows must contain between 1 and ${TRANSACTION_IMPORT_MAX_ROWS} entries.`, ok: false };
  }

  const rows: RawTransactionImportRow[] = [];
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

    const fields = ['account', 'amount', 'category', 'description', 'notes', 'transactionDate', 'type'] as const;

    for (const field of fields) {
      if (typeof row[field] !== 'string' || row[field].length > 500) {
        return { error: `${field} must be a string no longer than 500 characters.`, ok: false };
      }
    }

    rows.push({
      account: row.account as string,
      amount: row.amount as string,
      category: row.category as string,
      description: row.description as string,
      notes: row.notes as string,
      rowNumber: row.rowNumber as number,
      transactionDate: row.transactionDate as string,
      type: row.type as string
    });
  }

  return { ok: true, value: { fileName, rows } };
}

export async function previewTransactionImport(
  database: D1Database,
  userId: string,
  payload: TransactionImportPayload
): Promise<TransactionImportPreview> {
  await ensureUserProfile(database, userId);
  const accounts = await readImportAccounts(database, userId);
  const validDates = payload.rows.map((row) => normalizeDate(row.transactionDate)).filter((date): date is string => Boolean(date));
  const existing = validDates.length > 0
    ? await readExistingTransactions(database, userId, validDates.sort()[0], validDates.sort().at(-1) ?? validDates[0])
    : [];

  return validateTransactionImportRows(payload.rows, accounts, existing);
}

export function validateTransactionImportRows(
  rows: RawTransactionImportRow[],
  accounts: ImportAccount[],
  existingTransactions: ExistingTransactionRow[]
): TransactionImportPreview {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const accountsByName = new Map<string, ImportAccount[]>();

  for (const account of accounts) {
    const key = normalizeTextKey(account.name);
    accountsByName.set(key, [...(accountsByName.get(key) ?? []), account]);
  }

  const previewByRow = new Map<number, TransactionImportPreviewRow>();
  const validated: ValidatedRow[] = [];

  for (const row of rows) {
    const accountValue = row.account.trim();
    const accountMatches = accountValue ? accountsByName.get(normalizeTextKey(accountValue)) ?? [] : [];
    const account = accountValue ? accountById.get(accountValue) ?? (accountMatches.length === 1 ? accountMatches[0] : null) : null;
    const amountCents = parseDecimalCents(row.amount);
    const category = optionalText(row.category, 80);
    const description = requiredText(row.description, 160);
    const notes = optionalText(row.notes, 500);
    const transactionDate = normalizeDate(row.transactionDate);
    const transactionType = parseTransactionType(row.type);

    if (accountValue && !account && accountMatches.length > 1) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Account name is ambiguous; use the account ID.'));
    } else if (accountValue && !account) {
      previewByRow.set(row.rowNumber, errorRow(row, 'No active account matches this value.'));
    } else if (!transactionDate) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Transaction date must use YYYY-MM-DD.'));
    } else if (!description) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Description is required.'));
    } else if (amountCents === null) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Amount must be a positive amount with at most two decimals.'));
    } else if (!transactionType) {
      previewByRow.set(row.rowNumber, errorRow(row, 'Type must be income, expense, transfer, or adjustment.'));
    } else {
      validated.push({
        account,
        amountCents,
        category,
        description,
        notes,
        rowNumber: row.rowNumber,
        transactionDate,
        transactionType
      });
    }
  }

  const seenInFile = new Set<string>();
  const existingKeys = new Set(existingTransactions.map(canonicalExistingTransaction));

  for (const row of validated) {
    const key = canonicalValidatedTransaction(row);

    if (seenInFile.has(key)) {
      previewByRow.set(row.rowNumber, previewRow(row, 'duplicate', 'Repeated row in this file.'));
    } else if (existingKeys.has(key)) {
      previewByRow.set(row.rowNumber, previewRow(row, 'duplicate', 'This transaction already exists.'));
      seenInFile.add(key);
    } else {
      previewByRow.set(row.rowNumber, previewRow(row, 'ready', 'Ready to import.'));
      seenInFile.add(key);
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

export async function commitTransactionImport(
  database: D1Database,
  userId: string,
  payload: TransactionImportPayload
): Promise<{ importRecord: TransactionImportRecord; preview: TransactionImportPreview; summary: ReturnType<typeof summarizeTransactions>; transactions: Transaction[] }> {
  const preview = await previewTransactionImport(database, userId, payload);
  const readyRows = preview.rows.filter(
    (row): row is TransactionImportPreviewRow & { amountCents: number; transactionType: TransactionType } =>
      row.status === 'ready' && row.amountCents !== null && row.transactionType !== null
  );

  if (readyRows.length === 0) {
    throw new Error('No reviewed rows are ready to import.');
  }

  const sourceHash = await hashReadyRows(readyRows);
  const existingImport = await database
    .prepare('SELECT id FROM transaction_imports WHERE user_id = ? AND source_hash = ?')
    .bind(userId, sourceHash)
    .first<{ id: string }>();

  if (existingImport) {
    throw new DuplicateTransactionImportError();
  }

  const importId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    database
      .prepare(
        `
          INSERT INTO transaction_imports (
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
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = chunk.flatMap((row) => [
      crypto.randomUUID(),
      userId,
      row.accountId,
      row.transactionDate,
      row.description,
      row.amountCents,
      row.category,
      row.transactionType,
      row.notes,
      now,
      now
    ]);

    statements.push(
      database
        .prepare(
          `
            INSERT INTO transactions (
              id, user_id, account_id, transaction_date, description,
              amount_cents, category, transaction_type, notes, created_at, updated_at
            ) VALUES ${placeholders}
          `
        )
        .bind(...values)
    );
  }

  try {
    await database.batch(statements);
  } catch (error) {
    if (error instanceof Error && /transaction_imports\.user_id, transaction_imports\.source_hash/i.test(error.message)) {
      throw new DuplicateTransactionImportError();
    }
    throw error;
  }

  const transactions = await listImportedTransactions(database, userId, readyRows);

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
    preview,
    summary: summarizeTransactions(transactions),
    transactions
  };
}

export async function listTransactionImports(
  database: D1Database,
  userId: string
): Promise<TransactionImportRecord[]> {
  await ensureUserProfile(database, userId);
  const result = await database
    .prepare(
      `
        SELECT id, file_name, total_rows, imported_rows, duplicate_rows, error_rows, created_at
        FROM transaction_imports
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 12
      `
    )
    .bind(userId)
    .all<TransactionImportRecordRow>();

  return result.results.map(toTransactionImportRecord);
}

async function readImportAccounts(database: D1Database, userId: string): Promise<ImportAccount[]> {
  const result = await database
    .prepare(
      `
        SELECT id, name
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

async function readExistingTransactions(
  database: D1Database,
  userId: string,
  firstDate: string,
  lastDate: string
): Promise<ExistingTransactionRow[]> {
  const result = await database
    .prepare(
      `
        SELECT account_id, transaction_date, description, amount_cents, category, transaction_type, notes
        FROM transactions
        WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
      `
    )
    .bind(userId, firstDate, lastDate)
    .all<ExistingTransactionRow>();

  return result.results;
}

async function listImportedTransactions(
  database: D1Database,
  userId: string,
  readyRows: Array<TransactionImportPreviewRow & { amountCents: number; transactionType: TransactionType }>
): Promise<Transaction[]> {
  const dateValues = [...new Set(readyRows.map((row) => row.transactionDate))].sort();
  const firstDate = dateValues[0];
  const lastDate = dateValues.at(-1) ?? firstDate;

  if (!firstDate) {
    return [];
  }

  const result = await database
    .prepare(
      `
        SELECT
          t.id,
          t.account_id,
          a.name AS account_name,
          a.account_type,
          a.currency AS account_currency,
          t.transaction_date,
          t.description,
          t.amount_cents,
          t.category,
          t.transaction_type,
          t.notes,
          t.created_at,
          t.updated_at
        FROM transactions t
        LEFT JOIN financial_accounts a
          ON a.id = t.account_id
          AND a.user_id = t.user_id
        WHERE t.user_id = ?
          AND t.transaction_date BETWEEN ? AND ?
        ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC
        LIMIT 100
      `
    )
    .bind(userId, firstDate, lastDate)
    .all<{
      account_currency: string | null;
      account_id: string | null;
      account_name: string | null;
      account_type: string | null;
      amount_cents: number;
      category: string | null;
      created_at: string;
      description: string;
      id: string;
      notes: string | null;
      transaction_date: string;
      transaction_type: TransactionType;
      updated_at: string;
    }>();

  return result.results.map((row) => ({
    account:
      row.account_id && row.account_name && row.account_type && row.account_currency
        ? {
            accountType: row.account_type,
            currency: row.account_currency,
            id: row.account_id,
            name: row.account_name
          }
        : null,
    accountId: row.account_id,
    amountCents: row.amount_cents,
    category: row.category,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    notes: row.notes,
    signedCashFlowCents: row.transaction_type === 'income' ? row.amount_cents : row.transaction_type === 'expense' ? -row.amount_cents : 0,
    transactionDate: row.transaction_date,
    transactionType: row.transaction_type,
    updatedAt: row.updated_at
  }));
}

function previewRow(
  row: ValidatedRow,
  status: TransactionImportRowStatus,
  message: string
): TransactionImportPreviewRow {
  return {
    accountId: row.account?.id ?? null,
    accountName: row.account?.name ?? 'No account link',
    amountCents: row.amountCents,
    category: row.category,
    description: row.description,
    message,
    notes: row.notes,
    rowNumber: row.rowNumber,
    status,
    transactionDate: row.transactionDate,
    transactionType: row.transactionType
  };
}

function errorRow(row: RawTransactionImportRow, message: string): TransactionImportPreviewRow {
  return {
    accountId: null,
    accountName: row.account.trim() || 'No account link',
    amountCents: null,
    category: optionalText(row.category, 80),
    description: row.description.trim(),
    message,
    notes: optionalText(row.notes, 500),
    rowNumber: row.rowNumber,
    status: 'error',
    transactionDate: row.transactionDate.trim(),
    transactionType: parseTransactionType(row.type)
  };
}

function summarizePreviewRows(rows: TransactionImportPreviewRow[]): TransactionImportSummary {
  return {
    duplicateRows: rows.filter((row) => row.status === 'duplicate').length,
    errorRows: rows.filter((row) => row.status === 'error').length,
    readyRows: rows.filter((row) => row.status === 'ready').length,
    totalRows: rows.length
  };
}

function canonicalValidatedTransaction(row: ValidatedRow): string {
  return [
    row.account?.id ?? '',
    row.transactionDate,
    normalizeTextKey(row.description),
    row.amountCents,
    row.category ? normalizeTextKey(row.category) : '',
    row.transactionType,
    row.notes ? normalizeTextKey(row.notes) : ''
  ].join('|');
}

function canonicalExistingTransaction(row: ExistingTransactionRow): string {
  return [
    row.account_id ?? '',
    row.transaction_date,
    normalizeTextKey(row.description),
    row.amount_cents,
    row.category ? normalizeTextKey(row.category) : '',
    row.transaction_type,
    row.notes ? normalizeTextKey(row.notes) : ''
  ].join('|');
}

async function hashReadyRows(
  rows: Array<TransactionImportPreviewRow & { amountCents: number; transactionType: TransactionType }>
): Promise<string> {
  const canonical = rows
    .map((row) => [
      row.accountId ?? '',
      row.transactionDate,
      normalizeTextKey(row.description),
      row.amountCents,
      row.category ? normalizeTextKey(row.category) : '',
      row.transactionType,
      row.notes ? normalizeTextKey(row.notes) : ''
    ].join('|'))
    .sort()
    .join('\n');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseDecimalCents(value: string): number | null {
  const normalized = value.trim();

  if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, decimalPart = ''] = normalized.replaceAll(',', '').split('.');
  const cents = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0'));

  return Number.isSafeInteger(cents) && cents > 0 && cents <= maxMoneyCents ? cents : null;
}

function normalizeDate(value: string): string | null {
  const date = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

function parseTransactionType(value: string): TransactionType | null {
  const normalized = value.trim().toLowerCase();
  return transactionTypes.includes(normalized as TransactionType) ? normalized as TransactionType : null;
}

function requiredText(value: string, maxLength: number): string | null {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function optionalText(value: string, maxLength: number): string | null {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function normalizeTextKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toTransactionImportRecord(row: TransactionImportRecordRow): TransactionImportRecord {
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
