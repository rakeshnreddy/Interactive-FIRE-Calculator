# C08 Validation Matrix (B26 & B27)

Candidate code commit: `a95053b19108634656aef491e46b9be9fe3ea57d`  
Branch: `codex/finpath-quality-execution` (PR #140)  
CI URL: https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/35180566369 (SUCCESS)  
Immutable Preview Deployment: `f737cfbb-0d0f-4ffc-9a43-5e3cda77d31a`  
Preview URL: https://f737cfbb.interactive-fire-calculator.pages.dev  
Effective Isolated D1: `0dbad68e-7493-452f-8504-98d4c61ee5da` (`finpath-preview`)  

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| C08-01 | Native date input width in `.balance-form` and `.transaction-update-form` | PASS | Bounding width measured at 190px (minmax 172–190px in CSS); calendar icon does not crowd date text at desktop, tablet, or mobile. [Report](report.json), screenshots `accounts-1280-light.png`, `transactions-1280-light.png`. |
| C08-02 | Exact cents display for accounts, balances, history, and transactions | PASS | Stored cents formatted as `$12,345.67` and `$2,500.00` in account cards, balance history, and ledger rows instead of rounded whole dollars. Verified in unit tests `accountPresentation.test.tsx`, `transactionPresentation.test.tsx`, and hosted preview DOM. [Report](report.json). |
| C08-03 | Simplified profile identity display | PASS | Duplicate `<small>` email line suppressed when `displayName === email`. Tested with unit tests and verified 0 duplicate email occurrences in hosted browser. [Report](report.json). |
| C08-04 | User-facing status copy | PASS | Replaced internal routing text with "Accounts and balances are active." (`/accounts`) and "Dashboard overview is active." (`/dashboard`). Verified in unit tests and hosted DOM. [Report](report.json). |
| C08-05 | Stale balance detection rule (>30 days) and as-of context | PASS | Documented UTC calendar-day difference rule (`> 30` days = stale); renders `.account-stale-badge` (`Update due`) for accounts updated > 30 days ago (e.g. `2026-06-01`); fresh accounts display `As of 2026-09-01` without warning badge. Verified in unit tests and hosted run. [Report](report.json). |
| C08-06 | Currency separation without cross-currency addition | PASS | Net worth and balances displayed per currency; summary metrics return 'Unavailable' for mixed currencies without false addition. Preserved B03 contracts in `accountUiFixtures.test.tsx`. |
| C08-07 | Long label and merchant wrapping | PASS | `overflow-wrap: anywhere` in `.transaction-row-copy > strong` and responsive card layout ensures long merchant strings (e.g. 150+ chars) do not push amounts or actions off screen. Verified in unit tests and multi-viewport screenshots. |
| C08-08 | Transaction ledger layout & signed amounts | PASS | Aligns date, description, category, and signed amount with explicit currency context (`-$123.45` expense, `+$4,500.00` income, `$1,000.00` transfer). Multi-currency accounts format with respective currency symbols (USD/INR). [Report](report.json). |
| C08-09 | CSV import file selection does NOT auto-commit | PASS | Real browser file selection via `input.setInputFiles` triggers preview (HTTP 200) without modifying database; D1 query verified exactly 0 transaction rows before explicit confirmation. [Report](report.json). |
| C08-10 | CSV import preview with actionable row errors | PASS | Preview summary strip displays Total: 3, Ready: 2, Rejected: 1; row 4 shows actionable error "Amount must be a positive amount with at most two decimals.". Screenshot `transaction-import-preview.png`. [Report](report.json). |
| C08-11 | Explicit import commit and persisted ledger | PASS | Clicking "Import 2 transactions" issues HTTP 201 commit; reload shows persisted rows in ledger; D1 `account_balances` count remains unchanged at 2 (no balance mutation). [Report](report.json). |
| C08-12 | Duplicate CSV re-import detection | PASS | Re-selecting identical CSV generates preview with Ready: 0, Duplicates: 2, Rejected: 1; duplicate rows marked with Duplicate badge; persisted D1 transaction count remains unchanged at 2. Screenshot `transaction-import-duplicate.png`. [Report](report.json). |
| C08-13 | Multi-viewport responsive rendering | PASS | Captured actual browser screenshots across 1280px, 768px, 390px, 320px in light and dark modes (22 PNGs in `screenshots/`). Contained table scrolling on mobile, no layout breakage. |
| C08-14 | Fail-closed cleanup | PASS | Verified `/api/account-data` DELETE purged application data; verified 0 rows across all 14 D1 user tables; verified user tombstone present in `users` table; deleted Clerk test user; verified Clerk user 404 absence. [Cleanup](cleanup.json). |
| C08-15 | Full test suite regression baseline | PASS | `./scripts/test_all.sh` exit code 0: 14 Node test runner checks, 5 preview auth build tests, 79 Python unit tests + 21 subtests, TypeScript clean (`tsc --noEmit`), 1624 Vitest tests across 49 files, production build clean with 0 fixture leaks. |
| C08-16 | CI green on exact submitted code SHA | PASS | GitHub Actions run `35180566369` completed with status `success` on commit `a95053b19108634656aef491e46b9be9fe3ea57d`. |
| C08-17 | Public route smoke | PASS | `npm run smoke:calculators -- https://f737cfbb.interactive-fire-calculator.pages.dev` verified 84 public routes without authentication. |

## Cleanup Proof

The automated hosted verification harness executed fail-closed cleanup:
1. Application data deletion: `/api/account-data` DELETE returned HTTP 200.
2. D1 table counts: Scoped queries across all 14 user tables (`user_profiles`, `financial_accounts`, `account_balances`, `transactions`, `goals`, `plans`, `plan_versions`, `fire_plan_inputs`, `fire_plan_results`, `assumptions`, `balance_imports`, `transaction_imports`, `saved_calculator_results`, `audit_log`) verified exactly 0 rows.
3. User tombstone: Query `SELECT id, deleted_at FROM users WHERE id = ?;` verified non-null `deleted_at` timestamp.
4. Provider cleanup: Clerk test user `user_3JRK4ZhoWzgu0AkRpnecImjZxH4` was deleted via Clerk Backend API; subsequent lookup confirmed 404 absence.
