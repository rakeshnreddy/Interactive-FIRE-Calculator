# Corrective Migration 0008: Plan Reviews Idempotency & Database Uniqueness

- **Migration File**: `migrations/0008_plan_reviews_idempotency.sql`
- **Target Table**: `plan_reviews`
- **Target Database**: `finpath-preview` (`0dbad68e-7493-452f-8504-98d4c61ee5da`)
- **Safety**: Fully additive, zero destructive drops, deterministic duplicate handling.

---

## 1. Problem Addressed

Migration `0007_monthly_plan_reviews.sql` established the `plan_reviews` table but created a non-unique index on `idx_plan_reviews_idempotency (user_id, plan_id, plan_version_number, evidence_date)`. This allowed concurrent requests to race and insert duplicate review records, violating atomic idempotency. Furthermore, changing review choices or parameters on repeat requests was ignored without proper conflict detection.

## 2. Corrective Schema Design

1. **Additive Columns**:
   - `idempotency_key TEXT`: Scoped unique submission or cycle key.
   - `payload_hash TEXT`: SHA-256 hash of the review intent (`decision`, `planVersionNumber`, `deferDays`, `notes`).
2. **Deterministic Historical Backfill**:
   - For any pre-existing rows where `idempotency_key IS NULL`, sets `idempotency_key = id` and `payload_hash = 'legacy'`.
   - Preserves all historical records without dropping or mutating user data.
3. **Index Replacement**:
   - Drops non-unique index `idx_plan_reviews_idempotency`.
   - Creates `CREATE UNIQUE INDEX idx_plan_reviews_user_plan_idempotency ON plan_reviews(user_id, plan_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.
4. **Behavioral Contract**:
   - **Exact Replay**: Submitting identical payload with the same idempotency key returns the existing record with `isDuplicate: true` and HTTP 200.
   - **Conflicting Intent**: Submitting a different decision or modified payload with the same idempotency key returns HTTP 409 Conflict with code `IDEMPOTENCY_CONFLICT` and includes the existing review.
   - **Concurrency Safety**: Concurrent insert races are caught by the SQLite UNIQUE constraint, safely re-routing the losing request to the atomic replay/conflict handler.

---

## 3. Rollback & Recovery Plan

If migration fails or requires reversal:
```sql
DROP INDEX IF EXISTS idx_plan_reviews_user_plan_idempotency;
CREATE INDEX IF NOT EXISTS idx_plan_reviews_idempotency ON plan_reviews(user_id, plan_id, plan_version_number, evidence_date);
-- Columns idempotency_key and payload_hash can remain as harmless nullable columns without impacting legacy functionality.
```
No table recreation or data loss occurs.
