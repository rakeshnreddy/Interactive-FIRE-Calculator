-- Migration number: 0004 	 2026-07-10T12:00:00.000Z

PRAGMA foreign_keys = ON;

CREATE TABLE saved_calculator_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calculator_slug TEXT NOT NULL,
  calculator_title TEXT NOT NULL,
  calculator_category TEXT NOT NULL,
  calculator_region TEXT NOT NULL,
  currency TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  conversion_route TEXT NOT NULL,
  conversion_label TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_entity_type TEXT,
  created_entity_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(currency) = 3),
  CHECK (destination_type IN ('goal', 'account', 'plan', 'transaction')),
  CHECK (created_entity_type IS NULL OR created_entity_type IN ('goal', 'account', 'plan', 'transaction')),
  CHECK (json_valid(input_json)),
  CHECK (json_valid(result_json))
);

CREATE INDEX idx_saved_calculator_results_user_created
  ON saved_calculator_results(user_id, created_at DESC);

CREATE INDEX idx_saved_calculator_results_user_destination
  ON saved_calculator_results(user_id, destination_type, created_at DESC);
