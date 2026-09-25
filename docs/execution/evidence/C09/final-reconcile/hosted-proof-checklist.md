# Astra Single-Run Hosted Proof & Cleanup Checklist for C09

This checklist defines the exact single-run execution procedure for Astra to obtain authenticated hosted proof for Checkpoint C09 without printing secrets or mutating production infrastructure.

---

## 1. Environment & Target Verification (Pre-Flight)

- [ ] **Candidate SHA Verification**: Confirm worktree is at code candidate `5dda3d2be24246e3470a65e7653a0b6e425cbece` with evidence HEAD `18c1c862521de4e6132e1d3f22b2f158929f71eb`.
- [ ] **Isolated Preview Verification**: Confirm target preview is deployed and isolated:
  - Preview URL: `https://51acbf88.interactive-fire-calculator.pages.dev` (or predecessor `https://3b006fb1.interactive-fire-calculator.pages.dev`)
  - Deployment ID: `51acbf88-db0a-47d1-b399-814dad835a9b` (predecessor: `3b006fb1-72a6-4a1f-8499-05f9e082bba6`)
  - Target D1 Database: `0dbad68e-7493-452f-8504-98d4c61ee5da` (`finpath-preview`)
  - Production DB (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`) strictly untouched.
- [ ] **Migration Authorization Verification**:
  - Verify that user explicit authorization for applying `0007_monthly_plan_reviews.sql` and `0008_plan_reviews_idempotency.sql` to preview D1 is documented.
  - Read-back schema in preview D1 confirms table `plan_reviews` exists and index `idx_plan_reviews_user_plan_idempotency` is UNIQUE.

---

## 2. Keyboard Action Proof Hardening in Runner

- [ ] In `docs/execution/evidence/C09/run_c09_proofs.mjs`, verify the hardened keyboard proof:
  1. Navigates through interactive elements via `Tab` / `Shift+Tab`, verifying focus rings on interactive elements and deterministically focusing the Workspace navigation button (`button[aria-controls="desktop-workspace-navigation"]`).
  2. Dispatches `await pageA.keyboard.press('Enter')` to activate the control (no click substitution).
  3. Asserts resulting visible DOM open state (`aria-expanded="true"` and `#desktop-workspace-navigation` visible).
  4. Dispatches `await pageA.keyboard.press('Escape')` and asserts resulting visible DOM closed state (`aria-expanded="false"` and `#desktop-workspace-navigation` detached/hidden), proving deterministic keyboard action execution without mutating financial data.

---

## 3. Single Hosted Proof Execution

- [ ] Execute the runner in headless mode using private 0600 Clerk credentials (never printed to console or logs):
  ```bash
  node docs/execution/evidence/C09/run_c09_proofs.mjs
  ```
- [ ] Verify console output:
  - Step 1: Migration verification passes.
  - Step 2: User A creates Plan v1 and revises to Plan v2.
  - Step 3: Exact v1 deep-link restoration (`/plans?planId=${planId}&version=1`) loads historical inputs.
  - Step 4: Unsaved changes modal prompts on dirty edit navigation; Cancel preserves input; Discard loads destination.
  - Step 5: Controlled 404/unavailable banners appear for nonexistent plan and invalid version.
  - Step 6: Tenant B isolation blocks foreign plan access (HTTP 404).
  - Step 7: Monthly review lifecycle: Keep (+30d due date), Defer (+14d deferredUntil), Idempotent repeat (HTTP 200, no duplicate row), Revise choice.
  - Step 8: Dashboard rollup displays due cards with explicit badges; Goals panel displays evidence date and linked plan.
  - Step 9: Keyboard navigation & action activation succeeds; light and dark theme contrast >= 4.5:1; viewports 1280px, 768px, 320px pass with 0 overflow.

---

## 4. Fail-Closed Cleanup Verification

- [ ] Verify cleanup protocol completes for both synthetic users (`userA` and `userB`):
  1. `/api/account-data` DELETE returns HTTP 200 for each synthetic user.
  2. D1 query `WHERE user_id = ?` returns **0 rows across all 15 user tables**:
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
  3. `users` table contains non-null `deleted_at` tombstone for both users.
  4. Gated Clerk user deletion completes; subsequent Clerk API `getUser` returns HTTP 404.

---

## 5. Artifact Inspection & Acceptance Decision

- [ ] Inspect generated evidence files:
  - `docs/execution/evidence/C09/report.json`: verify exact evaluator result (`evaluateReport(report, cleanup).passed === true` with 0 failures) and all required boolean assertions across B10, B11, and B28 are true (`report.json` does not contain a `status` field on success; only an explicit failure records `status: "FAILED"`).
  - `docs/execution/evidence/C09/cleanup.json`: verify cleanup checks pass with all 15 table counts zero for both synthetic users (`userA` and `userB`), tombstones present, and Clerk accounts confirmed deleted.
  - Screenshots in `docs/execution/evidence/C09/screenshots/`:
    - `01_b10_v1_deep_link_restored.png`
    - `02_b10_unsaved_changes_modal.png`
    - `03_b10_controlled_missing_error.png`
    - `04_b11_review_completed_panel.png`
    - `05_b28_dashboard_review_rollup.png`
    - `06_b28_goals_panel_linked_plan.png`
    - `07_b28_light_theme_presentation.png`
    - `08_b28_dark_theme_presentation.png`
    - `09_b28_mobile_320px_presentation.png`
- [ ] Primary reviewer acceptance command / review closure:
  - Follow `MASTER_REVIEW_PROMPT.md` and `reviews/C09.md`.
  - Update `reviews/C09.md` with final decision.
  - If accepted, update `TASK_STATUS.json` (mark B10, B11, B28 done) and release C10.
