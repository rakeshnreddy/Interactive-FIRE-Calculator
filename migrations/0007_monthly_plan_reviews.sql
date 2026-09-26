-- Migration number: 0007 	 2026-09-17T03:00:00.000Z

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS plan_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_version_number INTEGER NOT NULL,
  evidence_date TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('keep', 'revise', 'defer')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'deferred')),
  notes TEXT,
  completed_at TEXT,
  deferred_until TEXT,
  next_review_due TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_reviews_user_plan ON plan_reviews(user_id, plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_reviews_due ON plan_reviews(user_id, next_review_due ASC);
CREATE INDEX IF NOT EXISTS idx_plan_reviews_idempotency ON plan_reviews(user_id, plan_id, plan_version_number, evidence_date);

-- Active-user tombstone protection triggers (matching migration 0006)
CREATE TRIGGER IF NOT EXISTS trg_prevent_plan_reviews_tombstone_insert
BEFORE INSERT ON plan_reviews
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert plan_reviews for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_plan_reviews_tombstone_update
BEFORE UPDATE ON plan_reviews
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update plan_reviews for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;
