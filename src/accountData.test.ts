import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_DATA_DELETE_CONFIRMATION,
  deleteAccountData,
  exportAccountData,
  parseAccountDataDeletionRequest
} from '../functions/_lib/accountData';

type PreparedCall = {
  sql: string;
  values: unknown[];
};

class FakeStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeDatabase,
    readonly sql: string
  ) {}

  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    this.database.boundStatements.push({ sql: this.sql, values });
    return this;
  }

  first<T = Record<string, unknown>>(): Promise<T | null> {
    return Promise.resolve(this.database.first<T>(this.sql));
  }

  all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return Promise.resolve(result(this.database.all<T>(this.sql), 0));
  }

  run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    this.database.runs.push({ sql: this.sql, values: this.values });
    return Promise.resolve(result<T>([], 1));
  }
}

class FakeDatabase {
  boundStatements: PreparedCall[] = [];
  runs: PreparedCall[] = [];

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this, normalizeSql(sql));
  }

  batch<T = unknown>(statements: FakeStatement[]): Promise<D1Result<T>[]> {
    return Promise.resolve(statements.map((_, index) => result<T>([], index + 1)));
  }

  first<T>(sql: string): T | null {
    if (sql.includes('FROM user_profiles')) {
      return {
        birth_year: 1984,
        created_at: '2026-06-01T00:00:00.000Z',
        default_currency: 'USD',
        display_name: 'Test User',
        household_name: 'Test Household',
        target_retirement_age: 55,
        updated_at: '2026-06-02T00:00:00.000Z',
        user_id: 'user_123'
      } as T;
    }

    if (sql.includes('FROM users')) {
      return {
        created_at: '2026-06-01T00:00:00.000Z',
        deleted_at: null,
        id: 'user_123',
        provider: 'clerk',
        provider_user_id: 'user_123',
        updated_at: '2026-06-02T00:00:00.000Z'
      } as T;
    }

    return null;
  }

  all<T>(sql: string): T[] {
    if (sql.includes('FROM financial_accounts')) {
      return [
        {
          account_type: 'investment',
          archived_at: '2026-06-10T00:00:00.000Z',
          created_at: '2026-06-01T00:00:00.000Z',
          currency: 'USD',
          id: 'account_archived',
          institution_name: 'Brokerage',
          is_active: 0,
          name: 'Archived Brokerage',
          updated_at: '2026-06-10T00:00:00.000Z',
          user_id: 'user_123'
        }
      ] as T[];
    }

    if (sql.includes('FROM fire_plan_inputs')) {
      return [
        {
          created_at: '2026-06-02T00:00:00.000Z',
          input_json: '{"plan":{"annualExpense":80000},"timeline":{"retirementAge":55}}',
          plan_version_id: 'version_1',
          user_id: 'user_123'
        }
      ] as T[];
    }

    if (sql.includes('FROM balance_imports')) {
      return [
        {
          created_at: '2026-06-03T00:00:00.000Z',
          duplicate_rows: 2,
          error_rows: 1,
          file_name: 'balances.csv',
          id: 'import_1',
          imported_rows: 3,
          source_hash: 'hash_123',
          total_rows: 6,
          user_id: 'user_123'
        }
      ] as T[];
    }

    if (sql.includes('FROM transaction_imports')) {
      return [
        {
          created_at: '2026-07-05T00:00:00.000Z',
          duplicate_rows: 1,
          error_rows: 2,
          file_name: 'transactions.csv',
          id: 'transaction_import_1',
          imported_rows: 4,
          source_hash: 'transaction_hash_123',
          total_rows: 7,
          user_id: 'user_123'
        }
      ] as T[];
    }

    return [];
  }
}

describe('account data deletion confirmation', () => {
  it('requires the exact confirmation phrase', () => {
    expect(parseAccountDataDeletionRequest({ confirmation: ACCOUNT_DATA_DELETE_CONFIRMATION })).toEqual({ ok: true });
    expect(parseAccountDataDeletionRequest({ confirmation: 'delete my data' })).toEqual({
      error: `Confirmation must exactly match ${ACCOUNT_DATA_DELETE_CONFIRMATION}.`,
      ok: false
    });
    expect(parseAccountDataDeletionRequest(null)).toEqual({
      error: 'Request body must be a JSON object.',
      ok: false
    });
  });
});

describe('account data export', () => {
  it('exports raw user-owned rows including archived records and parsed plan JSON', async () => {
    const database = new FakeDatabase();
    const exported = await exportAccountData(database as unknown as D1Database, 'user_123');

    expect(exported.subject).toEqual({ provider: 'clerk', userId: 'user_123' });
    expect(exported.schemaVersion).toBe(1);
    expect(exported.data.financialAccounts[0]).toMatchObject({
      archived_at: '2026-06-10T00:00:00.000Z',
      id: 'account_archived',
      is_active: 0
    });
    expect(exported.data.firePlanInputs[0].input).toEqual({
      plan: { annualExpense: 80000 },
      timeline: { retirementAge: 55 }
    });
    expect(exported.data.balanceImports[0]).toMatchObject({ source_hash: 'hash_123' });
    expect(exported.data.transactionImports[0]).toMatchObject({ source_hash: 'transaction_hash_123' });
    expect(exported.summary).toMatchObject({
      balanceImports: 1,
      financialAccounts: 1,
      firePlanInputs: 1,
      profile: 1,
      transactionImports: 1,
      user: 1
    });
  });
});

describe('account data deletion', () => {
  it('deletes audit rows before root user data and does not create a profile first', async () => {
    const database = new FakeDatabase();
    const deletion = await deleteAccountData(database as unknown as D1Database, 'user_123');
    const deleteSql = database.boundStatements.map((call) => call.sql);

    expect(database.runs).toEqual([]);
    expect(deleteSql[0]).toBe('DELETE FROM audit_log WHERE user_id = ?');
    expect(deleteSql.at(-1)).toBe('DELETE FROM users WHERE id = ?');
    expect(deletion.localAccountDataDeleted).toBe(true);
    expect(deletion.identityProvider).toBe('clerk');
    expect(deletion.deletedRows).toMatchObject({
      auditLog: 1,
      savedCalculatorResults: 3,
      user: 15
    });
  });
});

function result<T>(rows: T[], changes: number): D1Result<T> {
  return {
    results: rows,
    success: true,
    meta: {
      changed_db: changes > 0,
      changes,
      duration: 1,
      last_row_id: 0,
      rows_read: rows.length,
      rows_written: changes,
      size_after: 0
    }
  };
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}
