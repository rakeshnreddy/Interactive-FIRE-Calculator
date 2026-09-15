# Data Deletion, Export, and Recovery Contract

## 1. Overview & Purpose

This document establishes the verified technical contract, architectural boundaries, fail-closed concurrency guarantees, client-side draft cleanup protocols, and disaster recovery runbooks for user account deletion and data export in FinPath95.

In accordance with Checkpoint **C06** (Task **B07**), this contract defines:
1. Exact architectural boundary mapping: what deletion does and does not erase.
2. In-flight and delayed write protections enforced at the database mutation boundary via SQLite triggers.
3. Client-side local draft clearance behavior and error isolation.
4. Single-transaction atomic snapshot policy for data export.
5. Operational Disaster Recovery (DR) runbook and tombstone replay protocol, including mandatory fail-closed serving gates.

---

## 2. True Erasure & Architectural Boundary Mapping

FinPath95 spans distinct operational boundaries. Deletion within the application database executes hard deletions across all user-owned data rows, but does not automatically cascade across external third-party identity and infrastructure boundaries:

| Boundary | Storage Layer | What Is Erased | What Is NOT Erased | Notes / Guarantees |
| :--- | :--- | :--- | :--- | :--- |
| **D1 Database (Child Tables)** | Cloudflare D1 (SQLite) | **100% hard-deleted** across all 14 child tables: `user_profiles`, `financial_accounts`, `account_balances`, `transactions`, `goals`, `plans`, `plan_versions`, `fire_plan_inputs`, `fire_plan_results`, `assumptions`, `audit_log`, `balance_imports`, `transaction_imports`, `saved_calculator_results`. | Nothing retained in child tables. | Executed inside a single atomic batch transaction via `deleteAccountData()`. |
| **D1 Database (User Table)** | Cloudflare D1 (SQLite) | User record is **tombstoned**, not deleted. `deleted_at` timestamp is set; `updated_at` updated. | User ID string and `deleted_at` timestamp remain in `users` table. | Required to reject delayed/in-flight writes, enforce triggers, and reject re-registration races. |
| **Clerk Identity Provider** | Clerk Cloud Auth | **Nothing erased by D1 deletion**. User identity, OAuth links, email, and credentials remain in Clerk. | Entire Clerk User object and active session JWTs. | IDP lifecycle is decoupled. Deleting FinPath data does not delete the user's Clerk credentials or account. |
| **Browser Storage** | `window.localStorage` | Financial form drafts (`finpath.*`, `firecalc.*`, `fire_calc_*`) are explicitly purged via `clearLocalDrafts()`. | Display preferences (`finpath.colorMode`) and third-party/unrelated keys. | Scoped to avoid clearing unrelated site data on shared devices. Tolerates restricted storage environments without failing deletion. |
| **Backups & Snapshots** | Cloudflare D1 Automated Backups | **Nothing erased**. Point-in-time snapshots retain pre-deletion database state until backup expiration. | Historical database records. | Restoring a backup requires executing the **Tombstone Replay Runbook** (§6) before serving live traffic. |
| **HTTP Edge Logs** | Cloudflare Logs / Analytics Engine | Logs are not modified. | Standard edge request metadata (IP, user agent, URL, HTTP status) for Cloudflare log retention window. | No financial payload data or request bodies are logged. |

> [!IMPORTANT]
> **Truthful Erasure Disclosure**: We do **not** claim that clicking "Delete Account" deletes external Clerk identity records, clears server access logs, or retroactively purges historical provider backup archives. It hard-purges all financial records from the active operational database, installs a durable tombstone, and purges client drafts.

---

## 3. In-Flight, Delayed, and Retried Writes Protection

### 3.1 The Concurrency & Resurrection Threat
An offline client, queued service worker, or in-flight API request could arrive *after* `deleteAccountData()` has committed or interleaved between profile check and table insert. Without database-level mutation boundaries, such writes would resurrect the user or insert orphan financial records.

### 3.2 Database-Level Mutation Boundary (SQLite Triggers)
Protection is enforced directly at the database engine boundary via SQLite `BEFORE INSERT` and `BEFORE UPDATE` triggers in migration `0006_user_tombstone_triggers.sql`. Triggers are installed across all 14 child tables:
```sql
CREATE TRIGGER trg_prevent_financial_accounts_tombstone_insert
BEFORE INSERT ON financial_accounts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot insert financial_accounts for deleted user')
  WHERE (SELECT deleted_at FROM users WHERE id = NEW.user_id) IS NOT NULL;
END;
```

A companion resurrection trigger on `users` prevents clearing `deleted_at`:
```sql
CREATE TRIGGER trg_prevent_users_tombstone_resurrect
BEFORE UPDATE ON users
FOR EACH ROW
WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL
BEGIN
  SELECT RAISE(ABORT, 'USER_DELETED: Cannot resurrect deleted user');
END;
```

### 3.3 HTTP Mapping
When an operation attempts to write to a tombstoned account or encounters a `USER_DELETED` trigger abort, `functions/_lib/persistence.ts` catches the condition and throws `UserDeletedError`. `handleApiError` maps this to **HTTP 410 Gone**:
```json
{
  "error": "Account has been deleted",
  "code": "ACCOUNT_DELETED"
}
```

### 3.4 Offline Replay / UPSERT Guard
User profile syncs use `INSERT INTO users ... ON CONFLICT(id) DO UPDATE`. To prevent delayed profile syncs or auth handshakes from clearing the tombstone, the conflict clause contains a strict conditional guard:
```sql
ON CONFLICT(id) DO UPDATE SET
  updated_at = excluded.updated_at
WHERE users.deleted_at IS NULL
```
If `users.deleted_at IS NOT NULL`, the update matches 0 rows and leaves `deleted_at` intact.

---

## 4. Client-Side Draft Clearing Policy

When a user initiates account deletion, client-side drafts are cleared via `clearLocalDrafts()` in `src/App.tsx`:
- **Purged Keys**: Any key matching `finpath.` (except `finpath.colorMode`) or `firecalc.` / `fire_calc_`.
- **Preserved Keys**: `finpath.colorMode` (theme preference is non-financial and preserved for UX continuity), plus all keys from other origins or libraries.
- **Environment Isolation**: The cleanup routine wraps `window.localStorage` interactions inside a defensive `try / catch` block. If `localStorage` access is blocked (e.g. strict browser privacy modes, throwing getters, or non-browser environments), the failure is logged and does not cause the server deletion result to report false failure.

---

## 5. Export Consistency Policy

The export endpoint (`/api/account-data/export`) provides full data portability:
1. **Single-Transaction Atomic Snapshot**: All table reads across `users`, `user_profiles`, and the 13 financial and planning data tables are executed inside a single atomic `database.batch(...)` transaction. This guarantees that exported data reflects one coherent point-in-time revision without tearing or interleaving updates.
2. **Post-Batch Active Verification**: The batch result includes a read of `users.deleted_at`. If `deleted_at` is set, the export fails closed and throws `UserDeletedError`, returning **HTTP 410 Gone** rather than returning partial or stale pre-deletion data.
3. **Format**: Returns structured JSON with schema version, generation timestamp, and entity summaries.

---

## 6. Disaster Recovery & Tombstone Replay Runbook

### 6.1 The Resurrection Vulnerability
When disaster recovery restores a database snapshot taken at time $T_{snapshot} < T_{deletion}$, all deleted accounts and child rows are restored to their active state at $T_{snapshot}$, and the user's tombstone is reverted to active (`deleted_at = NULL`).

### 6.2 Cloudflare D1 Architecture & Absence of Native Streaming CDC
> [!WARNING]
> **Operational Reality**: Cloudflare D1 does **not** provide built-in automated Change Data Capture (CDC) streaming, automated offsite write-ahead log replication, or external append-only event streams. Tombstones do not automatically survive a raw point-in-time database snapshot restore without explicit operational replay.

### 6.3 Mandatory Fail-Closed Serving Rule
If an authoritative tombstone record is missing, incomplete, or unverified following a point-in-time restore:
**LIVE SERVING MUST REMAIN BLOCKED**.
Under no circumstances may public routes or authenticated traffic be connected to a restored database instance before tombstone reconciliation has completed and passed verification.

### 6.4 The Replay Mechanism (`replayTombstones`)
FinPath95 provides `replayTombstones(database, tombstones)` in `functions/_lib/accountData.ts`. It takes a list of tombstone entries `[{ userId, deletedAt }]` and idempotently:
1. Issues `DELETE FROM <table_name> WHERE user_id = ?` for all 14 child tables.
2. Applies an upsert to `users`:
   ```sql
   INSERT INTO users (id, provider, provider_user_id, created_at, updated_at, deleted_at)
   VALUES (?, 'clerk', ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET
     deleted_at = excluded.deleted_at,
     updated_at = excluded.updated_at
   ```
   This handles both:
   - Users present in the restored backup (restores their tombstone and deletes child rows).
   - Users created and deleted *after* the snapshot was taken (inserts a pre-tombstoned user record so they cannot register or write as active users).

### 6.5 Disaster Recovery Step-by-Step Runbook

Before pointing live application traffic or Cloudflare Pages routes to a restored D1 database:

1. **Step 1: Freeze Traffic / Block Serving**
   Ensure maintenance mode is active at the edge (or Cloudflare Pages custom routing is disabled). No incoming traffic must reach the restored database.

2. **Step 2: Obtain Authoritative Tombstone List**
   Extract the list of all users deleted between $T_{snapshot}$ and the disaster event from the authoritative operational log (e.g. disaster incident log, application telemetry events, or support escalation audit trail):
   ```json
   [
     { "userId": "user_synthetic_alice_a", "deletedAt": "2026-09-14T10:00:00.000Z" }
   ]
   ```
   *Gate check*: If completeness of this list cannot be established, **STOP**. Live serving remains BLOCKED until data reconciliation is performed and approved.

3. **Step 3: Perform Snapshot Restore**
   Restore the Cloudflare D1 snapshot to the designated staging or recovery database instance using standard Cloudflare CLI / Dashboard tooling.

4. **Step 4: Execute Tombstone Replay**
   Execute the reconciliation script calling `replayTombstones(db, tombstoneList)`.

5. **Step 5: Execute 14-Child-Table Verification Query**
   For every tombstoned user ID, execute the full child table query:
   ```sql
   SELECT (
     (SELECT count(*) FROM user_profiles WHERE user_id = ?) +
     (SELECT count(*) FROM financial_accounts WHERE user_id = ?) +
     (SELECT count(*) FROM account_balances WHERE user_id = ?) +
     (SELECT count(*) FROM transactions WHERE user_id = ?) +
     (SELECT count(*) FROM goals WHERE user_id = ?) +
     (SELECT count(*) FROM plans WHERE user_id = ?) +
     (SELECT count(*) FROM plan_versions WHERE user_id = ?) +
     (SELECT count(*) FROM fire_plan_inputs WHERE user_id = ?) +
     (SELECT count(*) FROM fire_plan_results WHERE user_id = ?) +
     (SELECT count(*) FROM assumptions WHERE user_id = ?) +
     (SELECT count(*) FROM audit_log WHERE user_id = ?) +
     (SELECT count(*) FROM balance_imports WHERE user_id = ?) +
     (SELECT count(*) FROM transaction_imports WHERE user_id = ?) +
     (SELECT count(*) FROM saved_calculator_results WHERE user_id = ?)
   ) AS remaining_rows;
   ```
   Assert `remaining_rows == 0`.
   Query `SELECT deleted_at FROM users WHERE id = ?;` and assert `deleted_at IS NOT NULL`.

6. **Step 6: Verify Neighbor Tenant Isolation**
   Verify that active users who were not deleted (User B) retain all their records and active status without loss.

7. **Step 7: Unblock Serving**
   Re-enable live edge routing and verify application health.

---

## 7. Statutory & Legal Retention Policy Quarantine

Certain statutory frameworks (e.g. tax reporting, AML regulations) may require retaining specific financial records for 5–7 years, which creates legal tension with consumer right-to-be-forgotten requests.
- **Implemented Technical Behavior**: FinPath95 implements immediate hard deletion of all child financial records from D1 and installs durable tombstones upon user request.
- **Quarantined Legal Scope**: Any long-term legal retention policy, selective escrow archive, or statutory data retention exception is quarantined pending explicit legal counsel and product owner approval. No unreviewed background archiving or undeclared retention is implemented.

