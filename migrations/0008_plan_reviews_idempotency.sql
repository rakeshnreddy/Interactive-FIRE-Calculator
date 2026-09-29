-- Migration number: 0008 	 2026-09-17T20:30:00.000Z

PRAGMA foreign_keys = ON;

-- 1. Add idempotency_key and payload_hash columns to plan_reviews
ALTER TABLE plan_reviews ADD COLUMN idempotency_key TEXT;
ALTER TABLE plan_reviews ADD COLUMN payload_hash TEXT;

-- 2. Deterministic backfill for historical rows: preserve audit history by assigning review id as key
UPDATE plan_reviews
SET idempotency_key = id,
    payload_hash = 'legacy'
WHERE idempotency_key IS NULL;

-- 3. Drop legacy non-unique index from migration 0007
DROP INDEX IF EXISTS idx_plan_reviews_idempotency;

-- 4. Create database-enforced UNIQUE index on (user_id, plan_id, idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_reviews_user_plan_idempotency
  ON plan_reviews(user_id, plan_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
