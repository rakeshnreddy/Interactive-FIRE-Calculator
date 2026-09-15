# Migration 0006 Authorization & Deployment Packet

**Target Database**: `finpath-preview`  
**Database UUID**: `0dbad68e-7493-452f-8504-98d4c61ee5da`  
**Migration File**: `migrations/0006_user_tombstone_triggers.sql`  
**Status**: **BLOCKED — PENDING EXPLICIT OWNER AUTHORIZATION**  
*(Zero remote migrations have been executed. All verification performed strictly against local disposable SQLite D1 harnesses.)*

---

## 1. Overview & Purpose

Migration `0006_user_tombstone_triggers.sql` installs physical database-level mutation guards across all 14 child tables in FinPath95. It guarantees that even under extreme concurrency, delayed write replays, or race conditions between profile creation and account deletion, no record can ever be committed for a user whose `deleted_at` timestamp is set in `users`.

---

## 2. Remote Target & Baseline State

- **Target Preview D1 Database**: `finpath-preview` (`0dbad68e-7493-452f-8504-98d4c61ee5da`)
- **Isolation Boundary**: Cloudflare Pages preview binding verified isolated from production (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`) in Task B33.
- **Current Remote State**: 18 tables present (15 data tables, `d1_migrations`, 2 SQLite system tables).
- **Prerequisite Migrations**:
  - `0001_initial_financial_platform_schema.sql` (Applied)
  - `0002_balance_import_history.sql` (Applied)
  - `0003_transaction_import_history.sql` (Applied)
  - `0004_saved_calculator_results.sql` (Applied)
  - `0005_saved_calculator_idempotency.sql` (Local verified)

---

## 3. Trigger Inventory (29 Triggers Total)

Each child table receives both a `BEFORE INSERT` and a `BEFORE UPDATE` trigger that evaluates:
```sql
SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert/update <table_name> for deleted user')
WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
```

### Table Matrix:
1. `user_profiles`: `trg_prevent_user_profiles_tombstone_insert`, `trg_prevent_user_profiles_tombstone_update`
2. `financial_accounts`: `trg_prevent_financial_accounts_tombstone_insert`, `trg_prevent_financial_accounts_tombstone_update`
3. `account_balances`: `trg_prevent_account_balances_tombstone_insert`, `trg_prevent_account_balances_tombstone_update`
4. `transactions`: `trg_prevent_transactions_tombstone_insert`, `trg_prevent_transactions_tombstone_update`
5. `goals`: `trg_prevent_goals_tombstone_insert`, `trg_prevent_goals_tombstone_update`
6. `plans`: `trg_prevent_plans_tombstone_insert`, `trg_prevent_plans_tombstone_update`
7. `plan_versions`: `trg_prevent_plan_versions_tombstone_insert`, `trg_prevent_plan_versions_tombstone_update`
8. `fire_plan_inputs`: `trg_prevent_fire_plan_inputs_tombstone_insert`, `trg_prevent_fire_plan_inputs_tombstone_update`
9. `fire_plan_results`: `trg_prevent_fire_plan_results_tombstone_insert`, `trg_prevent_fire_plan_results_tombstone_update`
10. `assumptions`: `trg_prevent_assumptions_tombstone_insert`, `trg_prevent_assumptions_tombstone_update`
11. `saved_calculator_results`: `trg_prevent_saved_calculator_results_tombstone_insert`, `trg_prevent_saved_calculator_results_tombstone_update`
12. `balance_imports`: `trg_prevent_balance_imports_tombstone_insert`, `trg_prevent_balance_imports_tombstone_update`
13. `transaction_imports`: `trg_prevent_transaction_imports_tombstone_insert`, `trg_prevent_transaction_imports_tombstone_update`
14. `audit_log`: `trg_prevent_audit_log_tombstone_insert`, `trg_prevent_audit_log_tombstone_update`
15. `users` (Resurrection Guard): `trg_prevent_users_tombstone_resurrect`
    ```sql
    CREATE TRIGGER IF NOT EXISTS trg_prevent_users_tombstone_resurrect
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'USER_DELETED: Cannot resurrect deleted user');
    END;
    ```

---

## 4. Execution Command (Upon Owner Authorization Only)

```bash
# Verify identity first
npx wrangler d1 info 0dbad68e-7493-452f-8504-98d4c61ee5da

# Apply migration 0006 to isolated preview D1
npx wrangler d1 execute 0dbad68e-7493-452f-8504-98d4c61ee5da --remote --file=./migrations/0006_user_tombstone_triggers.sql
```

---

## 5. Post-Deployment Validation Queries

```sql
-- 1. Verify all 29 triggers installed
SELECT COUNT(*) as trigger_count FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_prevent_%';
-- Expected: 29

-- 2. Verify resurrection guard trigger exists
SELECT name, tbl_name FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_prevent_users_tombstone_resurrect';
-- Expected: 1 row
```

---

## 6. Safe Rollback Plan

If rollback is necessary:
1. Triggers are purely additive constraint checks and do not alter existing table structures or stored column values.
2. Dropping triggers retains all data and leaves existing `deleted_at` tombstones intact:
```sql
DROP TRIGGER IF EXISTS trg_prevent_user_profiles_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_user_profiles_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_financial_accounts_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_financial_accounts_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_account_balances_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_account_balances_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_transactions_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_transactions_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_goals_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_goals_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_plans_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_plans_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_plan_versions_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_plan_versions_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_fire_plan_inputs_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_fire_plan_inputs_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_fire_plan_results_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_fire_plan_results_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_assumptions_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_assumptions_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_saved_calculator_results_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_saved_calculator_results_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_balance_imports_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_balance_imports_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_transaction_imports_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_transaction_imports_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_audit_log_tombstone_insert;
DROP TRIGGER IF EXISTS trg_prevent_audit_log_tombstone_update;
DROP TRIGGER IF EXISTS trg_prevent_users_tombstone_resurrect;
```
3. Application-level guards in `functions/_lib/persistence.ts` (`UserDeletedError`) and `ensureUserProfile` continue to block deleted users independently even in the event of trigger rollback.
