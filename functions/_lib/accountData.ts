/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

export const ACCOUNT_DATA_DELETE_CONFIRMATION = 'DELETE MY FINPATH DATA';

type JsonValue = boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue };
type DataRow = Record<string, JsonValue>;

type UserRow = {
  created_at: string;
  deleted_at: string | null;
  id: string;
  provider: string;
  provider_user_id: string;
  updated_at: string;
};

type UserProfileRow = {
  birth_year: number | null;
  created_at: string;
  default_currency: string;
  display_name: string | null;
  household_name: string | null;
  target_retirement_age: number | null;
  updated_at: string;
  user_id: string;
};

type FinancialAccountRow = {
  account_type: string;
  archived_at: string | null;
  created_at: string;
  currency: string;
  id: string;
  institution_name: string | null;
  is_active: number;
  name: string;
  updated_at: string;
  user_id: string;
};

type AccountBalanceRow = {
  account_id: string;
  balance_cents: number;
  balance_date: string;
  created_at: string;
  id: string;
  user_id: string;
};

type TransactionRow = {
  account_id: string | null;
  amount_cents: number;
  category: string | null;
  created_at: string;
  description: string;
  id: string;
  notes: string | null;
  transaction_date: string;
  transaction_type: string;
  updated_at: string;
  user_id: string;
};

type GoalRow = {
  archived_at: string | null;
  created_at: string;
  current_amount_cents: number;
  goal_type: string;
  id: string;
  name: string;
  status: string;
  target_amount_cents: number | null;
  target_date: string | null;
  updated_at: string;
  user_id: string;
};

type PlanRow = {
  archived_at: string | null;
  created_at: string;
  goal_id: string | null;
  id: string;
  name: string;
  plan_type: string;
  status: string;
  updated_at: string;
  user_id: string;
};

type PlanVersionRow = {
  created_at: string;
  id: string;
  label: string | null;
  notes: string | null;
  plan_id: string;
  user_id: string;
  version_number: number;
};

type FirePlanJsonRow = {
  created_at: string;
  plan_version_id: string;
  user_id: string;
};

type FirePlanInputRow = FirePlanJsonRow & {
  input_json: string;
};

type FirePlanResultRow = FirePlanJsonRow & {
  result_json: string;
};

type AssumptionRow = {
  assumption_type: string;
  created_at: string;
  id: string;
  name: string;
  updated_at: string;
  user_id: string;
  value_json: string;
};

type AuditLogRow = {
  action: string;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  metadata_json: string | null;
  user_id: string | null;
};

type BalanceImportRow = {
  created_at: string;
  duplicate_rows: number;
  error_rows: number;
  file_name: string;
  id: string;
  imported_rows: number;
  source_hash: string;
  total_rows: number;
  user_id: string;
};

type AccountDataExportData = {
  accountBalances: DataRow[];
  assumptions: DataRow[];
  auditLog: DataRow[];
  balanceImports: DataRow[];
  financialAccounts: DataRow[];
  firePlanInputs: DataRow[];
  firePlanResults: DataRow[];
  goals: DataRow[];
  planVersions: DataRow[];
  plans: DataRow[];
  profile: DataRow | null;
  transactions: DataRow[];
  user: DataRow | null;
};

export type AccountDataExport = {
  data: AccountDataExportData;
  exportedAt: string;
  schemaVersion: 1;
  subject: {
    provider: 'clerk';
    userId: string;
  };
  summary: Record<keyof AccountDataExportData, number>;
};

export type AccountDataDeletionResult = {
  deletedAt: string;
  deletedRows: Record<string, number>;
  identityProvider: 'clerk';
  localAccountDataDeleted: true;
};

type DeleteTarget = {
  key: string;
  sql: string;
};

const deleteTargets: DeleteTarget[] = [
  { key: 'auditLog', sql: 'DELETE FROM audit_log WHERE user_id = ?' },
  { key: 'assumptions', sql: 'DELETE FROM assumptions WHERE user_id = ?' },
  { key: 'firePlanResults', sql: 'DELETE FROM fire_plan_results WHERE user_id = ?' },
  { key: 'firePlanInputs', sql: 'DELETE FROM fire_plan_inputs WHERE user_id = ?' },
  { key: 'planVersions', sql: 'DELETE FROM plan_versions WHERE user_id = ?' },
  { key: 'plans', sql: 'DELETE FROM plans WHERE user_id = ?' },
  { key: 'goals', sql: 'DELETE FROM goals WHERE user_id = ?' },
  { key: 'transactions', sql: 'DELETE FROM transactions WHERE user_id = ?' },
  { key: 'accountBalances', sql: 'DELETE FROM account_balances WHERE user_id = ?' },
  { key: 'financialAccounts', sql: 'DELETE FROM financial_accounts WHERE user_id = ?' },
  { key: 'balanceImports', sql: 'DELETE FROM balance_imports WHERE user_id = ?' },
  { key: 'profile', sql: 'DELETE FROM user_profiles WHERE user_id = ?' },
  { key: 'user', sql: 'DELETE FROM users WHERE id = ?' }
];

export function parseAccountDataDeletionRequest(value: unknown):
  | { ok: true }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  if (typeof value.confirmation !== 'string') {
    return { error: `Type ${ACCOUNT_DATA_DELETE_CONFIRMATION} to delete saved account data.`, ok: false };
  }

  if (value.confirmation.trim() !== ACCOUNT_DATA_DELETE_CONFIRMATION) {
    return { error: `Confirmation must exactly match ${ACCOUNT_DATA_DELETE_CONFIRMATION}.`, ok: false };
  }

  return { ok: true };
}

export async function exportAccountData(database: D1Database, userId: string): Promise<AccountDataExport> {
  await ensureUserProfile(database, userId);

  const data = {
    accountBalances: await readAccountBalances(database, userId),
    assumptions: await readAssumptions(database, userId),
    auditLog: await readAuditLog(database, userId),
    balanceImports: await readBalanceImports(database, userId),
    financialAccounts: await readFinancialAccounts(database, userId),
    firePlanInputs: await readFirePlanInputs(database, userId),
    firePlanResults: await readFirePlanResults(database, userId),
    goals: await readGoals(database, userId),
    planVersions: await readPlanVersions(database, userId),
    plans: await readPlans(database, userId),
    profile: toOptionalDataRow(await readProfile(database, userId)),
    transactions: await readTransactions(database, userId),
    user: toOptionalDataRow(await readUser(database, userId))
  };

  return {
    data,
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    subject: {
      provider: 'clerk',
      userId
    },
    summary: summarizeExport(data)
  };
}

export async function deleteAccountData(database: D1Database, userId: string): Promise<AccountDataDeletionResult> {
  const results = await database.batch(
    deleteTargets.map((target) => database.prepare(target.sql).bind(userId))
  );

  return {
    deletedAt: new Date().toISOString(),
    deletedRows: Object.fromEntries(
      deleteTargets.map((target, index) => [target.key, results[index]?.meta.changes ?? 0])
    ),
    identityProvider: 'clerk',
    localAccountDataDeleted: true
  };
}

async function readUser(database: D1Database, userId: string): Promise<UserRow | null> {
  return database
    .prepare(
      `
        SELECT id, provider, provider_user_id, created_at, updated_at, deleted_at
        FROM users
        WHERE id = ?
      `
    )
    .bind(userId)
    .first<UserRow>();
}

async function readProfile(database: D1Database, userId: string): Promise<UserProfileRow | null> {
  return database
    .prepare(
      `
        SELECT
          user_id,
          display_name,
          household_name,
          default_currency,
          birth_year,
          target_retirement_age,
          created_at,
          updated_at
        FROM user_profiles
        WHERE user_id = ?
      `
    )
    .bind(userId)
    .first<UserProfileRow>();
}

async function readFinancialAccounts(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
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
        ORDER BY created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<FinancialAccountRow>();

  return result.results.map(toDataRow);
}

async function readAccountBalances(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT id, account_id, user_id, balance_date, balance_cents, created_at
        FROM account_balances
        WHERE user_id = ?
        ORDER BY balance_date ASC, created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<AccountBalanceRow>();

  return result.results.map(toDataRow);
}

async function readTransactions(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT
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
        FROM transactions
        WHERE user_id = ?
        ORDER BY transaction_date ASC, created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<TransactionRow>();

  return result.results.map(toDataRow);
}

async function readGoals(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT
          id,
          user_id,
          name,
          goal_type,
          target_amount_cents,
          current_amount_cents,
          target_date,
          status,
          created_at,
          updated_at,
          archived_at
        FROM goals
        WHERE user_id = ?
        ORDER BY created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<GoalRow>();

  return result.results.map(toDataRow);
}

async function readPlans(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT
          id,
          user_id,
          goal_id,
          name,
          plan_type,
          status,
          created_at,
          updated_at,
          archived_at
        FROM plans
        WHERE user_id = ?
        ORDER BY created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<PlanRow>();

  return result.results.map(toDataRow);
}

async function readPlanVersions(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT id, plan_id, user_id, version_number, label, notes, created_at
        FROM plan_versions
        WHERE user_id = ?
        ORDER BY created_at ASC, version_number ASC, id ASC
      `
    )
    .bind(userId)
    .all<PlanVersionRow>();

  return result.results.map(toDataRow);
}

async function readFirePlanInputs(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT plan_version_id, user_id, input_json, created_at
        FROM fire_plan_inputs
        WHERE user_id = ?
        ORDER BY created_at ASC, plan_version_id ASC
      `
    )
    .bind(userId)
    .all<FirePlanInputRow>();

  return result.results.map(({ input_json: inputJson, ...row }) => ({
    ...toDataRow(row),
    input: parseStoredJson(inputJson)
  }));
}

async function readFirePlanResults(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT plan_version_id, user_id, result_json, created_at
        FROM fire_plan_results
        WHERE user_id = ?
        ORDER BY created_at ASC, plan_version_id ASC
      `
    )
    .bind(userId)
    .all<FirePlanResultRow>();

  return result.results.map(({ result_json: resultJson, ...row }) => ({
    ...toDataRow(row),
    result: parseStoredJson(resultJson)
  }));
}

async function readAssumptions(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT id, user_id, name, assumption_type, value_json, created_at, updated_at
        FROM assumptions
        WHERE user_id = ?
        ORDER BY created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<AssumptionRow>();

  return result.results.map(({ value_json: valueJson, ...row }) => ({
    ...toDataRow(row),
    value: parseStoredJson(valueJson)
  }));
}

async function readAuditLog(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT id, user_id, action, entity_type, entity_id, metadata_json, created_at
        FROM audit_log
        WHERE user_id = ?
        ORDER BY created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<AuditLogRow>();

  return result.results.map(({ metadata_json: metadataJson, ...row }) => ({
    ...toDataRow(row),
    metadata: metadataJson ? parseStoredJson(metadataJson) : null
  }));
}

async function readBalanceImports(database: D1Database, userId: string): Promise<DataRow[]> {
  const result = await database
    .prepare(
      `
        SELECT
          id,
          user_id,
          file_name,
          source_hash,
          total_rows,
          imported_rows,
          duplicate_rows,
          error_rows,
          created_at
        FROM balance_imports
        WHERE user_id = ?
        ORDER BY created_at ASC, id ASC
      `
    )
    .bind(userId)
    .all<BalanceImportRow>();

  return result.results.map(toDataRow);
}

function summarizeExport(data: AccountDataExportData): AccountDataExport['summary'] {
  return {
    accountBalances: data.accountBalances.length,
    assumptions: data.assumptions.length,
    auditLog: data.auditLog.length,
    balanceImports: data.balanceImports.length,
    financialAccounts: data.financialAccounts.length,
    firePlanInputs: data.firePlanInputs.length,
    firePlanResults: data.firePlanResults.length,
    goals: data.goals.length,
    planVersions: data.planVersions.length,
    plans: data.plans.length,
    profile: data.profile ? 1 : 0,
    transactions: data.transactions.length,
    user: data.user ? 1 : 0
  };
}

function parseStoredJson(value: string): JsonValue {
  try {
    const parsed: unknown = JSON.parse(value);
    return toJsonValue(parsed);
  } catch {
    return value;
  }
}

function toDataRow<T extends Record<string, unknown>>(row: T): DataRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toJsonValue(value)]));
}

function toOptionalDataRow<T extends Record<string, unknown>>(row: T | null): DataRow | null {
  return row ? toDataRow(row) : null;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, toJsonValue(child)]));
  }

  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
