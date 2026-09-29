> Primary reviewer note: advisory worker findings, NOT acceptance. Primary independently confirmed the keyboard-action proof gap. R2–R6 PASS labels remain worker assessments awaiting primary review. Missing historical authorization is a record-reconciliation issue, not a request for retroactive approval or permission to reapply migrations. No hosted writes or migration runs are authorized by this report.

# C09 Verification & Independent Evidence Report

- **Date**: 2026-09-24
- **Evaluator**: Gemini Implementation / Verification Worker (Advisory Report)
- **Candidate Evaluated**: `0fe20e8e55c49808c998ac751e149da65c7eb3d5` (Predecessor: `1de39ea`)
- **HEAD Inspected**: `6d0603efae569aecdb5b73c94db54471f85f3734`
- **Isolation Target**: Preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da` / Deployment `3b006fb1-72a6-4a1f-8499-05f9e082bba6`
- **Scope**: Advisory review of prior findings R1–R6 across B10, B11, B28. Financial formulas untouched. No Git mutations, remote database writes, synthetic user creations, or secret reads.

---

## 1. Finding-by-Finding Assessment (R1–R6)

### R1 — Submitted PASS vs Executable Proof (Harness Integrity)
- **Status**: FAIL (Partial Correction / Unresolved Proof Gap)
- **Source References**: `docs/execution/evidence/C09/run_c09_proofs.mjs:844–860, 1134–1153, 1164–1215, 1253–1278`; `docs/execution/evidence/C09/run_c09_proofs.test.mjs:191–340`.
- **What Was Corrected**:
  - Removed `|| true` boolean short-circuits on `modalVisible`, `staleWarningVisible`, and related assertions.
  - Implemented real WCAG 2.1 contrast calculation with composited ancestor background blending and strict 4.5:1 ratio threshold (`run_c09_proofs.mjs:1169–1215`).
  - Added 11 negative test cases in `run_c09_proofs.test.mjs` verifying that missing modals, discarded drafts, unexecuted revise actions, absent stale warnings, and $<4.5:1$ contrast fail closed.
- **Remaining Defect & Evidence**:
  - **Keyboard Action Gap**: In `run_c09_proofs.mjs:1257–1278`, keyboard verification issues 10 `Tab` key presses and asserts only that $\ge 3$ interactive elements receive focus with a visible ring (`focusedCount >= 3 && hasFocusRing`). It does **not** dispatch `Enter` or `Space` to execute intended actions (e.g. submitting a review, confirming modal navigation, or expanding details). Keyboard evidence proves focus traversal, not functional action execution.
  - **Unexecuted Hosted Writes**: `run_c09_proofs.mjs` was NOT run locally in this pass, preserving strict write safety.
- **Existing Test Proving Behavior**: `docs/execution/evidence/C09/run_c09_proofs.test.mjs` unit tests 8–18 validate evaluator failure paths.
- **Minimal Correction Contract**: Modify `run_c09_proofs.mjs` keyboard step to focus the review action button, dispatch `Enter`, and assert state mutation rather than element counting.

---

### R2 — Uniqueness & Atomic Conflicting Idempotency
- **Status**: PASS
- **Source References**: `migrations/0008_plan_reviews_idempotency.sql:6–21`; `functions/_lib/planReviews.ts:122–161, 184–231`; `functions/api/plans/[id]/reviews/index.ts:67–69`; `src/lib/planReviews.ts:38–45, 347–365`.
- **What Was Corrected**:
  - Additive migration `0008_plan_reviews_idempotency.sql` added `idempotency_key` and `payload_hash` to `plan_reviews`, backfilled historical rows (`idempotency_key = id`), dropped non-unique index `idx_plan_reviews_idempotency`, and created unique index `idx_plan_reviews_user_plan_idempotency ON plan_reviews(user_id, plan_id, idempotency_key)`.
  - In `functions/_lib/planReviews.ts`, requests compute SHA-256 `payloadHash` of decision intent.
  - Exact replay (matching key + matching hash) returns HTTP 200 with `isDuplicate: true` and existing review.
  - Conflicting repeat (matching key + different hash) throws `ReviewIdempotencyConflictError` and returns HTTP 409 `IDEMPOTENCY_CONFLICT` with existing review record.
  - Concurrent race condition during `INSERT` catches `isUniqueConstraintError` and re-routes to the atomic replay/conflict evaluator.
- **Existing Test Proving Behavior**: `src/c09ReworkRegressions.test.ts` (lines 40–100) tests atomic duplicate rejection, exact replay returning identical review, and conflicting payload returning 409.

---

### R3 — Date Validity, Future Rejection, and Server Scheduling
- **Status**: PASS
- **Source References**: `src/lib/planReviews.ts:213–224, 246–256`; `functions/_lib/planReviews.ts:163–183`.
- **What Was Corrected**:
  - `isValidIsoDate()` enforces strict `YYYY-MM-DD` UTC round-trip validation, rejecting invalid dates (e.g. `2026-02-30`).
  - Future evidence dates (`evidenceUtc > todayUtc`) are rejected with HTTP 400 `FUTURE_EVIDENCE_DATE`.
  - Next review scheduling derives strictly from trusted server time (`nowUtc`), scheduling keep/revise +30 days (`status: 'completed'`) and deferral +`deferDays` (`status: 'deferred'`).
  - Next due date is decoupled from client `evidenceDate`, eliminating suppression until 2099 or immediate overdue states on old evidence.
- **Existing Test Proving Behavior**: `src/c09ReworkRegressions.test.ts` (lines 105–180) verifies rejection of `2026-02-30`, rejection of future dates, and server-time calculation of `nextReviewDue`.

---

### R4 — Navigation Guard Surfaces & Explicit Version Routing
- **Status**: PASS
- **Source References**: `src/lib/navigation.ts:174–192`; `src/App.tsx:5621–5636, 5782–5815, 7422–7454, 8626–8659`.
- **What Was Corrected**:
  - `parsePlanDeepLink` explicitly tags malformed explicit versions (`isVersionInvalid: true`) instead of coercing them to null.
  - `loadPlanDeepLinkTarget` halts on `isVersionInvalid` and displays controlled error `Saved decision unavailable: Invalid version parameter specified in link.` without silently substituting the latest plan.
  - `isPlanningWorkspaceDirty` is reported to `App.tsx` via `onDirtyStateChange`.
  - Dirty state intercepts topbar navigation, brand link, and browser history popstate (`window.addEventListener('popstate')`), prompting with an accessible modal dialog (`role="dialog"`).
  - "Keep editing" aborts navigation and preserves dirty form inputs; "Discard and leave" proceeds to target.
- **Existing Test Proving Behavior**: `src/savedDecisionDeepLink.test.ts` and `src/c09ReworkRegressions.test.ts` (lines 185–260) verify invalid version rejection, dirty state detection, and modal cancel/confirm preservation.

---

### R5 — Persisted Dashboard Due State
- **Status**: PASS
- **Source References**: `src/App.tsx:3175–3260, 3333–3395, 5587–5619, 5856, 7654`; `src/lib/planReviews.ts:73–89`.
- **What Was Corrected**:
  - Eliminated `(plan as any).dueStatus` fallback dependency.
  - `App.tsx` fetches persisted review statuses directly from `GET /api/plans/due-reviews` via `loadDuePlanReviews` into typed `dueReviews` state.
  - Dashboard renders an explicit loading indicator ("Checking review cadence..."), an error state with a "Retry" button, and due/overdue cards.
  - Review completion or deferral in `PlanningWorkspace` immediately triggers `refreshDueReviews()` via `onReviewSaved`, updating the dashboard without requiring manual reload or plan date mutation.
- **Existing Test Proving Behavior**: `src/monthlyReviewPresentation.test.tsx` and `src/c09ReworkRegressions.test.ts` (lines 265–315) prove dashboard consumption of `/api/plans/due-reviews` and reactive due-state refresh.

---

### R6 — Evidence Freshness & Metadata Provenance
- **Status**: PASS
- **Source References**: `src/PlanningWorkspace.tsx:188–204`; `src/App.tsx:4374–4386`.
- **What Was Corrected**:
  - `PlanningWorkspace.tsx` derives `effectiveEvidenceDate` from active accounts' `latestBalanceDate`, falling back to immutable snapshot `createdAt` when unlinked.
  - `GoalsPanel` in `App.tsx` explicitly labels dates as `Goal updated: ${goal.updatedAt.slice(0, 10)}` and displays `Goal inactive (${goalEvidenceAgeDays} days old)` when $> 30$ days old.
  - Updating goal metadata (name, notes, target date) does not alter or misrepresent financial account balance evidence freshness.
- **Existing Test Proving Behavior**: `src/c09ReworkRegressions.test.ts` (lines 320–365) confirms that goal metadata updates do not refresh account evidence dates.

---

## 2. Remote Migration Authorization Audit

- **Audit Result**: UNRESOLVED
- **Evidence from Committed Docs**:
  - Audited `docs/execution/CHECKPOINTS.md`, `docs/execution/TASK_STATUS.json`, `docs/execution/reviews/C09.md`, `docs/execution/submissions/B11.md`, and `docs/execution/evidence/C09/migration-0008-note.md`.
  - In `CHECKPOINTS.md`:
    - Line 54: records authorization for migration 0005.
    - Line 88: records explicit owner authorization for Clerk setup and 2 synthetic users.
    - Line 98: explicitly mandates: "New remote migrations need exact-target owner authorization; local implementation/testing can proceed."
  - In `reviews/C09.md`: "This reviewing thread contains the request for authorization, but no owner approval reply... Locate owner authorization records for claimed 0007/0008 migrations; do not apply or reapply migrations during review."
  - **Verdict**: No committed owner authorization record exists for executing remote migrations 0007 or 0008 on preview D1. Per instructions, absent records are **unresolved** and cannot authorize remote migration.

---

## 3. Recommended Minimal Correction Contracts

1. **R1 Keyboard Proof Contract**:
   - In `docs/execution/evidence/C09/run_c09_proofs.mjs`, update Step 9 keyboard test: focus the review submission button or navigation discard button, execute `await pageA.keyboard.press('Enter')`, and verify the resulting DOM mutation/response rather than counting focused element outlines.
2. **Migration Authorization Contract**:
   - Obtain and record explicit owner authorization in `CHECKPOINTS.md` for applying `0007_monthly_plan_reviews.sql` and `0008_plan_reviews_idempotency.sql` to preview D1 before any subsequent hosted proof run.
