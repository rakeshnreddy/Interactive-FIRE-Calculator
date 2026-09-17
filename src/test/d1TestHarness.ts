/// <reference types="@cloudflare/workers-types" />

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const MIGRATION_FILES = [
  "0001_initial_financial_platform_schema.sql",
  "0002_balance_import_history.sql",
  "0003_transaction_import_history.sql",
  "0004_saved_calculator_results.sql",
  "0005_saved_calculator_idempotency.sql",
  "0006_user_tombstone_triggers.sql",
  "0007_monthly_plan_reviews.sql"
];

export const ALL_DATABASE_TABLES = [
  "users",
  "user_profiles",
  "financial_accounts",
  "account_balances",
  "transactions",
  "goals",
  "plans",
  "plan_versions",
  "fire_plan_inputs",
  "fire_plan_results",
  "plan_reviews",
  "assumptions",
  "audit_log",
  "balance_imports",
  "transaction_imports",
  "saved_calculator_results"
] as const;

export type TableName = (typeof ALL_DATABASE_TABLES)[number];

function normalizeBinding(val: unknown): string | number | bigint | Uint8Array | null {
  if (val === undefined || val === null) {
    return null;
  }
  if (typeof val === "boolean") {
    return val ? 1 : 0;
  }
  if (typeof val === "number" || typeof val === "string" || typeof val === "bigint") {
    return val;
  }
  if (val instanceof Uint8Array) {
    return val;
  }
  return String(val);
}

class PreparedStatementAdapter {
  private rawDb: DatabaseSync;
  public query: string;
  public params: any[];

  constructor(rawDb: DatabaseSync, query: string, params: any[] = []) {
        this.rawDb = rawDb;
    this.query = query;
    this.params = params;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    const normalized = values.map(normalizeBinding);
    return new PreparedStatementAdapter(this.rawDb, this.query, normalized) as unknown as D1PreparedStatement;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.rawDb.prepare(this.query);
    const row = stmt.get(...this.params) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    if (colName !== undefined) {
      return (row[colName] ?? null) as T;
    }
    return row as T;
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const stmt = this.rawDb.prepare(this.query);
    const result = stmt.run(...this.params);
    const changes = Number(result.changes);
    return {
      success: true,
      results: [] as T[],
      meta: {
        duration: 0,
        changes,
        last_row_id: Number(result.lastInsertRowid),
        changed_db: changes > 0,
        size_after: 0,
        rows_read: 0,
        rows_written: changes
      }
    };
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const isMutation = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(this.query) && !/\bRETURNING\b/i.test(this.query);
    const stmt = this.rawDb.prepare(this.query);

    if (isMutation) {
      const result = stmt.run(...this.params);
      const changes = Number(result.changes);
      return {
        results: [] as T[],
        success: true,
        meta: {
          duration: 0,
          changes,
          last_row_id: Number(result.lastInsertRowid),
          changed_db: changes > 0,
          size_after: 0,
          rows_read: 0,
          rows_written: changes
        }
      };
    }

    const rows = stmt.all(...this.params) as T[];
    return {
      results: rows,
      success: true,
      meta: {
        duration: 0,
        changes: 0,
        last_row_id: 0,
        changed_db: false,
        size_after: 0,
        rows_read: rows.length,
        rows_written: 0
      }
    };
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<any> {
    const stmt = this.rawDb.prepare(this.query);
    const rows = stmt.all(...this.params) as Record<string, unknown>[];
    const data = rows.map((row) => Object.values(row)) as T[];
    if (options?.columnNames && rows.length > 0) {
      return [Object.keys(rows[0]), ...data];
    }
    return data;
  }
}

class D1DatabaseAdapter {
  private rawDb: DatabaseSync;

  constructor(rawDb: DatabaseSync) {
        this.rawDb = rawDb;
  }

  prepare(query: string): D1PreparedStatement {
    return new PreparedStatementAdapter(this.rawDb, query) as unknown as D1PreparedStatement;
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    this.rawDb.exec("BEGIN IMMEDIATE;");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) {
        const adapter = statement as PreparedStatementAdapter;
        const res = await adapter.all<T>();
        results.push(res);
      }
      this.rawDb.exec("COMMIT;");
      return results;
    } catch (error) {
      this.rawDb.exec("ROLLBACK;");
      throw error;
    }
  }

  async exec(query: string): Promise<D1ExecResult> {
    this.rawDb.exec(query);
    return { count: 1, duration: 0 };
  }

  withSession(): D1DatabaseSession {
    throw new Error("withSession not implemented in test harness");
  }

  async dump(): Promise<ArrayBuffer> {
    throw new Error("dump not implemented in D1 test adapter");
  }
}

export interface D1TestHarness {
  db: D1Database;
  raw: DatabaseSync;
  reset: () => void;
  getTableCounts: () => Record<TableName, number>;
  getUserTableCounts: (userId: string) => Record<TableName, number>;
  getAllRows: <T = any>(table: TableName) => T[];
  getUserRows: <T = any>(table: TableName, userId: string) => T[];
  takeDatabaseSnapshot: () => Record<TableName, any[]>;
  assertNoChangesForUser: (
    before: Record<TableName, any[]>,
    after: Record<TableName, any[]>,
    userId: string
  ) => void;
}

function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "migrations"),
    path.resolve(process.cwd(), "../migrations")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not locate migrations directory.");
}

export function createD1TestHarness(): D1TestHarness {
  let rawDb: DatabaseSync;
  let d1Db: D1Database;

  const initDb = () => {
    rawDb = new DatabaseSync(":memory:");
    rawDb.exec("PRAGMA foreign_keys = ON;");

    const migrationsDir = resolveMigrationsDir();
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");
      rawDb.exec(sql);
    }

    d1Db = new D1DatabaseAdapter(rawDb) as unknown as D1Database;
  };

  initDb();

  const getTableCounts = (): Record<TableName, number> => {
    const counts: Partial<Record<TableName, number>> = {};
    for (const table of ALL_DATABASE_TABLES) {
      const row = rawDb.prepare("SELECT COUNT(*) as count FROM " + table).get() as { count: number };
      counts[table] = Number(row.count);
    }
    return counts as Record<TableName, number>;
  };

  const getUserTableCounts = (userId: string): Record<TableName, number> => {
    const counts: Partial<Record<TableName, number>> = {};
    for (const table of ALL_DATABASE_TABLES) {
      const idCol = table === "users" ? "id" : "user_id";
      const row = rawDb.prepare("SELECT COUNT(*) as count FROM " + table + " WHERE " + idCol + " = ?").get(userId) as { count: number };
      counts[table] = Number(row.count);
    }
    return counts as Record<TableName, number>;
  };

  const getAllRows = <T = any>(table: TableName): T[] => {
    return rawDb.prepare("SELECT * FROM " + table).all() as T[];
  };

  const getUserRows = <T = any>(table: TableName, userId: string): T[] => {
    const idCol = table === "users" ? "id" : "user_id";
    return rawDb.prepare("SELECT * FROM " + table + " WHERE " + idCol + " = ?").all(userId) as T[];
  };

  const takeDatabaseSnapshot = (): Record<TableName, any[]> => {
    const snapshot: Partial<Record<TableName, any[]>> = {};
    for (const table of ALL_DATABASE_TABLES) {
      snapshot[table] = rawDb.prepare("SELECT * FROM " + table).all();
    }
    return snapshot as Record<TableName, any[]>;
  };

  const assertNoChangesForUser = (
    before: Record<TableName, any[]>,
    after: Record<TableName, any[]>,
    userId: string
  ): void => {
    for (const table of ALL_DATABASE_TABLES) {
      const idCol = table === "users" ? "id" : "user_id";
      const beforeUserRows = before[table].filter((row) => row[idCol] === userId);
      const afterUserRows = after[table].filter((row) => row[idCol] === userId);

      if (JSON.stringify(beforeUserRows) !== JSON.stringify(afterUserRows)) {
        throw new Error(
          "Unexpected database modification for user " + userId + " in table " + table + ".\n" +
          "Before: " + JSON.stringify(beforeUserRows) + "\n" +
          "After: " + JSON.stringify(afterUserRows)
        );
      }
    }
  };

  return {
    get db() {
      return d1Db;
    },
    get raw() {
      return rawDb;
    },
    reset: initDb,
    getTableCounts,
    getUserTableCounts,
    getAllRows,
    getUserRows,
    takeDatabaseSnapshot,
    assertNoChangesForUser
  };
}

export async function seedTestUser(
  harness: D1TestHarness,
  userId: string,
  profile?: { displayName?: string; defaultCurrency?: string }
): Promise<void> {
  const now = new Date().toISOString();
  await harness.db
    .prepare("INSERT INTO users (id, provider, provider_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .bind(userId, "clerk", userId, now, now)
    .run();

  await harness.db
    .prepare(
      "INSERT INTO user_profiles (user_id, display_name, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(userId, profile?.displayName ?? ("User " + userId), profile?.defaultCurrency ?? "USD", now, now)
    .run();
}

export async function invokeApi<Env = any>(
  handler: any,
  request: Request,
  env: Env,
  params: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: Headers }> {
  const context = {
    request,
    env,
    params,
    data: {},
    next: async () => new Response("next not supported in unit test"),
    waitUntil: () => {},
    passThroughOnException: () => {}
  };

  const response = await handler(context);
  const contentType = response.headers.get("content-type") ?? "";
  let body: any = null;
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return {
    status: response.status,
    body,
    headers: response.headers
  };
}
