# C08 bounded rework — B26 and B27 remain open

Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator` on `codex/finpath-quality-execution`, PR140. Read reviews/C08.md, C08_START_PROMPT.md and current status first. Preserve the existing implementation. Do not restart C07 or redesign unrelated pages. Fix the following original-scope gaps in one consolidated submission. Primary alone closes tasks; C09 remains locked.

## R1 — make verification fail closed BEFORE another hosted run

In evidence/C08/run_c08_proofs.mjs, SUCCESS is assigned unconditionally even when required observations are false. The submitted report actually has dashboard_renders_accounts=false and status=SUCCESS. Cleanup does not change status, and provider deletion proceeds even when app deletion fails.

Extract an explicit evaluator listing each mandatory assertion and expected value. Missing, false, unknown, wrong status/count and cleanup errors must produce FAILED and nonzero exit. Do not recursively require every arbitrary boolean to be true: represent expected negative cases explicitly. Fix the dashboard selector to inspect the actual account list after loading (the first summary-grid element is not the account list). A selector error is not permission to drop dashboard verification. Capture method/path/status for actual operations; do not wait only for success statuses and lose failure information.

Add local negative tests FIRST: false dashboard, missing observation, wrong import count, failed app delete, provider-delete failure, provider still present, missing/non-numeric D1 count, tombstone absence, thrown verification/report-write failure. Each must fail overall. Provider deletion must be withheld until this user's application cleanup is verified; retain a private0600 manifest for recovery on failure. Close browser and preserve partial sanitized evidence in finally. Use scoped WHERE user_id=? counts, including pre/post-import checks; never require the entire shared preview DB to be empty. Unrelated data must remain untouched and must not invalidate scoped cleanup. Preserve historical tombstones.

The primary independently verified the previous submitted synthetic identity is already deleted and clean. Do not recreate or delete it. Use a fresh manifest identity for genuinely missing hosted checks. Read the proven C07 helper/test patterns rather than reintroducing their known failures.

## R2 — real theme and changed-control visual evidence

All10 submitted light/dark image pairs are byte-identical. emulateMedia(colorScheme) did not change the app's chosen theme. Use the real theme toggle or the app's persisted finpath.colorMode setting plus reload. Before each capture, assert actual root/theme state AND representative computed foreground/background colors; wait for React to settle. Capture both true themes, not renamed images. Do not merely assert unequal hashes (animation could differ without a theme change).

Existing screenshots use fullPage:false and the320px account image stops at the summary, above the edited account/date controls. Scroll to and capture the actual dashboard account rows, account balance/date/history controls, transaction rows/edit controls and import review/error/confirmation region. Use viewport screenshots at the relevant scroll positions or full-page plus focused crops. Record bounding-box containment, no whole-page horizontal overflow, readable native date text/calendar icon and reachable actions at1280/768/390/320. Inspect screenshots yourself and fix demonstrated normal-scale defects. No native200% zoom or actual-reader work: those remain deferred to B31/C11.

Measure the new stale badge's actual composited contrast in both themes; check its missing-date and old-date states. Exercise keyboard-only file selection/confirmation/filter/edit actions, visible focus and error association. Verify reduced-motion/transparency behavior on changed surfaces. Record actual results and evidence locations; absent checks are not PASS.

## R3 — complete missing user-journey checks, preserve existing successful paths

B26 submission claims hosted add/update/reload, but the harness creates accounts through page.evaluate(fetch POST) and never verifies an account update through the UI. Use the actual form to add or update a synthetic account/balance, reload and assert exact amount/date/currency/history. Derive fresh/stale dates relative to a declared reference date so September1 is not permanently labeled fresh. Verify dashboard really renders the expected account and dates after load.

B27: retain browser file selection → rejected-row review → explicit commit → reload and duplicate behavior. Compare full scoped account-balance records before/after transaction import, not only row count (an overwritten balance can keep the same count). Assert exact ledger rows/amounts/currencies after reload and no unintended commit on selection or retry.

Use existing B25 local fixtures for empty, mixed currency, negative net worth, stale/missing dates, long labels/merchant names, loading and fetch-error/retry; transaction empty search, duplicate, rejected rows, total failure and retry. Keep failure simulation strictly in local fixtures/tests; never mock hosted auth/security or claim simulated failure as a real provider outage. Existing meaningful tests/evidence may cover a case: cite and run the relevant test instead of duplicating it. CSS wrapping cannot be proved by server-rendered text inclusion alone. For each case record observable behavior, test/artifact, candidate and result. No new features beyond repairing demonstrated contract defects.

## R4 — truthful packet and exact revisions

The actual evidence HEAD submitted was97c1fe521e9692cde8399f8ae4232549942e56c6, not the full SHA quoted in chat. Obtain all identifiers from git/provider tools. Current product candidate a95053b19108634656aef491e46b9be9fe3ea57d has green CI35180566369 and preview f737cfbb; preserve that evidence where unchanged. Update both submissions, matrix and progress only from evaluated observations. Include stdout log/exit status and evaluator negative-test results. Do not describe viewport-only images as proving unseen controls or copied booleans as assertions.

Run focused tests, then ./scripts/test_all.sh before pushing executable changes. If only tooling/evidence changes, reuse the existing unchanged website candidate/preview and prove source equality. If product changes, publish one final code candidate after tests, require exact green CI, deploy isolated preview, verify binding0dbad68e-7493-452f-8504-98d4c61ee5da and run all public-route smoke checks plus affected B26/B27 journeys. Recheck BOTH tasks on that final candidate. Never production, main merge, paid services, DNS, migrations or formula changes.

Prefer one prepared hosted run after evaluator negative tests and local fixture checks pass. For a diagnosed failure, one focused repair/retry; if the same blocker recurs, retain evidence/cleanup manifest and report the exact cause rather than cycling frameworks or requesting previously granted scope again. Never print credentials or personal data. Existing free Clerk test configuration and owner authorization for scoped synthetic preview lifecycle remain valid.

Stop with both tasks ready_for_review only if every nondeferred requirement passes. Otherwise use blocked with the exact condition. Leave backlog unchecked and C09 locked. Handoff: candidate SHA, evidence SHA, CI, immutable preview/deployment/binding, test results, assertion matrix, relevant theme/control screenshots and scoped cleanup. Request primary C08 review. Do not mark done.
