# C09 final-candidate independent review — 2026-09-25

Decision: **B10 APPROVED; B11 and B28 CHANGES_REQUESTED. C10 remains locked.**

Reviewed product code: `5dda3d2be24246e3470a65e7653a0b6e425cbece` on PR [#140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140), base `codex/dependency-security-refresh`. Immutable preview: `https://51acbf88.interactive-fire-calculator.pages.dev`, deployment `51acbf88-db0a-47d1-b399-814dad835a9b`, isolated D1 `finpath-preview` (`0dbad68e-7493-452f-8504-98d4c61ee5da`). The evidence harness changed after the product commit; these changes do not alter deployed product code.

## Independent checks

- Inspected the current C09 runner, evaluator, product review action, validation matrix, and focused screenshots. The fresh hosted `report.json` targets the exact candidate/deployment and its evaluator reports no failed flags. Ran its 26 evaluator tests locally: 26 passed.
- Rechecked the current deployment identity and both synthetic-user cleanups through read-only Cloudflare D1 and Clerk calls. Each user has zero rows in all 15 scoped tables, a non-null tombstone, and Clerk GET 404. No new hosted writes were made by the reviewer.
- Earlier exact-code CI was green and the previously accepted B35 candidate passed all 84 public-route smoke checks. The primary reviewer also ran `./scripts/test_all.sh` again before publishing this evidence: 14 runner tests, 5 preview-auth tests, 79 Python tests plus 21 subtests, 55 Vitest files/1,685 tests, typecheck, production build, and fixture-isolation verification passed. No production or main-branch change is authorized by this review.

| Task | Decision | Evidence and remaining requirement |
|---|---|---|
| B10 | **APPROVED** | The fresh hosted run records version 1/2 creation, exact version 1 restore after reload, observed dirty-navigation modal/cancel/confirm, controlled missing targets, tenant denial, and unchanged historical rows. Collector code checks actual page state; prior false-success paths for the modal are removed. |
| B11 | **CHANGES_REQUESTED** | Keep/defer, date, reload, export, idempotent retry, tenant denial and cleanup have hosted evidence. The purported revise proof at `evidence/C09/run_c09_proofs.mjs` posts `decision: revise` directly and marks `review_revise_choice_triggers_revision` true from HTTP 200/201 plus returned decision. It never selects the UI choice, edits inputs, saves Version 3, or verifies older versions remain unchanged. The validation matrix's B11-11 PASS statement is unsupported. |
| B28 | **CHANGES_REQUESTED** | Dashboard/goals status, dated labels, 320px card, theme contrast and actual keyboard menu action have current evidence. The focused real screenshot `screenshots/04_b11_review_completed_panel_focused.png` shows the sticky top bar covering the “Monthly plan review” heading and badge when the panel is brought into view. This fails the nondeferred no-overlap visual gate. Prove and fix the actual scroll/focus behavior without hiding the defect through screenshot cropping. |

## Visual judgment and limits

The focused dashboard, goals and mobile cards have a readable hierarchy and text labels. The review panel is otherwise readable but its heading is visibly occluded by navigation in the submitted screenshot. Native 200% zoom and actual screen-reader checks remain deferred by the owner to B31/C11; this review does not claim full WCAG conformance. Previous light/dark contrast measurements remain evidence for their sampled elements, not a blanket conformance claim.

## Closure

B10 is closed on product code `5dda3d2be24246e3470a65e7653a0b6e425cbece`. B11 and B28 remain blocked pending the two focused corrections and fresh final-candidate proof. C09 remains released for rework; C10 stays locked. The prior absence of a visible authorization record for already-applied preview migrations 0007/0008 is retained as a governance provenance gap; no migration was reapplied in this review. Do not infer future migration authorization. Follow `docs/execution/C09_FINAL_REWORK_PROMPT.md`. No main merge or production deployment.
