// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createD1TestHarness, seedTestUser } from './test/d1TestHarness';
import { createAccount } from '../functions/_lib/accounts';
import { deleteAccountData, exportAccountData } from '../functions/_lib/accountData';
import { ensureUserProfile, UserDeletedError } from '../functions/_lib/persistence';

describe('R2: Atomic Deletion Boundary and Coherent Export Regressions', () => {
  it('review probe 1: account write must not commit after deletion', async () => {
    const h = createD1TestHarness();
    await seedTestUser(h, 'review_synthetic_a');
    await seedTestUser(h, 'review_synthetic_b');

    // Seed initial account for User B to verify User B is preserved
    await createAccount(h.db, 'review_synthetic_b', {
      name: 'User B Checking',
      accountType: 'checking',
      currency: 'USD',
      institutionName: null
    } as any);

    const originalBatch = h.db.batch.bind(h.db);
    let intercepted = false;
    h.db.batch = async (statements: any[]) => {
      if (!intercepted && statements.some((s) => s.query.includes('INSERT INTO financial_accounts'))) {
        intercepted = true;
        // Concurrent deletion occurs after ensureUserProfile but immediately before domain batch
        await deleteAccountData(h.db, 'review_synthetic_a');
      }
      return originalBatch(statements);
    };

    let error: unknown = null;
    try {
      await createAccount(h.db, 'review_synthetic_a', {
        name: 'Race probe account',
        accountType: 'cash',
        currency: 'USD',
        institutionName: null
      } as any);
    } catch (err) {
      error = err;
    }

    expect(intercepted).toBe(true);
    // Must throw UserDeletedError
    expect(error).toBeInstanceOf(UserDeletedError);

    // Database verification: User A has tombstone set and exactly 0 financial accounts
    const userARows = h.getUserRows('users', 'review_synthetic_a');
    expect(userARows).toHaveLength(1);
    expect(userARows[0].deleted_at).toBeTruthy();
    expect(h.getUserRows('financial_accounts', 'review_synthetic_a')).toHaveLength(0);

    // User B data remains completely intact
    const userBAccounts = h.getUserRows('financial_accounts', 'review_synthetic_b');
    expect(userBAccounts).toHaveLength(1);
    expect(userBAccounts[0].name).toBe('User B Checking');
  });

  it('review probe 2: export cannot combine pre-delete accounts with post-delete user', async () => {
    const h = createD1TestHarness();
    await seedTestUser(h, 'review_synthetic_export');
    await createAccount(h.db, 'review_synthetic_export', {
      name: 'Export probe account',
      accountType: 'cash',
      currency: 'USD',
      institutionName: null
    } as any);

    const originalBatch = h.db.batch.bind(h.db);
    let intercepted = false;

    // Simulate concurrent deletion during the export batch
    h.db.batch = async (statements: any[]) => {
      const isExportBatch = statements.some((s) => s.query.includes('FROM financial_accounts'));
      if (isExportBatch && !intercepted) {
        intercepted = true;
        // Deletion occurs concurrently
        await deleteAccountData(h.db, 'review_synthetic_export');
      }
      return originalBatch(statements);
    };

    let exportResult: any = null;
    let exportError: any = null;
    try {
      exportResult = await exportAccountData(h.db, 'review_synthetic_export');
    } catch (err) {
      exportError = err;
    }

    expect(intercepted).toBe(true);

    // The export must either fail cleanly with UserDeletedError, OR if it read before deletion,
    // it must return a fully coherent snapshot where user is not null and not deleted.
    // It must NEVER return pre-delete accounts with a null or deleted user.
    if (exportError) {
      expect(exportError).toBeInstanceOf(UserDeletedError);
    } else {
      expect(exportResult.data.financialAccounts).toHaveLength(1);
      expect(exportResult.data.user).not.toBeNull();
      expect(exportResult.data.user.deleted_at).toBeNull();
    }
  });

  it('rejects identity creation and writes when tombstone already exists', async () => {
    const h = createD1TestHarness();
    const now = new Date().toISOString();
    // Pre-insert a tombstoned user row
    await h.db
      .prepare(
        `INSERT INTO users (id, provider, provider_user_id, created_at, updated_at, deleted_at)
         VALUES ('pre_deleted_user', 'clerk', 'pre_deleted_user', ?, ?, ?)`
      )
      .bind(now, now, now)
      .run();

    // ensureUserProfile must immediately reject
    await expect(ensureUserProfile(h.db, 'pre_deleted_user')).rejects.toThrow(UserDeletedError);

    // createAccount must reject
    await expect(
      createAccount(h.db, 'pre_deleted_user', {
        name: 'Zombie account',
        accountType: 'checking',
        currency: 'USD',
        institutionName: null
      } as any)
    ).rejects.toThrow(UserDeletedError);

    // Database verification: zero rows in financial_accounts or user_profiles
    expect(h.getUserRows('financial_accounts', 'pre_deleted_user')).toHaveLength(0);
    expect(h.getUserRows('user_profiles', 'pre_deleted_user')).toHaveLength(0);
  });

  it('rejects write if deletion occurs between ensureUserProfile steps', async () => {
    const h = createD1TestHarness();
    const userId = 'race_between_steps_user';

    const originalRun = h.db.prepare.bind(h.db);
    let deleted = false;

    // Intercept prepare: right after INSERT INTO users, inject deletion before INSERT INTO user_profiles
    h.db.prepare = (query: string) => {
      const stmt = originalRun(query);
      const originalBind = stmt.bind.bind(stmt);
      stmt.bind = (...params: any[]) => {
        const bound = originalBind(...params);
        if (query.includes('INSERT INTO user_profiles') && !deleted) {
          const origRun = bound.run.bind(bound);
          bound.run = async () => {
            deleted = true;
            // Delete user before user_profiles insert executes
            await deleteAccountData(h.db, userId);
            return origRun();
          };
        }
        return bound;
      };
      return stmt;
    };

    await expect(ensureUserProfile(h.db, userId)).rejects.toThrow(UserDeletedError);
    expect(deleted).toBe(true);

    // Database check: user_profiles has 0 rows for this user
    expect(h.getUserRows('user_profiles', userId)).toHaveLength(0);
  });

  it('handles repeated deletions idempotently without mutating User B', async () => {
    const h = createD1TestHarness();
    await seedTestUser(h, 'repeat_user_a');
    await seedTestUser(h, 'repeat_user_b');

    await createAccount(h.db, 'repeat_user_b', {
      name: 'User B Savings',
      accountType: 'savings',
      currency: 'USD',
      institutionName: null
    } as any);

    // First deletion
    const del1 = await deleteAccountData(h.db, 'repeat_user_a');
    expect(del1.localAccountDataDeleted).toBe(true);

    const userAFirstDeletedAt = h.getUserRows('users', 'repeat_user_a')[0].deleted_at;
    expect(userAFirstDeletedAt).toBeTruthy();

    // Second deletion (repeated immediately)
    const del2 = await deleteAccountData(h.db, 'repeat_user_a');
    expect(del2.localAccountDataDeleted).toBe(true);
    expect(del2.deletedRows.financialAccounts).toBe(0);

    // User A remains tombstoned
    expect(h.getUserRows('users', 'repeat_user_a')[0].deleted_at).toBeTruthy();

    // User B account and user rows remain completely intact
    const bAccounts = h.getUserRows('financial_accounts', 'repeat_user_b');
    expect(bAccounts).toHaveLength(1);
    expect(bAccounts[0].name).toBe('User B Savings');
    expect(h.getUserRows('users', 'repeat_user_b')[0].deleted_at).toBeNull();
  });

  it('ensures injected batch failure cleanly rolls back with 0 partial inserts', async () => {
    const h = createD1TestHarness();
    await seedTestUser(h, 'rollback_user');

    const originalBatch = h.db.batch.bind(h.db);
    h.db.batch = async (statements: any[]) => {
      // Intentionally append an invalid SQL statement to cause batch failure
      const invalidStmt = h.db.prepare('INSERT INTO non_existent_table_xyz VALUES (1)');
      return originalBatch([...statements, invalidStmt]);
    };

    await expect(
      createAccount(h.db, 'rollback_user', {
        name: 'Should Rollback',
        accountType: 'checking',
        currency: 'USD',
        institutionName: null,
        balanceCents: 50000
      } as any)
    ).rejects.toThrow();

    // Verify 0 rows in financial_accounts or account_balances
    expect(h.getUserRows('financial_accounts', 'rollback_user')).toHaveLength(0);
    expect(h.getUserRows('account_balances', 'rollback_user')).toHaveLength(0);
  });
});
