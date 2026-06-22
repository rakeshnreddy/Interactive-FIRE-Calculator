-- Migration number: 0002 	 2026-06-22T18:00:00.000Z

PRAGMA foreign_keys = ON;

CREATE TABLE balance_imports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  imported_rows INTEGER NOT NULL,
  duplicate_rows INTEGER NOT NULL,
  error_rows INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, source_hash),
  CHECK (total_rows >= 0),
  CHECK (imported_rows >= 0),
  CHECK (duplicate_rows >= 0),
  CHECK (error_rows >= 0)
);

CREATE INDEX idx_balance_imports_user_created
  ON balance_imports(user_id, created_at DESC);
