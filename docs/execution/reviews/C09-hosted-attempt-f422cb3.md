# C09 hosted attempt on f422cb3

Reviewer: primary reviewing session. Date: 2026-09-26.
Decision: BLOCKED for B11 and B28; C10 remains locked.
Candidate and exact-code CI: `f422cb31f517d747247207996dcdb3007bc760a5`, [GitHub Actions 36225833709](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36225833709) succeeded.
PR: [#140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140).
Immutable preview: <https://5a5481de.interactive-fire-calculator.pages.dev>, Cloudflare deployment `5a5481de-8eb1-4450-83f0-8a800668037a`. Primary verified this deployment is preview, serves the exact candidate SHA, succeeded, and is bound to isolated `finpath-preview` D1 `0dbad68e-7493-452f-8504-98d4c61ee5da` before the hosted write run.

## Independent checks

- Reviewed the five-file proof-runner/documentation diff; no website product code changed after candidate `7467116`. The corrected header badge locator and its real-Chrome positive/negative regressions address the prior strict-selector stop. The focused collector suite passed 57/57 tests. `./scripts/test_all.sh` passed locally, including 79 Python tests and 21 subtests, 1,686 Vitest tests, typecheck and build. `git diff --check` passed. Exact-code hosted CI passed.
- A fresh preview build and deployment passed build isolation. All 84 public calculator routes returned successfully on the new immutable preview.
- The instrumented hosted run authenticated two disposable Clerk users and passed B10's exact-version, dirty-navigation, controlled-missing, tenancy and immutability checks. It recorded DEFER and KEEP reviews, a persisted post-reload status, and an idempotent duplicate KEEP with only two total review rows.
- Actual review-panel clearance passed at desktop light (122.5px), desktop dark (76.5px), mobile light 320px (186.7px) and mobile dark 320px (69.7px), with no topbar overlap in the measured heading, badge or focused control. Primary inspected focused desktop light and mobile dark screenshots. These measurements establish only this narrow criterion, not the entire B28 task.
- The run stopped at Stage 4, immediately after navigation to `/plans?planId=<synthetic-plan>&version=2`: `.planning-workspace` appeared but `.planning-review-panel` was not yet visible when `assertTargetLocatorVisible` ran. Stage 3 had explicitly awaited the panel; Stage 4 only awaited the workspace shell. This is a likely collector readiness race, but a product rendering failure is not ruled out. No Version 3 or later B28 criteria were exercised; report status is correctly FAILED.
- Fail-closed cleanup completed for both disposable users. Primary independently queried all 15 scoped preview D1 tables (all zero), confirmed both tombstones, and confirmed both Clerk users return 404. No production data or services were modified.

Raw report, cleanup record, full run log and ten generated screenshots: [attempt-f422cb3](../evidence/C09/attempt-f422cb3/). The failed run did not replace previously tracked C09 evidence. No task was closed and no new checkpoint was released.

## Required next correction

Gemini must establish whether Version 2's panel appears after authenticated plan hydration. Replace the immediate Stage 4 panel assertion with a bounded wait for the *correct plan and exact Version 2* and the review panel. On timeout capture safe route/DOM/auth/error diagnostics so a genuine product defect is distinguishable from delayed rendering. Add a real-browser delayed-mount positive regression and a controlled-error/missing-panel negative. Preserve fail-closed cleanup and all prior passing observations. Do not turn missing controls into success, add arbitrary sleeps, or broaden the product scope without a reproduced defect. See [focused worker prompt](../C09_STAGE4_READINESS_PROMPT.md).

Native 200% zoom and actual screen-reader checks remain owner-deferred to B31/C11; no WCAG conformance claim is made. B11/B28 stay blocked, C10 locked, `main` unmerged, and production untouched. Current ledger: 27/35 tasks accepted (77.1% by task count).
