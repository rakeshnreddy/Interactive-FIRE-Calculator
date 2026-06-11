-- Migration number: 0001 	 2026-06-11T15:33:24.550Z

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'clerk',
  provider_user_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  household_name TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  birth_year INTEGER,
  target_retirement_age INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(default_currency) = 3),
  CHECK (birth_year IS NULL OR (birth_year BETWEEN 1900 AND 2200)),
  CHECK (target_retirement_age IS NULL OR (target_retirement_age BETWEEN 18 AND 100))
);

CREATE TABLE financial_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  institution_name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (account_type IN ('cash', 'checking', 'savings', 'investment', 'retirement', 'credit', 'loan', 'mortgage', 'real_estate', 'other_asset', 'other_liability')),
  CHECK (is_active IN (0, 1)),
  CHECK (length(currency) = 3)
);

CREATE INDEX idx_financial_accounts_user_id ON financial_accounts(user_id);

CREATE TABLE account_balances (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  balance_date TEXT NOT NULL,
  balance_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_account_balances_account_date ON account_balances(account_id, balance_date DESC);
CREATE INDEX idx_account_balances_user_date ON account_balances(user_id, balance_date DESC);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT,
  transaction_date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT,
  transaction_type TEXT NOT NULL DEFAULT 'expense',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL,
  CHECK (transaction_type IN ('income', 'expense', 'transfer', 'adjustment'))
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account_date ON transactions(account_id, transaction_date DESC);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  target_amount_cents INTEGER,
  current_amount_cents INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (goal_type IN ('retirement', 'emergency_fund', 'debt_payoff', 'home', 'education', 'travel', 'custom')),
  CHECK (status IN ('active', 'paused', 'completed', 'archived'))
);

CREATE INDEX idx_goals_user_status ON goals(user_id, status);

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL,
  CHECK (plan_type IN ('fire', 'retirement_income', 'debt_payoff', 'savings_goal', 'custom')),
  CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE INDEX idx_plans_user_status ON plans(user_id, status);
CREATE INDEX idx_plans_goal_id ON plans(goal_id);

CREATE TABLE plan_versions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  label TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (plan_id, version_number)
);

CREATE INDEX idx_plan_versions_plan ON plan_versions(plan_id, version_number DESC);
CREATE INDEX idx_plan_versions_user ON plan_versions(user_id, created_at DESC);

CREATE TABLE fire_plan_inputs (
  plan_version_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  input_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_version_id) REFERENCES plan_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (json_valid(input_json))
);

CREATE TABLE fire_plan_results (
  plan_version_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_version_id) REFERENCES plan_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (json_valid(result_json))
);

CREATE TABLE assumptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  assumption_type TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (json_valid(value_json))
);

CREATE INDEX idx_assumptions_user_type ON assumptions(user_id, assumption_type);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (metadata_json IS NULL OR json_valid(metadata_json))
);

CREATE INDEX idx_audit_log_user_created ON audit_log(user_id, created_at DESC);
