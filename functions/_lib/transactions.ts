/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

export const transactionTypes = ['income', 'expense', 'transfer', 'adjustment'] as const;

type TransactionType = (typeof transactionTypes)[number];

export type Transaction = {
  account: {
    accountType: string;
    currency: string;
    id: string;
    name: string;
  } | null;
  accountId: string | null;
  amountCents: number;
  category: string | null;
  createdAt: string;
  description: string;
  id: string;
  notes: string | null;
  signedCashFlowCents: number;
  transactionDate: string;
  transactionType: TransactionType;
  updatedAt: string;
};

export type TransactionSummary = {
  adjustmentCents: number;
  expenseCents: number;
  incomeCents: number;
  latestTransactionDate: string | null;
  netCashFlowCents: number;
  transactionCount: number;
  transferCents: number;
};

export type TransactionCreatePayload = {
  accountId: string | null;
  amountCents: number;
  category: string | null;
  description: string;
  notes: string | null;
  transactionDate: string;
  transactionType: TransactionType;
};

export type TransactionUpdatePayload = Partial<TransactionCreatePayload>;

type TransactionRow = {
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
};

const maxMoneyCents = 99_999_999_999_999;

export async function listTransactions(database: D1Database, userId: string): Promise<Transaction[]> {
  await ensureUserProfile(database, userId);

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
        ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC
        LIMIT 100
      `
    )
    .bind(userId)
    .all<TransactionRow>();

  return result.results.map(toTransaction);
}

export async function readTransaction(
  database: D1Database,
  userId: string,
  transactionId: string
): Promise<Transaction | null> {
  await ensureUserProfile(database, userId);

  const row = await readTransactionRow(database, userId, transactionId);

  return row ? toTransaction(row) : null;
}

export async function createTransaction(
  database: D1Database,
  userId: string,
  payload: TransactionCreatePayload
): Promise<Transaction | null> {
  await ensureUserProfile(database, userId);

  if (payload.accountId && !(await accountBelongsToUser(database, userId, payload.accountId))) {
    return null;
  }

  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        INSERT INTO transactions (
          id,
          user_id,
          account_id,
          transaction_date,
          description,
          amount_cents,
          category,
          transaction_type,
          notes,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      transactionId,
      userId,
      payload.accountId,
      payload.transactionDate,
      payload.description,
      payload.amountCents,
      payload.category,
      payload.transactionType,
      payload.notes,
      now,
      now
    )
    .run();

  return readTransaction(database, userId, transactionId);
}

export async function updateTransaction(
  database: D1Database,
  userId: string,
  transactionId: string,
  payload: TransactionUpdatePayload
): Promise<Transaction | null> {
  await ensureUserProfile(database, userId);

  const existing = await readTransactionBaseRow(database, userId, transactionId);

  if (!existing) {
    return null;
  }

  const nextTransaction = {
    accountId: payload.accountId === undefined ? existing.account_id : payload.accountId,
    amountCents: payload.amountCents ?? existing.amount_cents,
    category: payload.category === undefined ? existing.category : payload.category,
    description: payload.description ?? existing.description,
    notes: payload.notes === undefined ? existing.notes : payload.notes,
    transactionDate: payload.transactionDate ?? existing.transaction_date,
    transactionType: payload.transactionType ?? existing.transaction_type
  };

  if (nextTransaction.accountId && !(await accountBelongsToUser(database, userId, nextTransaction.accountId))) {
    return null;
  }

  const now = new Date().toISOString();

  await database
    .prepare(
      `
        UPDATE transactions
        SET
          account_id = ?,
          transaction_date = ?,
          description = ?,
          amount_cents = ?,
          category = ?,
          transaction_type = ?,
          notes = ?,
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
      `
    )
    .bind(
      nextTransaction.accountId,
      nextTransaction.transactionDate,
      nextTransaction.description,
      nextTransaction.amountCents,
      nextTransaction.category,
      nextTransaction.transactionType,
      nextTransaction.notes,
      now,
      transactionId,
      userId
    )
    .run();

  return readTransaction(database, userId, transactionId);
}

export async function archiveTransaction(
  database: D1Database,
  userId: string,
  transactionId: string
): Promise<boolean> {
  await ensureUserProfile(database, userId);

  const result = await database
    .prepare(
      `
        DELETE FROM transactions
        WHERE id = ?
          AND user_id = ?
      `
    )
    .bind(transactionId, userId)
    .run();

  return result.meta.changes > 0;
}

export function summarizeTransactions(transactions: Transaction[]): TransactionSummary {
  return transactions.reduce<TransactionSummary>(
    (summary, transaction) => {
      const latestTransactionDate =
        summary.latestTransactionDate === null || transaction.transactionDate > summary.latestTransactionDate
          ? transaction.transactionDate
          : summary.latestTransactionDate;

      if (transaction.transactionType === 'income') {
        return {
          ...summary,
          incomeCents: summary.incomeCents + transaction.amountCents,
          latestTransactionDate,
          netCashFlowCents: summary.netCashFlowCents + transaction.amountCents,
          transactionCount: summary.transactionCount + 1
        };
      }

      if (transaction.transactionType === 'expense') {
        return {
          ...summary,
          expenseCents: summary.expenseCents + transaction.amountCents,
          latestTransactionDate,
          netCashFlowCents: summary.netCashFlowCents - transaction.amountCents,
          transactionCount: summary.transactionCount + 1
        };
      }

      if (transaction.transactionType === 'transfer') {
        return {
          ...summary,
          latestTransactionDate,
          transactionCount: summary.transactionCount + 1,
          transferCents: summary.transferCents + transaction.amountCents
        };
      }

      return {
        ...summary,
        adjustmentCents: summary.adjustmentCents + transaction.amountCents,
        latestTransactionDate,
        transactionCount: summary.transactionCount + 1
      };
    },
    {
      adjustmentCents: 0,
      expenseCents: 0,
      incomeCents: 0,
      latestTransactionDate: null,
      netCashFlowCents: 0,
      transactionCount: 0,
      transferCents: 0
    }
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseTransactionCreatePayload(value: unknown):
  | { ok: true; value: TransactionCreatePayload }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const parsed = parseTransactionFields(value, ['transactionDate', 'description', 'amountCents', 'transactionType']);

  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    value: {
      accountId: parsed.value.accountId ?? null,
      amountCents: parsed.value.amountCents as number,
      category: parsed.value.category ?? null,
      description: parsed.value.description as string,
      notes: parsed.value.notes ?? null,
      transactionDate: parsed.value.transactionDate as string,
      transactionType: parsed.value.transactionType as TransactionType
    }
  };
}

export function parseTransactionUpdatePayload(value: unknown):
  | { ok: true; value: TransactionUpdatePayload }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const parsed = parseTransactionFields(value, []);

  if (!parsed.ok) {
    return parsed;
  }

  if (Object.keys(parsed.value).length === 0) {
    return { error: 'At least one valid transaction field is required.', ok: false };
  }

  return { ok: true, value: parsed.value };
}

function parseTransactionFields(
  value: Record<string, unknown>,
  requiredFields: string[]
):
  | { ok: true; value: TransactionUpdatePayload }
  | { error: string; ok: false } {
  const payload: TransactionUpdatePayload = {};

  for (const field of requiredFields) {
    if (!(field in value)) {
      return { error: `${field} is required.`, ok: false };
    }
  }

  if ('accountId' in value) {
    const accountId = parseOptionalText(value.accountId, 120, 'accountId');

    if (!accountId.ok) {
      return accountId;
    }

    payload.accountId = accountId.value;
  }

  if ('transactionDate' in value) {
    const transactionDate = parseTransactionDate(value.transactionDate);

    if (!transactionDate.ok) {
      return transactionDate;
    }

    payload.transactionDate = transactionDate.value;
  }

  if ('description' in value) {
    const description = parseRequiredText(value.description, 160, 'description');

    if (!description.ok) {
      return description;
    }

    payload.description = description.value;
  }

  if ('amountCents' in value) {
    const amountCents = parseMoneyCents(value.amountCents);

    if (!amountCents.ok) {
      return amountCents;
    }

    payload.amountCents = amountCents.value;
  }

  if ('category' in value) {
    const category = parseOptionalText(value.category, 80, 'category');

    if (!category.ok) {
      return category;
    }

    payload.category = category.value;
  }

  if ('transactionType' in value) {
    const transactionType = parseTransactionType(value.transactionType);

    if (!transactionType.ok) {
      return transactionType;
    }

    payload.transactionType = transactionType.value;
  }

  if ('notes' in value) {
    const notes = parseOptionalText(value.notes, 500, 'notes');

    if (!notes.ok) {
      return notes;
    }

    payload.notes = notes.value;
  }

  return { ok: true, value: payload };
}

function readTransactionBaseRow(
  database: D1Database,
  userId: string,
  transactionId: string
): Promise<{
  account_id: string | null;
  amount_cents: number;
  category: string | null;
  description: string;
  notes: string | null;
  transaction_date: string;
  transaction_type: TransactionType;
} | null> {
  return database
    .prepare(
      `
        SELECT account_id, transaction_date, description, amount_cents, category, transaction_type, notes
        FROM transactions
        WHERE id = ?
          AND user_id = ?
      `
    )
    .bind(transactionId, userId)
    .first();
}

function readTransactionRow(
  database: D1Database,
  userId: string,
  transactionId: string
): Promise<TransactionRow | null> {
  return database
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
        WHERE t.id = ?
          AND t.user_id = ?
      `
    )
    .bind(transactionId, userId)
    .first<TransactionRow>();
}

async function accountBelongsToUser(
  database: D1Database,
  userId: string,
  accountId: string
): Promise<boolean> {
  const row = await database
    .prepare(
      `
        SELECT id
        FROM financial_accounts
        WHERE id = ?
          AND user_id = ?
          AND is_active = 1
          AND archived_at IS NULL
      `
    )
    .bind(accountId, userId)
    .first<{ id: string }>();

  return Boolean(row);
}

function toTransaction(row: TransactionRow): Transaction {
  return {
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
    signedCashFlowCents: signedCashFlowCents(row.transaction_type, row.amount_cents),
    transactionDate: row.transaction_date,
    transactionType: row.transaction_type,
    updatedAt: row.updated_at
  };
}

function signedCashFlowCents(transactionType: TransactionType, amountCents: number): number {
  if (transactionType === 'income') {
    return amountCents;
  }

  if (transactionType === 'expense') {
    return -amountCents;
  }

  return 0;
}

function parseTransactionType(value: unknown):
  | { ok: true; value: TransactionType }
  | { error: string; ok: false } {
  if (typeof value !== 'string' || !transactionTypes.includes(value as TransactionType)) {
    return { error: 'transactionType must be income, expense, transfer, or adjustment.', ok: false };
  }

  return { ok: true, value: value as TransactionType };
}

function parseMoneyCents(value: unknown):
  | { ok: true; value: number }
  | { error: string; ok: false } {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > maxMoneyCents) {
    return { error: 'amountCents must be a positive integer number of cents.', ok: false };
  }

  return { ok: true, value };
}

function parseTransactionDate(value: unknown):
  | { ok: true; value: string }
  | { error: string; ok: false } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'transactionDate must be an ISO date in YYYY-MM-DD format.', ok: false };
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: 'transactionDate must be a real calendar date.', ok: false };
  }

  return { ok: true, value };
}

function parseRequiredText(
  value: unknown,
  maxLength: number,
  fieldName: string
):
  | { ok: true; value: string }
  | { error: string; ok: false } {
  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string.`, ok: false };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { error: `${fieldName} is required.`, ok: false };
  }

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { ok: true, value: trimmed };
}

function parseOptionalText(
  value: unknown,
  maxLength: number,
  fieldName: string
):
  | { ok: true; value: string | null }
  | { error: string; ok: false } {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string or null.`, ok: false };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { ok: true, value: trimmed };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
