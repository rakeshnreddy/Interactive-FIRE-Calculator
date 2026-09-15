// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createD1TestHarness, seedTestUser, invokeApi } from './test/d1TestHarness';
import { createAccount } from '../functions/_lib/accounts';
import { deleteAccountData, exportAccountData } from '../functions/_lib/accountData';
import { ensureUserProfile, UserDeletedError } from '../functions/_lib/persistence';
import * as sessionModule from '../functions/_lib/session';
import { onRequestDelete as deleteAccountDataHandler } from '../functions/api/account-data/index';
import { onRequestPost as createAccountHandler } from '../functions/api/accounts/index';

describe('R2: Atomic Deletion Boundary, Missing-Identity Tombstones, and Trigger Protection', () => {
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

    // The export must either fail cleanly with UserDeletedError, OR return a fully coherent snapshot
    if (exportError) {
      expect(exportError).toBeInstanceOf(UserDeletedError);
    } else {
      expect(exportResult.data.financialAccounts).toHaveLength(1);
      expect(exportResult.data.user).not.toBeNull();
      expect(exportResult.data.user.deleted_at).toBeNull();
    }
  });

  it('successful deletion before first database initialization creates tombstone and blocks delayed initialization (review 2 probe)', async () => {
    const h = createD1TestHarness();
    const userId = 'synthetic_never_initialized';

    // Verify user has zero rows in users or any child table prior to deletion
    expect(h.getUserRows('users', userId)).toHaveLength(0);
    expect(h.getUserTableCounts(userId).financial_accounts).toBe(0);

    // Execute deletion for an identity that was never initialized in D1
    const result = await deleteAccountData(h.db, userId);
    expect(result.localAccountDataDeleted).toBe(true);

    // Tombstone MUST be atomically persisted in users table
    const userRows = h.getUserRows('users', userId);
    expect(userRows).toHaveLength(1);
    expect(userRows[0].id).toBe(userId);
    expect(userRows[0].deleted_at).toBeTruthy();
    expect(userRows[0].provider).toBe('clerk');

    // Subsequent ensureUserProfile must immediately reject with UserDeletedError
    await expect(ensureUserProfile(h.db, userId)).rejects.toBeInstanceOf(UserDeletedError);

    // Subsequent domain write (e.g. createAccount) must reject with UserDeletedError
    await expect(
      createAccount(h.db, userId, {
        name: 'Late created account',
        accountType: 'checking',
        currency: 'USD',
        institutionName: null
      } as any)
    ).rejects.toBeInstanceOf(UserDeletedError);

    // Database check: 0 child rows committed
    expect(h.getUserRows('financial_accounts', userId)).toHaveLength(0);
    expect(h.getUserRows('user_profiles', userId)).toHaveLength(0);
  });

  it('repeated deletions preserve the original deleted_at timestamp and remain idempotent', async () => {
    const h = createD1TestHarness();
    const userId = 'repeated_deletion_user';

    // First deletion
    const del1 = await deleteAccountData(h.db, userId);
    expect(del1.localAccountDataDeleted).toBe(true);

    const initialDeletedAt = h.getUserRows('users', userId)[0].deleted_at;
    expect(initialDeletedAt).toBeTruthy();

    // Small delay to ensure timestamp would differ if overwritten
    await new Promise((r) => setTimeout(r, 10));

    // Second deletion
    const del2 = await deleteAccountData(h.db, userId);
    expect(del2.localAccountDataDeleted).toBe(true);

    // Original timestamp MUST be preserved by COALESCE(users.deleted_at, excluded.deleted_at)
    const secondDeletedAt = h.getUserRows('users', userId)[0].deleted_at;
    expect(secondDeletedAt).toBe(initialDeletedAt);
  });

  it('initialized user deletion hard-purges all child records and sets tombstone', async () => {
    const h = createD1TestHarness();
    const userId = 'initialized_user_to_delete';

    await seedTestUser(h, userId);
    await createAccount(h.db, userId, {
      name: 'User Checking',
      accountType: 'checking',
      currency: 'USD',
      institutionName: null
    } as any);

    expect(h.getUserRows('financial_accounts', userId)).toHaveLength(1);
    expect(h.getUserRows('users', userId)[0].deleted_at).toBeNull();

    const delResult = await deleteAccountData(h.db, userId);
    expect(delResult.localAccountDataDeleted).toBe(true);

    // Tombstone is set
    expect(h.getUserRows('users', userId)[0].deleted_at).toBeTruthy();
    // Child tables are purged
    expect(h.getUserRows('financial_accounts', userId)).toHaveLength(0);
    expect(h.getUserRows('user_profiles', userId)).toHaveLength(0);

    // Re-initialization blocked
    await expect(ensureUserProfile(h.db, userId)).rejects.toBeInstanceOf(UserDeletedError);
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

  it('ensures injected batch failure in deleteAccountData cleanly rolls back', async () => {
    const h = createD1TestHarness();
    const userId = 'rollback_deletion_user';
    await seedTestUser(h, userId);
    await createAccount(h.db, userId, {
      name: 'Pre-existing Account',
      accountType: 'checking',
      currency: 'USD',
      institutionName: null
    } as any);

    const originalBatch = h.db.batch.bind(h.db);
    h.db.batch = async (statements: any[]) => {
      const invalidStmt = h.db.prepare('INSERT INTO non_existent_table_xyz VALUES (1)');
      return originalBatch([...statements, invalidStmt]);
    };

    await expect(deleteAccountData(h.db, userId)).rejects.toThrow();

    // Rollback guarantees accounts remain and user is NOT tombstoned
    expect(h.getUserRows('financial_accounts', userId)).toHaveLength(1);
    expect(h.getUserRows('users', userId)[0].deleted_at).toBeNull();
  });

  it('preserves full rows for User B across User A deletion (both never-initialized and initialized)', async () => {
    const h = createD1TestHarness();
    const userB = 'user_b_isolation_check';
    await seedTestUser(h, userB);
    await createAccount(h.db, userB, {
      name: 'User B Checking',
      accountType: 'checking',
      currency: 'USD',
      institutionName: null
    } as any);

    const beforeSnapshot = h.takeDatabaseSnapshot();

    // User A1 (never initialized) deleted
    await deleteAccountData(h.db, 'user_a1_uninitialized');
    // User A2 (initialized) deleted
    await seedTestUser(h, 'user_a2_initialized');
    await deleteAccountData(h.db, 'user_a2_initialized');

    const afterSnapshot = h.takeDatabaseSnapshot();

    // Assert User B has zero changes in any table
    h.assertNoChangesForUser(beforeSnapshot, afterSnapshot, userB);
    expect(h.getUserRows('financial_accounts', userB)).toHaveLength(1);
  });

  it('enforces SQLite trigger aborts across all 14 child tables and users resurrection guard', async () => {
    const h = createD1TestHarness();
    const tombstonedUser = 'tombstoned_trigger_user';

    // Delete user to install tombstone
    await deleteAccountData(h.db, tombstonedUser);
    expect(h.getUserRows('users', tombstonedUser)[0].deleted_at).toBeTruthy();

    // 1. user_profiles
    expect(() =>
      h.raw
        .prepare("INSERT INTO user_profiles (user_id, created_at, updated_at) VALUES (?, '2026-09-14', '2026-09-14')")
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 2. financial_accounts
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO financial_accounts (id, user_id, name, account_type, currency, created_at, updated_at) VALUES ('acc_trg', ?, 'Trg Acc', 'checking', 'USD', '2026-09-14', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 3. account_balances
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO account_balances (id, account_id, user_id, balance_cents, balance_date, created_at) VALUES ('bal_trg', 'acc_trg', ?, 1000, '2026-09-14', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 4. transactions
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO transactions (id, user_id, account_id, amount_cents, transaction_type, transaction_date, created_at, updated_at) VALUES ('tx_trg', ?, 'acc_trg', 500, 'expense', '2026-09-14', '2026-09-14', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 5. goals
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO goals (id, user_id, name, goal_type, target_amount_cents, created_at, updated_at) VALUES ('g_trg', ?, 'Goal', 'retirement', 100000, '2026-09-14', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 6. plans
    expect(() =>
      h.raw
        .prepare("INSERT INTO plans (id, user_id, name, created_at, updated_at) VALUES ('p_trg', ?, 'Plan', '2026-09-14', '2026-09-14')")
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 7. plan_versions
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO plan_versions (id, plan_id, user_id, version_number, created_at) VALUES ('pv_trg', 'p_trg', ?, 1, '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 8. fire_plan_inputs
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO fire_plan_inputs (plan_version_id, user_id, input_json, created_at) VALUES ('pv_trg', ?, '{}', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 9. fire_plan_results
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO fire_plan_results (plan_version_id, user_id, result_json, created_at) VALUES ('pv_trg', ?, '{}', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 10. assumptions
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO assumptions (id, user_id, name, assumption_type, value_json, created_at, updated_at) VALUES ('as_trg', ?, 'inflation', 'inflation', '{}', '2026-09-14', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 11. saved_calculator_results
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO saved_calculator_results (id, user_id, calculator_slug, calculator_title, calculator_category, calculator_region, currency, destination_type, conversion_route, conversion_label, input_json, result_json, created_at, updated_at) VALUES ('scr_trg', ?, 'fire-calc', 'FIRE Calc', 'fire', 'us', 'USD', 'plan', '/plan', 'Save to Plan', '{}', '{}', '2026-09-14', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 12. balance_imports
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO balance_imports (id, user_id, file_name, source_hash, total_rows, imported_rows, duplicate_rows, error_rows, created_at) VALUES ('bi_trg', ?, 'f.csv', 'hash1', 1, 1, 0, 0, '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 13. transaction_imports
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO transaction_imports (id, user_id, file_name, source_hash, total_rows, imported_rows, duplicate_rows, error_rows, created_at) VALUES ('ti_trg', ?, 'f.csv', 'hash2', 1, 1, 0, 0, '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 14. audit_log
    expect(() =>
      h.raw
        .prepare(
          "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, created_at) VALUES ('al_trg', ?, 'DELETE', 'user', 'u', '2026-09-14')"
        )
        .run(tombstonedUser)
    ).toThrow(/USER_DELETED/);

    // 15. users resurrection trigger
    expect(() =>
      h.raw.prepare('UPDATE users SET deleted_at = NULL WHERE id = ?').run(tombstonedUser)
    ).toThrow(/USER_DELETED/);
  });

  it('HTTP deletion handler deletes uninitialized user and blocks delayed API creation with HTTP 410', async () => {
    const h = createD1TestHarness();
    const userId = 'uninitialized_api_user';

    // Mock Clerk authentication session for this user
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      ok: true,
      auth: {
        userId,
        sessionId: `sess_${userId}`,
        sessionClaims: { sub: userId }
      } as any
    });

    // 1. Invoke actual DELETE /api/account-data handler
    const deleteRequest = new Request('http://localhost/api/account-data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE MY FINPATH DATA' })
    });

    const deleteRes = await invokeApi(deleteAccountDataHandler, deleteRequest, { DB: h.db });
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deletion.localAccountDataDeleted).toBe(true);
    expect(deleteRes.body.identity.provider).toBe('clerk');

    // Tombstone must be in users
    expect(h.getUserRows('users', userId)).toHaveLength(1);
    expect(h.getUserRows('users', userId)[0].deleted_at).toBeTruthy();

    // 2. Subsequent attempt to create account via POST /api/accounts must return HTTP 410 Gone
    const createAccountRequest = new Request('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delayed Account',
        accountType: 'savings',
        currency: 'USD'
      })
    });

    const createRes = await invokeApi(createAccountHandler, createAccountRequest, { DB: h.db });
    expect(createRes.status).toBe(410);
    expect(createRes.body.code).toBe('ACCOUNT_DELETED');

    // Verify 0 rows in financial_accounts
    expect(h.getUserRows('financial_accounts', userId)).toHaveLength(0);
  });
});
