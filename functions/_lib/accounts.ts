/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

export const accountTypes = [
  'cash',
  'checking',
  'savings',
  'investment',
  'retirement',
  'credit',
  'loan',
  'mortgage',
  'real_estate',
  'other_asset',
  'other_liability'
] as const;

type AccountType = (typeof accountTypes)[number];
type AccountCategory = 'asset' | 'liability';

export type AccountBalance = {
  balanceCents: number;
  balanceDate: string;
  createdAt: string;
  id: string;
};

export type FinancialAccount = {
  accountType: AccountType;
  archivedAt?: string | null;
  balanceHistory: AccountBalance[];
  category: AccountCategory;
  createdAt: string;
  currency: string;
  id: string;
  institutionName: string | null;
  isActive: boolean;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
  updatedAt: string;
};

export type CurrencyAccountSummary = {
  accountCount: number;
  assetsCents: number;
  currency: string;
  liabilityAccountCount: number;
  liabilitiesCents: number;
  netWorthCents: number;
};

export type AccountSummary = {
  accountCount: number;
  assetsCents: number | null;
  byCurrency: Record<string, CurrencyAccountSummary>;
  currencies: string[];
  hasMixedCurrencies: boolean;
  liabilityAccountCount: number;
  liabilitiesCents: number | null;
  netWorthCents: number | null;
  primaryCurrency: string | null;
};

export type AccountCreatePayload = {
  accountType: AccountType;
  balanceCents?: number;
  balanceDate?: string;
  currency: string;
  institutionName: string | null;
  name: string;
};

export type AccountUpdatePayload = {
  accountType?: AccountType;
  currency?: string;
  institutionName?: string | null;
  name?: string;
};

export type BalanceCreatePayload = {
  balanceCents: number;
  balanceDate: string;
};

type AccountRow = {
  account_type: AccountType;
  archived_at: string | null;
  created_at: string;
  currency: string;
  id: string;
  institution_name: string | null;
  is_active: number;
  name: string;
  updated_at: string;
};

type BalanceRow = {
  account_id: string;
  balance_cents: number;
  balance_date: string;
  created_at: string;
  id: string;
};

const liabilityTypes = new Set<AccountType>(['credit', 'loan', 'mortgage', 'other_liability']);
const maxMoneyCents = 999_999_999_999_99;

export async function listAccounts(database: D1Database, userId: string): Promise<FinancialAccount[]> {
  await ensureUserProfile(database, userId);

  const accountRows = await database
    .prepare(
      `
        SELECT
          id,
          user_id,
          name,
          account_type,
          institution_name,
          currency,
          is_active,
          created_at,
          updated_at,
          archived_at
        FROM financial_accounts
        WHERE user_id = ?
          AND is_active = 1
          AND archived_at IS NULL
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 100
      `
    )
    .bind(userId)
    .all<AccountRow>();

  const balanceRows = await database
    .prepare(
      `
        SELECT
          id,
          account_id,
          balance_cents,
          balance_date,
          created_at
        FROM account_balances
        WHERE user_id = ?
        ORDER BY balance_date DESC, created_at DESC
        LIMIT 500
      `
    )
    .bind(userId)
    .all<BalanceRow>();

  const balancesByAccount = groupRecentBalances(balanceRows.results, 5);

  return accountRows.results.map((account) => toFinancialAccount(account, balancesByAccount.get(account.id) ?? []));
}

export async function readAccount(
  database: D1Database,
  userId: string,
  accountId: string
): Promise<FinancialAccount | null> {
  await ensureUserProfile(database, userId);

  const account = await readAccountRow(database, userId, accountId);

  if (!account) {
    return null;
  }

  const balances = await readBalanceRows(database, userId, accountId, 20);

  return toFinancialAccount(account, balances.map(toAccountBalance));
}

export async function createAccount(
  database: D1Database,
  userId: string,
  payload: AccountCreatePayload
): Promise<FinancialAccount> {
  await ensureUserProfile(database, userId);

  const accountId = crypto.randomUUID();
  const balanceId = crypto.randomUUID();
  const now = new Date().toISOString();
  const statements = [
    database
      .prepare(
        `
          INSERT INTO financial_accounts (
            id,
            user_id,
            name,
            account_type,
            institution_name,
            currency,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `
      )
      .bind(
        accountId,
        userId,
        payload.name,
        payload.accountType,
        payload.institutionName,
        payload.currency,
        now,
        now
      )
  ];

  if (payload.balanceCents !== undefined) {
    statements.push(
      database
        .prepare(
          `
            INSERT INTO account_balances (id, account_id, user_id, balance_date, balance_cents, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `
        )
        .bind(balanceId, accountId, userId, payload.balanceDate ?? todayDate(), payload.balanceCents, now)
    );
  }

  await database.batch(statements);

  const account = await readAccount(database, userId, accountId);

  if (!account) {
    throw new Error('Failed to create account.');
  }

  return account;
}

export async function updateAccount(
  database: D1Database,
  userId: string,
  accountId: string,
  payload: AccountUpdatePayload
): Promise<FinancialAccount | null> {
  await ensureUserProfile(database, userId);

  const existing = await readAccountRow(database, userId, accountId);

  if (!existing) {
    return null;
  }

  const nextAccount = {
    accountType: payload.accountType ?? existing.account_type,
    currency: payload.currency ?? existing.currency,
    institutionName: payload.institutionName === undefined ? existing.institution_name : payload.institutionName,
    name: payload.name ?? existing.name
  };
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        UPDATE financial_accounts
        SET
          name = ?,
          account_type = ?,
          institution_name = ?,
          currency = ?,
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND is_active = 1
          AND archived_at IS NULL
      `
    )
    .bind(
      nextAccount.name,
      nextAccount.accountType,
      nextAccount.institutionName,
      nextAccount.currency,
      now,
      accountId,
      userId
    )
    .run();

  return readAccount(database, userId, accountId);
}

export async function archiveAccount(database: D1Database, userId: string, accountId: string): Promise<boolean> {
  await ensureUserProfile(database, userId);

  const now = new Date().toISOString();
  const result = await database
    .prepare(
      `
        UPDATE financial_accounts
        SET is_active = 0, archived_at = ?, updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND is_active = 1
          AND archived_at IS NULL
      `
    )
    .bind(now, now, accountId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function listAccountBalances(
  database: D1Database,
  userId: string,
  accountId: string
): Promise<AccountBalance[] | null> {
  await ensureUserProfile(database, userId);

  const account = await readAccountRow(database, userId, accountId);

  if (!account) {
    return null;
  }

  return (await readBalanceRows(database, userId, accountId, 50)).map(toAccountBalance);
}

export async function addAccountBalance(
  database: D1Database,
  userId: string,
  accountId: string,
  payload: BalanceCreatePayload
): Promise<FinancialAccount | null> {
  await ensureUserProfile(database, userId);

  const account = await readAccountRow(database, userId, accountId);

  if (!account) {
    return null;
  }

  const now = new Date().toISOString();

  await database.batch([
    database
      .prepare(
        `
          INSERT INTO account_balances (id, account_id, user_id, balance_date, balance_cents, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(crypto.randomUUID(), accountId, userId, payload.balanceDate, payload.balanceCents, now),
    database
      .prepare(
        `
          UPDATE financial_accounts
          SET updated_at = ?
          WHERE id = ? AND user_id = ?
        `
      )
      .bind(now, accountId, userId)
  ]);

  return readAccount(database, userId, accountId);
}

export function summarizeAccounts(accounts: FinancialAccount[]): AccountSummary {
  const activeAccounts = accounts.filter(
    (account) => account.isActive !== false && !(account as { archivedAt?: string | null }).archivedAt
  );

  if (activeAccounts.length === 0) {
    return {
      accountCount: 0,
      assetsCents: 0,
      byCurrency: {},
      currencies: [],
      hasMixedCurrencies: false,
      liabilityAccountCount: 0,
      liabilitiesCents: 0,
      netWorthCents: 0,
      primaryCurrency: null
    };
  }

  const byCurrency: Record<string, CurrencyAccountSummary> = {};

  for (const account of activeAccounts) {
    const currency = (account.currency || 'USD').trim().toUpperCase();
    if (!byCurrency[currency]) {
      byCurrency[currency] = {
        accountCount: 0,
        assetsCents: 0,
        currency,
        liabilityAccountCount: 0,
        liabilitiesCents: 0,
        netWorthCents: 0
      };
    }

    const cur = byCurrency[currency];
    cur.accountCount += 1;

    if (account.category === 'liability') {
      cur.liabilityAccountCount += 1;
      cur.liabilitiesCents += account.latestBalanceCents;
    } else {
      cur.assetsCents += account.latestBalanceCents;
    }

    cur.netWorthCents = cur.assetsCents - cur.liabilitiesCents;
  }

  const currencies = Object.keys(byCurrency).sort();
  const totalLiabilityAccounts = Object.values(byCurrency).reduce(
    (sum, cur) => sum + cur.liabilityAccountCount,
    0
  );

  if (currencies.length === 1) {
    const primaryCurrency = currencies[0];
    const single = byCurrency[primaryCurrency];

    return {
      accountCount: activeAccounts.length,
      assetsCents: single.assetsCents,
      byCurrency,
      currencies,
      hasMixedCurrencies: false,
      liabilityAccountCount: totalLiabilityAccounts,
      liabilitiesCents: single.liabilitiesCents,
      netWorthCents: single.netWorthCents,
      primaryCurrency
    };
  }

  return {
    accountCount: activeAccounts.length,
    assetsCents: null,
    byCurrency,
    currencies,
    hasMixedCurrencies: true,
    liabilityAccountCount: totalLiabilityAccounts,
    liabilitiesCents: null,
    netWorthCents: null,
    primaryCurrency: null
  };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseAccountCreatePayload(value: unknown):
  | {
      ok: true;
      value: AccountCreatePayload;
    }
  | {
      error: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const name = parseAccountName(value.name);

  if (!name.ok) {
    return name;
  }

  const accountType = parseAccountType(value.accountType);

  if (!accountType.ok) {
    return accountType;
  }

  const institutionName = parseOptionalText(value.institutionName, 120, 'institutionName');

  if (!institutionName.ok) {
    return institutionName;
  }

  const currency = parseCurrency(value.currency);

  if (!currency.ok) {
    return currency;
  }

  const payload: AccountCreatePayload = {
    accountType: accountType.value,
    currency: currency.value,
    institutionName: institutionName.value,
    name: name.value
  };

  if ('balanceCents' in value || 'balanceDate' in value) {
    const balanceCents = parseMoneyCents(value.balanceCents, 'balanceCents');

    if (!balanceCents.ok) {
      return balanceCents;
    }

    const balanceDate = parseBalanceDate(value.balanceDate);

    if (!balanceDate.ok) {
      return balanceDate;
    }

    payload.balanceCents = balanceCents.value;
    payload.balanceDate = balanceDate.value;
  }

  return { ok: true, value: payload };
}

export function parseAccountUpdatePayload(value: unknown):
  | {
      ok: true;
      value: AccountUpdatePayload;
    }
  | {
      error: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const payload: AccountUpdatePayload = {};

  if ('name' in value) {
    const name = parseAccountName(value.name);

    if (!name.ok) {
      return name;
    }

    payload.name = name.value;
  }

  if ('accountType' in value) {
    const accountType = parseAccountType(value.accountType);

    if (!accountType.ok) {
      return accountType;
    }

    payload.accountType = accountType.value;
  }

  if ('institutionName' in value) {
    const institutionName = parseOptionalText(value.institutionName, 120, 'institutionName');

    if (!institutionName.ok) {
      return institutionName;
    }

    payload.institutionName = institutionName.value;
  }

  if ('currency' in value) {
    const currency = parseCurrency(value.currency);

    if (!currency.ok) {
      return currency;
    }

    payload.currency = currency.value;
  }

  return { ok: true, value: payload };
}

export function parseBalanceCreatePayload(value: unknown):
  | {
      ok: true;
      value: BalanceCreatePayload;
    }
  | {
      error: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const balanceCents = parseMoneyCents(value.balanceCents, 'balanceCents');

  if (!balanceCents.ok) {
    return balanceCents;
  }

  const balanceDate = parseBalanceDate(value.balanceDate);

  if (!balanceDate.ok) {
    return balanceDate;
  }

  return {
    ok: true,
    value: {
      balanceCents: balanceCents.value,
      balanceDate: balanceDate.value
    }
  };
}

function readAccountRow(database: D1Database, userId: string, accountId: string): Promise<AccountRow | null> {
  return database
    .prepare(
      `
        SELECT
          id,
          user_id,
          name,
          account_type,
          institution_name,
          currency,
          is_active,
          created_at,
          updated_at,
          archived_at
        FROM financial_accounts
        WHERE id = ?
          AND user_id = ?
          AND is_active = 1
          AND archived_at IS NULL
      `
    )
    .bind(accountId, userId)
    .first<AccountRow>();
}

async function readBalanceRows(
  database: D1Database,
  userId: string,
  accountId: string,
  limit: number
): Promise<BalanceRow[]> {
  const result = await database
    .prepare(
      `
        SELECT
          id,
          account_id,
          balance_cents,
          balance_date,
          created_at
        FROM account_balances
        WHERE user_id = ?
          AND account_id = ?
        ORDER BY balance_date DESC, created_at DESC
        LIMIT ?
      `
    )
    .bind(userId, accountId, limit)
    .all<BalanceRow>();

  return result.results;
}

function groupRecentBalances(rows: BalanceRow[], maxPerAccount: number): Map<string, AccountBalance[]> {
  const groups = new Map<string, AccountBalance[]>();

  rows.forEach((row) => {
    const current = groups.get(row.account_id) ?? [];

    if (current.length >= maxPerAccount) {
      return;
    }

    current.push(toAccountBalance(row));
    groups.set(row.account_id, current);
  });

  return groups;
}

function toFinancialAccount(row: AccountRow, balanceHistory: AccountBalance[]): FinancialAccount {
  const latestBalance = balanceHistory[0];

  return {
    accountType: row.account_type,
    balanceHistory,
    category: liabilityTypes.has(row.account_type) ? 'liability' : 'asset',
    createdAt: row.created_at,
    currency: row.currency,
    id: row.id,
    institutionName: row.institution_name,
    isActive: row.is_active === 1 && row.archived_at === null,
    latestBalanceCents: latestBalance?.balanceCents ?? 0,
    latestBalanceDate: latestBalance?.balanceDate ?? null,
    name: row.name,
    updatedAt: row.updated_at
  };
}

function toAccountBalance(row: BalanceRow): AccountBalance {
  return {
    balanceCents: row.balance_cents,
    balanceDate: row.balance_date,
    createdAt: row.created_at,
    id: row.id
  };
}

function parseAccountName(value: unknown):
  | {
      ok: true;
      value: string;
    }
  | {
      error: string;
      ok: false;
    } {
  if (typeof value !== 'string') {
    return { error: 'name must be a string.', ok: false };
  }

  const name = value.trim();

  if (name.length === 0) {
    return { error: 'name is required.', ok: false };
  }

  if (name.length > 120) {
    return { error: 'name must be 120 characters or fewer.', ok: false };
  }

  return { ok: true, value: name };
}

function parseAccountType(value: unknown):
  | {
      ok: true;
      value: AccountType;
    }
  | {
      error: string;
      ok: false;
    } {
  if (typeof value !== 'string' || !accountTypes.includes(value as AccountType)) {
    return { error: 'accountType is not supported.', ok: false };
  }

  return { ok: true, value: value as AccountType };
}

function parseOptionalText(
  value: unknown,
  maxLength: number,
  fieldName: string
):
  | {
      ok: true;
      value: string | null;
    }
  | {
      error: string;
      ok: false;
    } {
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

function parseCurrency(value: unknown):
  | {
      ok: true;
      value: string;
    }
  | {
      error: string;
      ok: false;
    } {
  if (typeof value !== 'string') {
    return { error: 'currency must be a three-letter currency code.', ok: false };
  }

  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: 'currency must be a three-letter currency code.', ok: false };
  }

  return { ok: true, value: currency };
}

function parseMoneyCents(
  value: unknown,
  fieldName: string
):
  | {
      ok: true;
      value: number;
    }
  | {
      error: string;
      ok: false;
    } {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > maxMoneyCents) {
    return { error: `${fieldName} must be a non-negative integer number of cents.`, ok: false };
  }

  return { ok: true, value };
}

function parseBalanceDate(value: unknown):
  | {
      ok: true;
      value: string;
    }
  | {
      error: string;
      ok: false;
    } {
  if (value === undefined) {
    return { ok: true, value: todayDate() };
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'balanceDate must be an ISO date in YYYY-MM-DD format.', ok: false };
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: 'balanceDate must be a real calendar date.', ok: false };
  }

  return { ok: true, value };
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
