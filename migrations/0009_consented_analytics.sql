-- Migration number: 0009 	 2026-09-26T00:00:00.000Z
-- B12: consented, first-party product measurement. Additive only.
-- analytics_consent is the only table linked to a user; events and cohorts carry a random
-- pseudonym. Revocation or account deletion removes all three for that user.

PRAGMA foreign_keys = ON;

CREATE TABLE analytics_consent (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL UNIQUE,
  consent_version TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE analytics_events (
  event_id TEXT PRIMARY KEY,
  pseudonym TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  occurred_day TEXT NOT NULL,
  release TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  props_json TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX idx_analytics_events_pseudonym_day ON analytics_events(pseudonym, occurred_day);
CREATE INDEX idx_analytics_events_received ON analytics_events(received_at);

CREATE TABLE analytics_cohorts (
  pseudonym TEXT PRIMARY KEY,
  activation_day TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'monthly',
  last_review_day TEXT,
  w1 INTEGER NOT NULL DEFAULT 0,
  m1 INTEGER NOT NULL DEFAULT 0,
  m3 INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS trg_prevent_analytics_consent_tombstone_insert
BEFORE INSERT ON analytics_consent
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert analytics_consent for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_analytics_consent_tombstone_update
BEFORE UPDATE ON analytics_consent
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot update analytics_consent for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;
