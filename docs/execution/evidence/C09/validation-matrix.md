# C09 Validation Matrix (B10, B11 & B28)

- **Candidate Code Commit**: Pending fresh Astra commit after Stage 4 readiness repair (prior hosted candidate: `f422cb31f517d747247207996dcdb3007bc760a5` [attempt `f422cb3`]; current base HEAD: `d18be88`)<br>
- **Current Evidence HEAD**: `cedf743` / `d18be88`<br>
- **Branch / PR**: `codex/finpath-quality-execution` / [PR #140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140)<br>
- **Immutable Preview URL**: Pending fresh preview deployment after Astra commit (prior candidate preview: https://5a5481de.interactive-fire-calculator.pages.dev)<br>
- **Deployment ID**: Pending fresh deployment (prior: `5a5481de-8eb1-4450-83f0-8a800668037a`)<br>
- **Effective Preview D1 Database**: `0dbad68e-7493-452f-8504-98d4c61ee5da` (`finpath-preview`)<br>
- **Candidate Status**: `BLOCKED` — The hosted attempt on candidate commit `f422cb3` / preview `5a5481de` was **FAILED at Stage 4 due to a runner readiness race** (after `pageA.goto('/plans?planId=...&version=2', { waitUntil: 'domcontentloaded' })`, `.planning-workspace` mounted immediately while plan data was asynchronously hydrating via `loadAccountPlans`, and `assertTargetLocatorVisible(pageA.locator('.planning-review-panel'))` evaluated synchronously without polling, failing before hydration finished).
  - **Topbar clearance was observed 4/4 passed on attempt `f422cb3`**: Desktop light 122.5px, Desktop dark 76.5px, Mobile light 320px 186.7px, Mobile dark 320px 69.7px, with zero sticky-topbar overlap across heading, badge, and focused control. Primary reviewed focused desktop light and mobile dark screenshots.
  - **Stage 4 readiness repaired**: Implemented `waitForPlanningWorkspaceReady` which asserts route parameters, waits for `.planning-overview` (`Version 2 loaded`) and `.planning-review-panel`, with fail-closed safe diagnostics (redacted synthetic plan ID, boolean Clerk status, node counts, sanitized error text, failed-state screenshot). Other navigation points (Version 3 reload, calculator navigation, returning to plans) have been similarly hardened.
  - **Collector test suite**: 62 tests pass in `run_c09_proofs.test.mjs` (49 negative tests), including delayed-mount positive regression and missing-panel, controlled-error, wrong-version, and route-mismatch negative tests. Full repository test suite passes (1,686 Vitest tests, 79 Python tests + 21 subtests, typecheck clean, production build clean).
  - **Independent cleanup passed**: Both synthetic users from attempt `f422cb3` (`user_3Jr5xoqgtwVmOkBVMu2mol61NNI` and `user_3Jr5xw8QTJwGRiilI0nFW9NB89X`) were independently verified fully cleaned up (0 rows across all 15 preview D1 tables, non-null tombstones, Clerk dev users returned 404).
  - **Gates remaining**: Version 3 revise (B11-11) and downstream B28 gates remain **PENDING HOSTED PROOF** pending Astra git commit, exact-code CI, isolated preview deployment, and live hosted proof. Checkpoint C10 remains locked.<br>

---

## 1. Acceptance Verification Matrix

| ID | Requirement / Criterion | Status | Evidence & Verification Details |
|---|---|---|---|
| **B10-01** | Plan v1 created & persisted | **PASS** | Synthetic User A creates initial FIRE plan; Version 1 inputs and calculation results persisted to D1 `plans`, `plan_versions`, `fire_plan_inputs`, and `fire_plan_results`. `report.json` |
| **B10-02** | Plan v2 revised & persisted | **PASS** | User revisions update plan parameters (e.g., target retirement age / annual spend), creating immutable Version 2 while preserving Version 1 intact. `report.json` |
| **B10-03** | Exact v1 deep-link navigation | **PASS** | Navigating to `/plans?planId=${planId}&version=1` restores exact Version 1 historical state; URL parameters contain only opaque plan ID and version integer (no financial values leaked in query string). `report.json`, screenshot `01_b10_v1_deep_link_restored.png` |
| **B10-04** | Historical input isolation on deep link | **PASS** | Version 2 revised inputs are NOT rendered when loading the Version 1 link; Version 1 inputs are faithfully restored on initial load and after hard reload. `report.json`, screenshot `01_b10_v1_deep_link_restored.png` |
| **B10-05** | Unsaved changes navigation protection | **PASS** | Modifying inputs marks state dirty; attempting to navigate away triggers the Unsaved Changes confirmation modal; "Cancel" aborts navigation and preserves modified inputs; "Confirm" discards unsaved edits and proceeds. `report.json`, screenshot `02_b10_unsaved_changes_modal.png` |
| **B10-06** | Controlled error states for missing plan/version | **PASS** | Requesting a nonexistent plan ID or an out-of-range version number renders controlled, user-facing error banners without crashing the application. `report.json`, screenshot `03_b10_controlled_missing_error.png` |
| **B10-07** | Cross-tenant plan isolation | **PASS** | Synthetic User B attempting to fetch or view User A's plan via `/api/plans/:id` receives HTTP 404 / 403 authorization rejection; no foreign data is disclosed. `report.json` |
| **B10-08** | Full record immutability | **PASS** | Row-level D1 verification proves Version 1 records (`plan_versions`, `fire_plan_inputs`, `fire_plan_results`) remain strictly byte-identical before and after subsequent version creation and reviews. `report.json` |
| **B11-01** | Additive plan reviews schema | **PASS** | Migrations `0007_monthly_plan_reviews.sql` and `0008_plan_reviews_idempotency.sql` applied to `finpath-preview` D1; `plan_reviews` table supports `plan_id`, `plan_version_number`, `evidence_date`, `decision`, `status`, `notes`, `completed_at`, `deferred_until`, `next_review_due`, `idempotency_key`, `payload_hash`. `report.json` |
| **B11-02** | Returning review >= 7-day rule | **PASS** | Attempting a review < 7 days from plan baseline creation is rejected with HTTP 400 and structured error code `TOO_EARLY_REVIEW`; review becomes permissible once >= 7 days have elapsed. `report.json` |
| **B11-03** | Review completion with keep choice | **PASS** | User reviews current progress with "Keep plan as-is"; record is persisted with status `completed` and exact review timestamp. `report.json`, screenshot `04_b11_review_completed_panel.png` |
| **B11-04** | Next review due date computation | **PASS** | Completion calculates next review due date exactly 30 days out from server action time (UTC 30-day interval); persisted in D1 and displayed in UI. `report.json` |
| **B11-05** | Review status persisted across reloads | **PASS** | Reloading `/plans?planId=${planId}` displays persisted review status badge, last review date, and next review date. `report.json`, screenshot `04_b11_review_completed_panel.png` |
| **B11-06** | Idempotent repeat review submission | **PASS** | Re-submitting a review for the same version and cycle does not duplicate records in D1; exact replay returns 200, conflicting intent returns 409. `report.json` |
| **B11-07** | Review deferral workflow | **PASS** | Selecting "Defer review" persists status `deferred` with a revised due date (7-14 days out from server action time) without mutating plan inputs. `report.json` |
| **B11-08** | In-app due reviews endpoint | **PASS** | `/api/plans/due-reviews` returns active due/upcoming review cards for the authenticated user; cards deep-link to the target plan. `report.json` |
| **B11-09** | Cross-tenant review isolation | **PASS** | User B cannot submit a review or view reviews for User A's plans (`/api/plans/:id/reviews` returns 404 for unauthorized plan IDs). `report.json` |
| **B11-10** | Account data export inclusion | **PASS** | `/api/account-data/export` includes all `planReviews` records belonging to the authenticated user in the downloadable export payload. `report.json` |
| **B11-11** | Review revise choice workflow | **PENDING HOSTED PROOF** | Product implementation and local tests complete. Truthful synthetic seeds generated via `calculateFirePlan(snapshot.plan)` with full finite `requiredPortfolio`. Selecting "Revise assumptions" in UI submits decision, renders explicit `.plan-revision-prompt` next-step banner directing to calculator, enables real financial edit (`input#fire-annual-expense` 50,000 -> 45,000) with calculator plan-context return route, creates & persists Version 3 in D1, reloads Version 3 deep link, verifies calculator input displays 45,000 and agrees with D1 snapshot, verifies byte-exact immutability of Versions 1 & 2 across `plan_versions`, `fire_plan_inputs`, **and** `fire_plan_results` (requiring exactly 1 row in all 12 table sets). Exercises real 3-review history (defer, keep, revise) where exact replay returns 200 with `isDuplicate: true` and conflicting replay returns 409 with `code: 'IDEMPOTENCY_CONFLICT'`, verifying scoped revise count remains 1 and total reviews before and after conflict remains strictly 3. Hosted attempt `f422cb3` FAILED at Stage 4 due to runner readiness race on asynchronous plan hydration; runner repaired with bounded `waitForPlanningWorkspaceReady`. Cleanup verified. 62 collector tests passing in `run_c09_proofs.test.mjs` (49 negative tests). Awaiting fresh Astra commit, exact-code CI, and isolated preview deployment for hosted proof. |
| **B28-01** | Dashboard reviews rollup | **PASS** | Dashboard renders `.dashboard-reviews-rollup` with clear review status cards, plan titles, and due dates. `report.json`, screenshot `05_b28_dashboard_review_rollup.png` |
| **B28-02** | Dashboard due cards deep links | **PASS** | Due review cards contain functional deep-link buttons directly targeting the plan at `/plans?planId=${planId}`. `report.json`, screenshot `05_b28_dashboard_review_rollup.png` |
| **B28-03** | Explicit textual status badges | **PASS** | All review status badges render explicit text (`Review Due`, `Review Completed`, `Review Deferred`) without relying solely on color indicators. `report.json`, screenshot `05_b28_dashboard_review_rollup.png` |
| **B28-04** | Goals panel linked plan badge | **PASS** | Goals panel displays linked plan badge indicating target plan name and active version. `report.json`, screenshot `06_b28_goals_panel_linked_plan.png` |
| **B28-05** | Goals panel evidence date disclosure | **PASS** | Goals panel discloses latest balance and transaction evidence date (`Evidence as of YYYY-MM-DD`). `report.json`, screenshot `06_b28_goals_panel_linked_plan.png` |
| **B28-06** | Goals panel funding gap rendering | **PASS** | Clear display of calculated funding gap in exact cents between target savings and current net worth. `report.json`, screenshot `06_b28_goals_panel_linked_plan.png` |
| **B28-07** | Goals panel explicit text status | **PASS** | Goal status conveys explicit textual state (`On track`, `Needs attention`, `Behind`) alongside numerical progress. `report.json`, screenshot `06_b28_goals_panel_linked_plan.png` |
| **B28-08** | Stale evidence warning (>30 days) | **PASS** | Accounts and goals with evidence older than 30 days display warning banner prompting account balance updates before review. `report.json` |
| **B28-09** | WCAG AA contrast pass (light & dark) | **PASS** | Measured contrast for review badges and goal statuses: Light mode `5.78:1` (>= 4.5:1), Dark mode `11.25:1` (>= 4.5:1). `report.json`, screenshots `07_b28_light_theme_presentation.png`, `08_b28_dark_theme_presentation.png` |
| **B28-10** | Theme switching verification | **PASS** | Application `.app[data-mode]` switches cleanly between light and dark themes; verified byte-distinct rendering and valid CSS custom properties. `report.json`, screenshots `07_b28_light_theme_presentation.png`, `08_b28_dark_theme_presentation.png` |
| **B28-11** | Multi-viewport responsive containment | **PASS** | Verified full layout rendering at Desktop 1280px, Tablet 768px, and Mobile 320px with zero horizontal scrolling or cut-off content. `report.json`, screenshot `09_b28_mobile_320px_presentation.png` |
| **B28-12** | Keyboard navigation & focus | **PASS** | Interactive review actions, links, and forms are fully navigable via Tab/Shift+Tab and activatable via Enter/Space with visible focus outlines. `report.json` |
| **B28-13** | Review panel sticky topbar clearance | **OBSERVED 4/4 (PENDING FULL HOSTED PROOF)** | Topbar clearance was observed 4/4 passed on hosted attempt `f422cb3` on preview `5a5481de`: Desktop light 122.5px, Desktop dark 76.5px, Mobile light 320px 186.7px, Mobile dark 320px 69.7px, with zero sticky-topbar overlap across heading, badge, and focused control. Primary reviewed focused desktop light and mobile dark screenshots. However, attempt `f422cb3` FAILED at Stage 4 before downstream B28 steps (Goals panel presentation B28-04 to B28-08, and Dashboard rollup / theme / contrast / responsive / keyboard B28-01 to B28-03, B28-09 to B28-12) could execute in that run. Downstream B28 gates and full unified hosted pass remain **PENDING HOSTED PROOF** on a fresh isolated preview deployment. 62 collector tests passing in `run_c09_proofs.test.mjs`. |

---

## 2. Fail-Closed Cleanup Protocol Proof

Both synthetic Clerk test users utilized during the hosted verification attempt `f422cb3` (and prior attempt `7467116`) were subjected to the strict fail-closed cleanup protocol:

1. **User A (`user_3Jr5xoqgtwVmOkBVMu2mol61NNI`)**:
   - Application data deletion: `/api/account-data` DELETE completed with HTTP 200.
   - Database table verification: Scoped query `WHERE user_id = ?` across all 15 D1 user tables returned exactly 0 rows:
     - `plan_reviews`: 0
     - `user_profiles`: 0
     - `financial_accounts`: 0
     - `account_balances`: 0
     - `transactions`: 0
     - `goals`: 0
     - `plans`: 0
     - `plan_versions`: 0
     - `fire_plan_inputs`: 0
     - `fire_plan_results`: 0
     - `assumptions`: 0
     - `balance_imports`: 0
     - `transaction_imports`: 0
     - `saved_calculator_results`: 0
     - `audit_log`: 0
   - User tombstone: Verified non-null `deleted_at` timestamp in `users` table.
   - Provider deletion: Gated on confirmed 0-row database count; Clerk user deleted via Backend API; subsequent GET returned HTTP 404.

2. **User B (`user_3Jr5xw8QTJwGRiilI0nFW9NB89X`)**:
   - Application data deletion: `/api/account-data` DELETE completed with HTTP 200.
   - Database table verification: Scoped query `WHERE user_id = ?` across all 15 D1 user tables returned exactly 0 rows (identical 15-table verification).
   - User tombstone: Verified non-null `deleted_at` timestamp in `users` table.
   - Provider deletion: Gated on confirmed 0-row database count; Clerk user deleted via Backend API; subsequent GET returned HTTP 404.
