-- Migration number: 0005 	 2026-09-11T12:00:00.000Z

PRAGMA foreign_keys = ON;

ALTER TABLE saved_calculator_results ADD COLUMN idempotency_key TEXT;
ALTER TABLE saved_calculator_results ADD COLUMN payload_hash TEXT;

CREATE UNIQUE INDEX idx_saved_calculator_results_user_idempotency
  ON saved_calculator_results(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
