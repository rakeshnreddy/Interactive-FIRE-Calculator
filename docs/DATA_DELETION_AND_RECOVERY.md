# Data Deletion, Export, and Recovery Contract

## 1. Overview & Purpose

This document establishes the precise technical boundaries, failure modes, client draft cleanup protocols, and disaster recovery runbooks for user account deletion and data export in FinPath95.

In accordance with Task **B07** of Checkpoint **C06**, this contract defines:
1. What data deletion **does** and **does not** erase across architectural boundaries.
2. In-flight and delayed write protections via fail-closed tombstones.
3. Client-side local draft clearance behavior.
4. Export consistency snapshot policies.
5. The Disaster Recovery (DR) Tombstone Replay runbook to prevent data resurrection during database restores.

---

## 2. True Erasure & Architectural Boundary Mapping

FinPath95 spans four distinct operational boundaries. Deletion within the application database does not automatically cascade across all external third-party boundaries:

| Boundary | Storage Layer | What Is Erased | What Is NOT Erased | Notes / Guarantees |
| :--- | :--- | :--- | :--- | :--- |
| **D1 Database (Child Tables)** | Cloudflare D1 (SQLite) | **100% hard-deleted** across all 14 child tables: `accounts`, `account_balances`, `transactions`, `transaction_splits`, `transaction_rules`, `import_staging_rows`, `import_audit_logs`, `plaid_sync_cursor`, `goals`, `plans`, `plan_versions`, `calculator_results`, `saved_charts`, `audit_events`. | Nothing retained in child tables. | Enforced in a single atomic transaction via `deleteAccountData()`. |
| **D1 Database (User Table)** | Cloudflare D1 (SQLite) | User record is **tombstoned**, not deleted. `deleted_at` timestamp is set; `updated_at` updated. | User ID string and `deleted_at` timestamp remain in `users` table. | Required to reject delayed/inflight writes and preserve deletion state. |
| **Clerk Identity Provider** | Clerk Cloud Auth | **Nothing erased by D1 deletion**. User identity, OAuth links, email, and credentials remain in Clerk. | Entire Clerk User Object and active session JWTs. | IDP lifecycle is decoupled. Clerk account deletion must be initiated via Clerk SDK/API or Dashboard by user or owner. |
| **Browser Storage** | `window.localStorage` | Financial form drafts (`finpath.*`, `firecalc.*`, `fire_calc_*`) are explicitly purged via `clearLocalDrafts()`. | Display preferences (`finpath.colorMode`) and third-party storage keys. | Scoped to avoid clearing unrelated site data on shared devices. |
| **Backups & Snapshots** | Cloudflare D1 Automated Backups | **Nothing erased**. Point-in-time snapshots retain pre-deletion database state until backup expiration. | Historical database records. | Restoring a backup requires executing the **Tombstone Replay Runbook** (§5) before serving live traffic. |
| **HTTP Edge Logs** | Cloudflare Logs / Analytics Engine | Logs are not modified. | Standard edge request metadata (IP, user agent, URL, HTTP status) for Cloudflare log retention window. | No financial payload data or request bodies are logged. |

> [!IMPORTANT]
> **Truthful Erasure Disclosure**: We do **not** claim that clicking "Delete Account" deletes external Clerk identity records or retroactively purges historical provider backup archives. It hard-purges all financial records from the active operational database, installs a durable tombstone, and purges client drafts.

---

## 3. In-Flight, Delayed, and Retried Writes Protection

### 3.1 The Delayed Write Threat
An offline client, queued service worker, or in-flight API request could arrive *after* `deleteAccountData()` has committed. Without tombstone checks, such writes would resurrect the user or insert orphan financial records.

### 3.2 Server-Side Guards
Every operational endpoint in `functions/api/` invokes `assertUserNotDeleted(database, userId)` via `persistence.ts`:
```sql
SELECT deleted_at FROM users WHERE id = ?
```
If `deleted_at IS NOT NULL`, the operation immediately throws `UserDeletedError`, and `handleApiError` maps this to **HTTP 410 Gone**:
```json
{
  "error": "Account has been deleted",
  "code": "ACCOUNT_DELETED"
}
```

### 3.3 Offline Replay / UPSERT Guard
User profile syncs use `INSERT INTO users ... ON CONFLICT(id) DO UPDATE`. To prevent delayed profile syncs or auth handshakes from clearing the tombstone, the conflict clause contains a strict conditional guard:
```sql
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  updated_at = excluded.updated_at
WHERE users.deleted_at IS NULL
```
If `users.deleted_at IS NOT NULL`, the update matches 0 rows and leaves `deleted_at` intact.

---

## 4. Client-Side Draft Clearing Policy

When a user initiates account deletion, client-side drafts are cleared via `clearLocalDrafts()` in `src/App.tsx`:
- **Purged Keys**: Any key matching `finpath.` (except `finpath.colorMode`) or `firecalc.` / `fire_calc_`.
- **Preserved Keys**: `finpath.colorMode` (theme preference is non-financial and preserved for UX continuity), plus all keys from other origins or libraries.
- **Shared Device Protection**: Explicit key scoping ensures that if multiple users or apps share local storage, only the financial application drafts are wiped.

---

## 5. Export Consistency Policy

The export endpoint (`/api/account-data/export`) provides data portability:
1. **Consistency Guarantee**: Reads `users`, `accounts`, `transactions`, `goals`, `plans`, and `calculator_results` in a single snapshot read.
2. **Post-Deletion Guard**: If called on a tombstoned user, it fails closed with **HTTP 410 Gone** rather than returning empty arrays or partial data.
3. **Format**: Returns structured JSON with schema version and generation timestamp.

---

## 6. Disaster Recovery & Tombstone Replay Runbook

### 6.1 The Resurrection Vulnerability
When disaster recovery restores a database snapshot taken at time $T_{snapshot} < T_{deletion}$, all deleted accounts and child rows are restored to their active state at $T_{snapshot}$.

### 6.2 The Replay Protocol (`replayTombstones`)
FinPath95 includes `replayTombstones(database, tombstones)` in `functions/_lib/accountData.ts`. It takes a list of tombstoned user records `{ userId, deletedAt, updatedAt }` and idempotently:
1. Purges all 14 child tables for each tombstoned user.
2. Re-applies the `deleted_at` tombstone in `users`.

### 6.3 Disaster Recovery Step-by-Step Runbook
Before pointing live application traffic or Cloudflare Pages routes to a restored D1 database:

1. **Freeze Traffic**: Ensure the maintenance page is displayed or Cloudflare Pages route is paused.
2. **Extract Tombstones**: Retrieve the authoritative list of tombstoned accounts recorded up to the disaster event (from audit logs, replica logs, or offsite event streams):
   ```sql
   SELECT id, deleted_at, updated_at FROM users WHERE deleted_at IS NOT NULL;
   ```
3. **Perform Snapshot Restore**: Complete the Cloudflare D1 point-in-time restore to the designated database instance.
4. **Execute Tombstone Replay**:
   Run the reconciliation script executing `replayTombstones(db, tombstoneList)`.
5. **Verify Zero Rows**:
   Query child table counts for all tombstoned IDs:
   ```sql
   SELECT (SELECT count(*) FROM accounts WHERE user_id = ?) +
          (SELECT count(*) FROM transactions WHERE user_id = ?) +
          (SELECT count(*) FROM goals WHERE user_id = ?) AS remaining_rows;
   ```
   Assert `remaining_rows == 0` and `deleted_at IS NOT NULL`.
6. **Resume Live Serving**: Re-enable live DNS / routing to the database.

---

## 7. Policy & Statutory Retention Isolation

Certain jurisdictions and regulatory frameworks require retaining specific records (e.g. tax records, transaction history for AML/KYC) for 5–7 years, which conflicts with immediate GDPR/CCPA erasure requests.
- **Current Technical Implementation**: The application implements hard-deletion of all financial rows in D1 and durable tombstones.
- **Legal Sign-Off Boundary**: Any long-term legal retention policy or selective archive mechanism is quarantined pending owner/legal counsel approval. No unreviewed background archiving or undeclared retention is implemented.
