-- Migration number: 0006 	 2026-09-14T20:00:00.000Z

PRAGMA foreign_keys = ON;

-- Enforce active-user condition at database mutation boundary across all user-owned tables
-- Any attempt to insert or update rows for a tombstoned (deleted) user is aborted immediately.

-- 1. user_profiles
CREATE TRIGGER IF NOT EXISTS trg_prevent_user_profiles_tombstone_insert
BEFORE INSERT ON user_profiles
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert user_profiles for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_user_profiles_tombstone_update
BEFORE UPDATE ON user_profiles
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update user_profiles for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 2. financial_accounts
CREATE TRIGGER IF NOT EXISTS trg_prevent_financial_accounts_tombstone_insert
BEFORE INSERT ON financial_accounts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert financial_accounts for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_financial_accounts_tombstone_update
BEFORE UPDATE ON financial_accounts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update financial_accounts for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 3. account_balances
CREATE TRIGGER IF NOT EXISTS trg_prevent_account_balances_tombstone_insert
BEFORE INSERT ON account_balances
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert account_balances for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_account_balances_tombstone_update
BEFORE UPDATE ON account_balances
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update account_balances for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 4. transactions
CREATE TRIGGER IF NOT EXISTS trg_prevent_transactions_tombstone_insert
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert transactions for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_transactions_tombstone_update
BEFORE UPDATE ON transactions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update transactions for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 5. goals
CREATE TRIGGER IF NOT EXISTS trg_prevent_goals_tombstone_insert
BEFORE INSERT ON goals
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert goals for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_goals_tombstone_update
BEFORE UPDATE ON goals
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update goals for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 6. plans
CREATE TRIGGER IF NOT EXISTS trg_prevent_plans_tombstone_insert
BEFORE INSERT ON plans
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert plans for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_plans_tombstone_update
BEFORE UPDATE ON plans
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update plans for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 7. plan_versions
CREATE TRIGGER IF NOT EXISTS trg_prevent_plan_versions_tombstone_insert
BEFORE INSERT ON plan_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert plan_versions for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_plan_versions_tombstone_update
BEFORE UPDATE ON plan_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update plan_versions for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 8. fire_plan_inputs
CREATE TRIGGER IF NOT EXISTS trg_prevent_fire_plan_inputs_tombstone_insert
BEFORE INSERT ON fire_plan_inputs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert fire_plan_inputs for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_fire_plan_inputs_tombstone_update
BEFORE UPDATE ON fire_plan_inputs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update fire_plan_inputs for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 9. fire_plan_results
CREATE TRIGGER IF NOT EXISTS trg_prevent_fire_plan_results_tombstone_insert
BEFORE INSERT ON fire_plan_results
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert fire_plan_results for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_fire_plan_results_tombstone_update
BEFORE UPDATE ON fire_plan_results
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update fire_plan_results for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 10. assumptions
CREATE TRIGGER IF NOT EXISTS trg_prevent_assumptions_tombstone_insert
BEFORE INSERT ON assumptions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert assumptions for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_assumptions_tombstone_update
BEFORE UPDATE ON assumptions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update assumptions for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 11. saved_calculator_results
CREATE TRIGGER IF NOT EXISTS trg_prevent_saved_calculator_results_tombstone_insert
BEFORE INSERT ON saved_calculator_results
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert saved_calculator_results for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_saved_calculator_results_tombstone_update
BEFORE UPDATE ON saved_calculator_results
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update saved_calculator_results for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 12. balance_imports
CREATE TRIGGER IF NOT EXISTS trg_prevent_balance_imports_tombstone_insert
BEFORE INSERT ON balance_imports
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert balance_imports for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_balance_imports_tombstone_update
BEFORE UPDATE ON balance_imports
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update balance_imports for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 13. transaction_imports
CREATE TRIGGER IF NOT EXISTS trg_prevent_transaction_imports_tombstone_insert
BEFORE INSERT ON transaction_imports
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert transaction_imports for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_transaction_imports_tombstone_update
BEFORE UPDATE ON transaction_imports
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update transaction_imports for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 14. audit_log
CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_tombstone_insert
BEFORE INSERT ON audit_log
FOR EACH ROW
WHEN NEW.user_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert audit_log for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_tombstone_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
WHEN NEW.user_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update audit_log for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

-- 15. users resurrection guard
CREATE TRIGGER IF NOT EXISTS trg_prevent_users_tombstone_resurrect
BEFORE UPDATE ON users
FOR EACH ROW
WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot resurrect deleted user');
END;

